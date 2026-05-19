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
                        maxReached = Math.max(maxReached, container.scrollHeight);maxReached = Math.max(maxReached, container.scrollHeight);
                    }
                });
                totalHeight += distance;
                if (totalHeight >= maxReached + 6000) {
                    clearInterval(timer);
                    resolve();
                }
            }, 90);

            setTimeout(() => { clearInterval(timer); resolve(); }, 15000);
        });
    });
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
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.goto(PROVIDER_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await forceDeepScroll(page);
        await new Promise(resolve => setTimeout(resolve, 3000));

        const scrapedProducts = await page.evaluate(() => {
            let found = [];
            const allElements = document.querySelectorAll('*');

            allElements.forEach(el => {
                if (el.textContent && el.textContent.includes('$') && el.children.length <= 1) {
                    let isInsideInvalidContainer = false;
                    let current = el;
                    while (current) {
                        const className = current.className?.toString().toLowerCase() || '';
                        const id = current.id?.toString().toLowerCase() || '';
                        if (className.includes('modal') || className.includes('dialog') || className.includes('carousel') || className.includes('swiper') || id.includes('modal')) {
                            isInsideInvalidContainer = true;
                            break;
                        }
                        current = current.parentElement;
                    }
                    if (isInsideInvalidContainer) return;

                    const priceText = el.textContent.trim();
                    
                    // AISLAMIENTO DE PRECIO CON REGEX: Captura únicamente la secuencia de números y puntos tras el '$'
                    // Previene de forma absoluta la mezcla con números del título ("60led", "3 en 1")
                    const matchPrice = priceText.match(/\$\s*([0-9.]+)/);

                    if (matchPrice) {
                        const priceNumbers = matchPrice[1].replace(/\./g, '');
                        const precioCosto = parseFloat(priceNumbers);
                        
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
                                const descripcion = textBlocks[1] && textBlocks[1].length > 10 ? textBlocks[1] : '';
                                if (!found.some(p => p.titulo.toLowerCase() === titulo.toLowerCase())) {
                                    found.push({ titulo, precioCosto, descripcion, imagen_url: img.src });
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

        const finalScraped = scrapedProducts.filter(p => {
            const t = p.titulo.toLowerCase();
            return !t.includes("viewport") && !t.includes("catálogo") && !t.includes("error") && p.precioCosto > 0;
        });

        console.log(`[OK] Detectados ${finalScraped.length} productos reales sanitizados.`);

        let inserts = [];
        let updates = [];

        for (const item of finalScraped) {
            const key = item.titulo.toLowerCase();
            
            if (localMap.has(key)) {
                const localItem = localMap.get(key);
                
                // ARQUITECTURA DE PRECIOS HÍBRIDA:
                // Si el producto posee un Precio Fijo Manual activo en el admin, el robot actualiza el costo base pero NO toca el precio de venta final
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
                    // Si opera en modo automático, recalcula el valor final en base al porcentaje guardado
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