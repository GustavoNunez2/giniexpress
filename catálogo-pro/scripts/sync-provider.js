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

async function forceDeepScroll(page) {
    console.log("⏳ Iniciando scroll de persistencia dinámica profunda...");

    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let lastHeight = document.documentElement.scrollHeight;
            let distance = 600; // Bajamos tramos más grandes de pixelado
            let noChangeCount = 0;

            let timer = setInterval(() => {
                window.scrollBy(0, distance);

                let currentHeight = document.documentElement.scrollHeight;

                // Si la altura actual es igual a la anterior, es porque puede estar cargando datos
                if (currentHeight === lastHeight) {
                    noChangeCount++;
                    // Si pasa 4 veces seguidas sin crecer (más de 3 segundos de espera total), llegamos al fondo real
                    if (noChangeCount >= 4) {
                        clearInterval(timer);
                        resolve();
                    }
                } else {
                    // Si la altura cambió, reiniciamos el contador y actualizamos la marca
                    noChangeCount = 0;
                    lastHeight = currentHeight;
                }
            }, 800); // 800ms: pausa clave para que la API de Treinta inyecte la siguiente tanda en el HTML

            // Salvavidas absoluto: a los 90 segundos corta pase lo que pase para no dejar colgado el servidor
            setTimeout(() => { clearInterval(timer); resolve(); }, 90000);
        });
    });

    // Pausa de estabilización final fuera de la evaluación
    await new Promise(r => setTimeout(r, 3000));
    console.log("✅ Scroll profundo finalizado. Catálogo completamente expandido.");
}

async function syncCatalog() {
    console.log(`[${new Date().toISOString()}] Iniciando escáner visual con sanitización de precios...`);
    let browser;
    try {
        const { data: dbProducts, error: dbError } = await supabase
            .from('productos')
            .select('id, titulo, precio, porcentaje_ganancia, precio_costo, precio_fijo');

        if (dbError) throw dbError;
        const localMap = new Map(dbProducts?.map(p => [p.titulo.toLowerCase(), p]) || []);

        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1920,1080' // Forzamos tamaño de monitor de escritorio
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 }); // Viewport expandido anti-bloqueos
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        await page.goto(PROVIDER_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await forceDeepScroll(page);
        await new Promise(resolve => setTimeout(resolve, 3000));

        const scrapedProducts = await page.evaluate(() => {
            let found = [];

            // 🎯 CAPTURA DIRECTA DE TARJETAS: Buscamos cualquier elemento que actúe como bloque de producto
            // En Treinta, los productos suelen estar contenidos en etiquetas de listas, artículos o divs con bordes.
            // Para ser universales, buscamos todas las imágenes primero y rastreamos sus contenedores.
            const allImages = document.querySelectorAll('img');

            allImages.forEach(img => {
                // Buscamos el contenedor padre más cercano que encierre a la imagen y a su texto (subimos hasta 6 niveles)
                let cardContainer = img.parentElement;
                let priceFound = null;
                let textBlocks = [];

                for (let i = 0; i < 6; i++) {
                    if (!cardContainer) break;

                    // Si este contenedor ya lo procesamos mediante otra imagen, saltamos
                    if (cardContainer.textContent && cardContainer.textContent.includes('$')) {
                        // Buscamos el precio dentro de este bloque
                        const match = cardContainer.textContent.match(/\$[\s\u00a0]*([0-9.]+)/);
                        if (match) {
                            priceFound = parseFloat(match[1].replace(/\./g, ''));
                        }
                    }

                    // Extraemos todos los textos limpios de los alrededores de la imagen
                    cardContainer.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div').forEach(textEl => {
                        const txt = textEl.textContent.trim();
                        if (txt && !txt.includes('$') && txt.length > 2 && txt.length < 140) {
                            if (!textBlocks.includes(txt)) {
                                textBlocks.push(txt);
                            }
                        }
                    });

                    // Si encontramos un precio válido y texto en este bloque, es un producto legítimo
                    if (priceFound && priceFound > 0 && textBlocks.length > 0) {
                        // Limpieza de títulos (remover asteriscos y comillas raras de pulgadas)
                        let titulo = textBlocks.find(t => t.toLowerCase().includes('ventilador') || t.length < 50);
                        if (!titulo) titulo = textBlocks[0]; // Fallback al primer texto

                        titulo = titulo.replace(/[\*\'\´\"]/g, '').trim();

                        let descripcion = textBlocks.find(t => t.length > titulo.length && t !== titulo) || '';
                        if (descripcion.toLowerCase().includes('sin descripción') || descripcion.toLowerCase().includes('no descripción')) {
                            descripcion = '';
                        }

                        if (!found.some(p => p.titulo.toLowerCase() === titulo.toLowerCase())) {
                            found.push({
                                titulo: titulo,
                                precioCosto: priceFound,
                                descripcion: descripcion,
                                imagen_url: img.src
                            });
                        }
                        break; // Salimos del bucle de niveles para esta imagen
                    }

                    cardContainer = cardContainer.parentElement;
                }
            });

            return found;
        });

        await browser.close();

        // FILTRO DE CONTROL REPARADO: Removimos la condición agresiva de exclusión de texto
        const finalScraped = scrapedProducts.filter(p => p.titulo && p.precioCosto > 0);

        // =========================================================================
        // 🎯 BLOQUE DE AUDITORÍA DE CONTRASTE INTEGRADO
        // =========================================================================
        console.log(`\n=== 📊 AUDITORÍA DE CONTRASTE GINI ===`);
        console.log(`• Productos detectados vivos en la web hoy: ${finalScraped.length}`);

        if (dbProducts) {
            const faltantes = finalScraped.filter(pWeb =>
                !localMap.has(pWeb.titulo.toLowerCase())
            );

            if (faltantes.length > 0) {
                console.log(`⚠️ ALERTA: Hay ${faltantes.length} productos omitidos en Supabase que se van a impactar ahora:`);
                faltantes.forEach((p, idx) => {
                    console.log(`   [${idx + 1}] -> "${p.titulo}" | Costo Base: $${p.precioCosto}`);
                });
            } else {
                console.log(`✅ ¡Sincronización perfecta! No quedan productos colgados en el puente.`);
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
            await Promise.all(updates);
        }

        console.log(`[SINCRO COMPLETADA] Base de datos actualizada correctamente.`);
    } catch (error) {
        console.error(`[Error]: ${error.message}`);
        if (browser) await browser.close();
        process.exit(1);
    }
}

syncCatalog();