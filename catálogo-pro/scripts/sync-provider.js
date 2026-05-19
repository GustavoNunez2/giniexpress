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

// Función para forzar el scroll tanto en la ventana como en contenedores internos ocultos
async function forceDeepScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            let distance = 140;
            
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

                if (totalHeight >= maxReached + 6000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 90);

            // Salvaguarda de tiempo límite para el scroll masivo
            setTimeout(() => {
                clearInterval(timer);
                resolve();
            }, 15000);
        });
    });
}

async function syncCatalog() {
    console.log(`[${new Date().toISOString()}] Iniciando escáner visual con aislamiento de galerías...`);
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
        
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 3. EXTRACCIÓN VISUAL FILTRADA POR CONTEXTO
        const scrapedProducts = await page.evaluate(() => {
            let found = [];
            const allElements = document.querySelectorAll('*');

            allElements.forEach(el => {
                // Localizar nodos hoja que contengan el precio
                if (el.textContent && el.textContent.includes('$') && el.children.length <= 1) {
                    
                    // ESCUDO ANTI-MODALES Y GALERÍAS INTERNAS:
                    // Rastreamos hacia arriba para ver si este precio o imagen pertenece a un modal oculto o carrusel secundario
                    let isInsideInvalidContainer = false;
                    let current = el;
                    while (current) {
                        const className = current.className?.toString().toLowerCase() || '';
                        const id = current.id?.toString().toLowerCase() || '';
                        const role = current.getAttribute?.('role')?.toLowerCase() || '';
                        const ariaModal = current.getAttribute?.('aria-modal')?.toLowerCase() || '';
                        
                        if (
                            className.includes('modal') || className.includes('dialog') || 
                            className.includes('carousel') || className.includes('popup') ||
                            className.includes('swiper') || className.includes('slider') ||
                            className.includes('galeria') || className.includes('gallery') ||
                            id.includes('modal') || id.includes('dialog') ||
                            role === 'dialog' || ariaModal === 'true'
                        ) {
                            isInsideInvalidContainer = true;
                            break;
                        }
                        current = current.parentElement;
                    }

                    // Si está metido adentro de un modal o carrusel de fotos secundarias, lo salteamos por completo
                    if (isInsideInvalidContainer) return;

                    const priceText = el.textContent.trim();
                    const priceNumbers = priceText.replace(/[^0-9]/g, '');

                    if (priceNumbers.length >= 3 && priceNumbers.length <= 7) {
                        const precioCosto = parseFloat(priceNumbers);
                        
                        // Aislar la tarjeta principal subiendo hasta 5 niveles
                        let parent = el.parentElement;
                        for (let depth = 0; depth < 5; depth++) {
                            if (!parent) break;

                            const img = parent.querySelector('img');
                            
                            let textBlocks = [];
                            parent.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div').forEach(textEl => {
                                const txt = textEl.textContent.trim();
                                if (txt && !txt.includes('$') && txt.length > 2 && txt.length < 90 && textEl.children.length === 0) {
                                    textBlocks.push(txt);
                                }
                            });

                            if (img && textBlocks.length > 0) {
                                const titulo = textBlocks[0];
                                const descripcion = textBlocks[1] && textBlocks[1].length > 10 ? textBlocks[1] : 'Sin descripción disponible.';
                                
                                // Evitar duplicar el artículo en el mismo escaneo
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

        // Limpieza final de nombres del sistema
        const finalScraped = scrapedProducts.filter(p => {
            const t = p.titulo.toLowerCase();
            return !t.includes("viewport") && !t.includes("catálogo") && !t.includes("error") && p.precioCosto > 0;
        });

        console.log(`\n[Filtro Aplicado] Se aislaron ${finalScraped.length} productos principales, eliminando fotos de modales.`);

        // 4. Clasificación diferencial de datos para proteger tus modificaciones manuales del admin
        let inserts = [];
        let updates = [];

        for (const item of finalScraped) {
            const key = item.titulo.toLowerCase();
            
            if (localMap.has(key)) {
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

        // 5. Transmitir cambios hacia Supabase
        if (inserts.length > 0) {
            const { error: insErr } = await supabase.from('productos').insert(inserts);
            if (insErr) throw insErr;
            console.log(`[Base de Datos] Insertados ${inserts.length} productos nuevos.`);
        }

        if (updates.length > 0) {
            await Promise.all(updates);
            console.log(`[Base de Datos] Sincronizados costos de ${updates.length} productos existentes.`);
        }

        console.log(`\n[PROCESO COMPLETADO] Catálogo espejado sin duplicaciones.`);

    } catch (error) {
        console.error(`[Fallo crítico del robot]: ${error.message}`);
        if (browser) await browser.close();
        process.exit(1);
    }
}

syncCatalog();