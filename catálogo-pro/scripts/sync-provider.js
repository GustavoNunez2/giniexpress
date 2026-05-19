import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

const PROVIDER_URL = 'https://catalogo.treinta.co/brajaexpress-e8aefd';
const DEFAULT_MARGIN = 15; // Margen de ganancia inicial para productos nuevos

const { SUPABASE_URL, SUPABASE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error fatal: Faltan las variables de entorno de Supabase.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Función avanzada para forzar el scroll tanto en la ventana como en contenedores internos ocultos
async function forceDeepScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            let distance = 140;
            
            // Detectar todos los elementos de la pantalla que puedan tener scrollbars ocultos
            const scrollableContainers = [window];
            document.querySelectorAll('*').forEach(el => {
                const overflow = window.getComputedStyle(el).overflowY;
                if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) {
                    scrollableContainers.push(el);
                }
            });

            let timer = setInterval(() => {
                let maxReached = 0;
                
                scrollableContainers.forEach(container => {
                    if (container === window) {
                        window.scrollBy(0, distance);
                        maxReached = Math.max(maxReached, document.body.scrollHeight);
                    } else {
                        container.scrollBy(0, distance);
                        maxReached = Math.max(maxReached, container.scrollHeight);
                    }
                });

                totalHeight += distance;

                // Si recorrimos una distancia masiva proporcional al tamaño del catálogo, detenemos
                if (totalHeight >= maxReached + 6000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 90);

            // Salvaguarda: Cortar el scroll automáticamente a los 14 segundos para evitar esperas eternas
            setTimeout(() => {
                clearInterval(timer);
                resolve();
            }, 14000);
        });
    });
}

async function syncCatalog() {
    console.log(`[${new Date().toISOString()}] Desplegando escáner visual híbrido...`);
    let browser;
    try {
        // 1. Descargar el mapa local para respetar tus modificaciones manuales de precios
        const { data: dbProducts, error: dbError } = await supabase
            .from('productos')
            .select('id, titulo, precio, porcentaje_ganancia, precio_costo');
        
        if (dbError) throw dbError;
        const localMap = new Map(dbProducts?.map(p => [p.titulo.toLowerCase(), p]) || []);

        // 2. Lanzar navegador virtual controlado en la nube
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`Navegando hacia el catálogo del proveedor...`);
        await page.goto(PROVIDER_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('Ejecutando descenso continuo sobre contenedores dinámicos...');
        await forceDeepScroll(page);
        
        // Espera técnica para garantizar el renderizado de las imágenes diferidas (lazy-load)
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 3. EXTRACCIÓN VISUAL DIRECTA DEL DOM (Extrae los componentes ya dibujados tras el scroll)
        const scrapedProducts = await page.evaluate(() => {
            let found = [];
            const allElements = document.querySelectorAll('*');

            allElements.forEach(el => {
                // Localizar nodos que contengan texto de precio con el caracter '$'
                if (el.textContent && el.textContent.includes('$') && el.children.length <= 1) {
                    const priceText = el.textContent.trim();
                    const priceNumbers = priceText.replace(/[^0-9]/g, '');

                    if (priceNumbers.length >= 3 && priceNumbers.length <= 7) {
                        const precioCosto = parseFloat(priceNumbers);
                        
                        // Rastrear componentes ascendentes (padres) para aislar la tarjeta del artículo
                        let parent = el.parentElement;
                        for (let depth = 0; depth < 5; depth++) {
                            if (!parent) break;

                            const img = parent.querySelector('img');
                            
                            // Extraer bloques de texto candidatos para el título y descripción
                            let textBlocks = [];
                            parent.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div').forEach(textEl => {
                                const txt = textEl.textContent.trim();
                                if (txt && !txt.includes('$') && txt.length > 2 && txt.length < 90 && textEl.children.length === 0) {
                                    textBlocks.push(txt);
                                }
                            });

                            if (img && textBlocks.length > 0) {
                                const titulo = textBlocks[0];
                                // Si existe un segundo bloque de texto largo, lo tomamos como descripción
                                const descripcion = textBlocks[1] && textBlocks[1].length > 10 ? textBlocks[1] : 'Sin descripción detallada disponible.';
                                
                                // Evitar duplicaciones internas de elementos en la lectura visual
                                if (!found.some(p => p.titulo.toLowerCase() === titulo.toLowerCase())) {
                                    found.push({
                                        titulo: titulo,
                                        precioCosto: precioCosto,
                                        descripcion: descripcion,
                                        imagen_url: img.src
                                    });
                                }
                                break; 
                            }
                            parent = parent.parentElement;
                        }
                    }
                }
            });
            return found;
        });

        await browser.close();

        // Filtrado de seguridad sobre los nombres del sistema o vacíos
        const finalScraped = scrapedProducts.filter(p => {
            const t = p.titulo.toLowerCase();
            return !t.includes("viewport") && !t.includes("catálogo") && !t.includes("error") && p.precioCosto > 0;
        });

        if (finalScraped.length === 0) throw new Error("El escáner visual no detectó elementos de tarjetas válidas en la pantalla.");

        console.log(`\n[Éxito de lectura] Se capturaron un total de ${finalScraped.length} productos del catálogo entero.`);

        // 4. Clasificación diferencial de datos para proteger tus modificaciones manuales del admin
        let inserts = [];
        let updates = [];

        for (const item of finalScraped) {
            const key = item.titulo.toLowerCase();
            
            if (localMap.has(key)) {
                // Producto existente: Preservamos el margen asignado manualmente en el Panel de Control
                const localItem = localMap.get(key);
                const margen = localItem.porcentaje_ganancia !== null ? localItem.porcentaje_ganancia : DEFAULT_MARGIN;
                const nuevoPrecioVenta = Math.round(item.precioCosto * (1 + margen / 100));

                updates.push(
                    supabase.from('productos').update({
                        precio_costo: item.precioCosto,
                        precio: nuevoPrecioVenta,
                        descripcion: item.descripcion,
                        imagen_url: item.imagen_url
                    }).eq('id', localItem.id)
                );
            } else {
                // Artículo nuevo del distribuidor: Se inyecta con el margen base
                const precioVentaNuevo = Math.round(item.precioCosto * (1 + DEFAULT_MARGIN / 100));
                inserts.push({
                    titulo: item.titulo,
                    precio_costo: item.precioCosto,
                    porcentaje_ganancia: DEFAULT_MARGIN,
                    precio: precioVentaNuevo,
                    descripcion: item.descripcion,
                    imagen_url: item.imagen_url
                });
            }
        }

        // 5. Transmitir cambios hacia la base de datos de Supabase
        if (inserts.length > 0) {
            const { error: insErr } = await supabase.from('productos').insert(inserts);
            if (insErr) throw insErr;
            console.log(`[Base de Datos] Insertados ${inserts.length} productos nuevos.`);
        }

        if (updates.length > 0) {
            await Promise.all(updates);
            console.log(`[Base de Datos] Sincronizados costos de ${updates.length} productos existentes.`);
        }

        console.log(`\n[PROCESO COMPLETADO] Sincronización exitosa.`);

    } catch (error) {
        console.error(`[Fallo crítico del robot]: ${error.message}`);
        if (browser) await browser.close();
        process.exit(1);
    }
}

syncCatalog();