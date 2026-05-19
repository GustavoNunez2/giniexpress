import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

const PROVIDER_URL = 'https://catalogo.treinta.co/brajaexpress-e8aefd';
const DEFAULT_MARGIN = 15;

const { SUPABASE_URL, SUPABASE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error fatal: Faltan las variables de entorno de Supabase.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =========================================================================
// 🎯 MOTOR HÍBRIDO: ESCROLLEA, HACE CLIC EN BOTONES Y EXTRAE AL MISMO TIEMPO
// =========================================================================
async function scrollAndExtract(page) {
    console.log("⏳ Iniciando motor híbrido anti-virtualización...");

    return await page.evaluate(async () => {
        return await new Promise((resolve) => {
            let foundMap = new Map(); // Memoria acumulativa para que no se dupliquen al hacer scroll
            let lastHeight = document.documentElement.scrollHeight;
            let distance = 600;
            let noChangeCount = 0;

            let timer = setInterval(() => {
                // 1. EXTRAEMOS TODO LO QUE ESTÉ VIVO EN PANTALLA EN ESTE MOMENTO EXACTO
                const allImages = document.querySelectorAll('img');
                allImages.forEach(img => {
                    let cardContainer = img.parentElement;
                    let priceFound = null;
                    let textBlocks = [];

                    for (let i = 0; i < 6; i++) {
                        if (!cardContainer) break;

                        if (cardContainer.textContent && cardContainer.textContent.includes('$')) {
                            const match = cardContainer.textContent.match(/\$[\s\u00a0]*([0-9.]+)/);
                            if (match) priceFound = parseFloat(match[1].replace(/\./g, ''));
                        }

                        cardContainer.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div').forEach(textEl => {
                            const txt = textEl.textContent.trim();
                            if (txt && !txt.includes('$') && txt.length > 2 && txt.length < 140) {
                                if (!textBlocks.includes(txt)) textBlocks.push(txt);
                            }
                        });

                        if (priceFound && priceFound > 0 && textBlocks.length > 0) {
                            let titulo = textBlocks.find(t => t.toLowerCase().includes('ventilador') || t.length < 50);
                            if (!titulo) titulo = textBlocks[0];
                            titulo = titulo.replace(/[\*\'\´\"]/g, '').trim();

                            let descripcion = textBlocks.find(t => t.length > titulo.length && t !== titulo) || '';
                            if (descripcion.toLowerCase().includes('sin descripción') || descripcion.toLowerCase().includes('no descripción')) {
                                descripcion = '';
                            }

                            // Guardamos en el Map usando el título como llave única
                            const key = titulo.toLowerCase();
                            if (!foundMap.has(key)) {
                                foundMap.set(key, { titulo, precioCosto: priceFound, descripcion, imagen_url: img.src });
                            }
                            break;
                        }
                        cardContainer = cardContainer.parentElement;
                    }
                });

                // 2. BUSCAMOS Y PULSAMOS EL BOTÓN DE "CARGAR MÁS" SI EXISTE (Sugerencia IA)
                const keywords = ['ver más', 'cargar más', 'mostrar más', 'load more', 'ver mas', 'más productos'];
                const buttons = Array.from(document.querySelectorAll('button, div[role="button"], a'));
                const targetBtn = buttons.find(btn => keywords.some(kw => btn.textContent.toLowerCase().includes(kw)) && btn.offsetWidth > 0);
                if (targetBtn) {
                    targetBtn.scrollIntoView();
                    targetBtn.click();
                }

                // 3. BAJAMOS UN TRAMO MÁS
                window.scrollBy(0, distance);

                // 4. VERIFICAMOS SI LLEGAMOS AL FONDO REAL
                let currentHeight = document.documentElement.scrollHeight;
                if (currentHeight === lastHeight) {
                    noChangeCount++;
                    if (noChangeCount >= 5) { // Esperamos ~4 segundos sin cambios antes de rendirnos
                        clearInterval(timer);
                        resolve(Array.from(foundMap.values())); // Retornamos toda la memoria acumulada
                    }
                } else {
                    noChangeCount = 0;
                    lastHeight = currentHeight;
                }
            }, 800); // Ritmo de 800ms para dejar renderizar a la SPA

            setTimeout(() => { clearInterval(timer); resolve(Array.from(foundMap.values())); }, 120000); // Max 2 min
        });
    });
}

async function syncCatalog() {
    console.log(`[${new Date().toISOString()}] Arrancando escáner...`);
    let browser;
    try {
        // --- 🎯 SOLUCIÓN: PAGINACIÓN DE LECTURA SUPABASE ---
        let dbProducts = [];
        let rangeStart = 0;
        let rangeEnd = 999;
        let hasMore = true;

        console.log("📥 Descargando catálogo completo desde Supabase...");
        while (hasMore) {
            const { data, error } = await supabase
                .from('productos')
                .select('id, titulo, precio, porcentaje_ganancia, precio_costo, precio_fijo')
                .range(rangeStart, rangeEnd);

            if (error) throw error;

            if (data && data.length > 0) {
                dbProducts = dbProducts.concat(data);
                console.log(`📦 Productos cargados hasta ahora: ${dbProducts.length}`);
                rangeStart += 1000;
                rangeEnd += 1000;
            } else {
                hasMore = false; // Ya no hay más páginas
            }
        }

        console.log(`✅ Catálogo cargado totalmente. Total: ${dbProducts.length} productos.`);
        const localMap = new Map(dbProducts.map(p => [p.titulo.toLowerCase(), p]));
        // --- FIN DE PAGINACIÓN ---

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36');

        const cookies = [{
            'name': 'session', // El nombre de la cookie de sesión
            'value': 'TU_VALOR_AQUI',
            'domain': 'catalogo.treinta.co'
        }];
        await page.setCookie(...cookies);

        // 1. Antes del page.goto, configuramos la interceptación
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            request.continue();
        });

        // 2. Escuchamos las respuestas para ver qué nos trae la API
        page.on('response', async (response) => {
            const url = response.url();
            // Filtramos solo las peticiones que parecen cargar productos
            if (url.includes('products') || url.includes('catalog')) {
                try {
                    const status = response.status();
                    const data = await response.json();
                    console.log(`📡 API detectada [${status}]: ${url}`);

                    // Si es un array, contemos cuántos trae
                    if (Array.isArray(data)) {
                        console.log(`📦 Cantidad de productos en este paquete: ${data.length}`);
                    } else if (data.items) {
                        console.log(`📦 Cantidad de productos en este paquete: ${data.items.length}`);
                    }
                } catch (e) {
                    // A veces la respuesta no es JSON, no importa
                }
            }
        });

        await page.goto(PROVIDER_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log("🖱️ Simulando interacción humana inicial...");
        await page.mouse.move(500, 500);
        await page.evaluate(() => window.scrollTo(0, 500));
        await new Promise(r => setTimeout(r, 2000));

        // Ejecutamos la función híbrida
        const scrapedProducts = await scrollAndExtract(page);

        await browser.close();

        // DEBUG: Ver cuántos contenedores de producto estamos tocando realmente
        const totalPotencial = await page.evaluate(() => {
            // Buscamos los contenedores que Treinta usa para sus cards
            const cards = document.querySelectorAll('[class*="product"], [class*="item"], article');
            return cards.length;
        });
        console.log(`🔍 DEBUG: El DOM de la web tiene ${totalPotencial} elementos que parecen productos.`);

        const finalScraped = scrapedProducts.filter(p => p.titulo && p.precioCosto > 0);

        // =========================================================================
        // 🎯 AUDITORÍA DE CONTRASTE GINI
        // =========================================================================
        console.log(`\n=== 📊 AUDITORÍA DE CONTRASTE GINI ===`);
        console.log(`• Total de productos capturados por el acumulador en la web: ${finalScraped.length}`);

        if (dbProducts) {
            const faltantes = finalScraped.filter(pWeb =>
                !localMap.has(pWeb.titulo.toLowerCase())
            );

            if (faltantes.length > 0) {
                console.log(`⚠️ ALERTA: Ingresando ${faltantes.length} productos nuevos a Supabase:`);
                // Solo imprimimos los primeros 10 para no saturar la consola si son cientos
                faltantes.slice(0, 10).forEach((p, idx) => {
                    console.log(`   [${idx + 1}] -> "${p.titulo}" | Costo: $${p.precioCosto}`);
                });
                if (faltantes.length > 10) console.log(`   ...y ${faltantes.length - 10} más.`);
            } else {
                console.log(`✅ ¡Sincronización perfecta! No quedan productos omitidos.`);
            }
        }
        console.log(`=======================================\n`);

        let inserts = [];
        let updates = [];

        for (const item of finalScraped) {
            const key = item.titulo.toLowerCase();

            if (localMap.has(key)) {
                const localItem = localMap.get(key);

                if (localItem.precio_fijo !== null && localItem.precio_fijo !== undefined) {
                    updates.push(
                        supabase.from('productos').update({
                            precio_costo: item.precioCosto,
                            precio: localItem.precio_fijo,
                            descripcion: item.descripcion,
                            imagen_url: item.imagen_url
                        }).eq('id', localItem.id)
                    );
                } else {
                    const margen = localItem.porcentaje_ganancia !== null ? localItem.porcentaje_ganancia : DEFAULT_MARGIN;
                    const nuevoPrecioVenta = Math.round(item.precioCosto * (1 + margen / 100));

                    updates.push(
                        supabase.from('productos').update({
                            precio_costo: item.precioCosto,
                            precio: nuevoPrecioVenta,
                            porcentaje_ganancia: margen,
                            precio_fijo: null,
                            descripcion: item.descripcion,
                            imagen_url: item.imagen_url
                        }).eq('id', localItem.id)
                    );
                }
            } else {
                const precioVentaNuevo = Math.round(item.precioCosto * (1 + DEFAULT_MARGIN / 100));
                inserts.push({
                    titulo: item.titulo,
                    precio_costo: item.precioCosto,
                    porcentaje_ganancia: DEFAULT_MARGIN,
                    precio_fijo: null,
                    precio: precioVentaNuevo,
                    descripcion: item.descripcion,
                    imagen_url: item.imagen_url
                });
            }
        }

        if (inserts.length > 0) {
            const { error: insErr } = await supabase.from('productos').insert(inserts);
            if (insErr) throw insErr;
        }
        if (updates.length > 0) {
            // Partimos los updates en lotes para no saturar Supabase si son cientos
            for (let i = 0; i < updates.length; i += 50) {
                await Promise.all(updates.slice(i, i + 50));
            }
        }

        console.log(`[SINCRO COMPLETADA] Base de datos actualizada con éxito.`);
    } catch (error) {
        console.error(`[Error]: ${error.message}`);
        if (browser) await browser.close();
        process.exit(1);
    }
}

syncCatalog();