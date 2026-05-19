import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

const PROVIDER_URL = 'https://catalogo.treinta.co/brajaexpress-e8aefd?sort=name-asc';
const DEFAULT_MARGIN = 15;

const { SUPABASE_URL, SUPABASE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error fatal: Faltan las variables de entorno de Supabase.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrollAndExtract(page) {
    console.log(" Iniciando extracción por Intercepción de Red y DOM Progresivo...");
    let foundMap = new Map();

    // 1. INTERCEPTOR DE API (Estrategia Maestra)
    // Treinta carga sus datos vía JSON. Capturamos el objeto directamente de la red.
    page.on('response', async (response) => {
        const url = response.url();
        // Patrones comunes en Treinta: Next.js data o llamadas a su API de catálogo
        if (url.includes('_next/data') || url.includes('/api/catalog') || url.includes('/api/products')) {
            try {
                const data = await response.json();
                // Navegamos por la estructura del JSON de Treinta (usualmente bajo pageProps)
                const products = data?.pageProps?.products || data?.products || data?.data || [];
                
                if (Array.isArray(products) && products.length > 0) {
                    products.forEach(p => {
                        // Mapeamos al formato que espera tu base de datos
                        const titulo = (p.name || p.title || "").trim();
                        if (titulo) {
                            foundMap.set(titulo.toLowerCase(), {
                                titulo: titulo.replace(/[\*\'\´\"]/g, ''),
                                precioCosto: parseFloat(p.price || p.price_amount || 0),
                                imagen_url: p.image || p.imageUrl || (p.images && p.images[0]) || "",
                                descripcion: p.description || ""
                            });
                        }
                    });
                    console.log(`📡 API capturada: +${products.length} productos detectados en red.`);
                }
            } catch (e) {
                // Silencioso: algunas respuestas no son JSON
            }
        }
    });

    let lastSize = 0;
    let idleCycles = 0;

    // 2. CICLO DE SCROLL RESILIENTE
    for (let i = 0; i < 100; i++) {
        try {
            // Extracción de seguridad desde el DOM (Fallback si la API cambia)
            const domItems = await page.evaluate(() => {
                const results = [];
                document.querySelectorAll('img').forEach(img => {
                    let card = img.closest('div[class*="product"], article, li, div');
                    if (!card || card.textContent.length > 500) return; // Evitar contenedores gigantes
                    
                    const priceMatch = card.textContent.match(/\$[\s\u00a0]*([0-9.]+)/);
                    if (priceMatch) {
                        const price = parseFloat(priceMatch[1].replace(/\./g, ''));
                    const titleEl = card.querySelector('h1, h2, h3, h4, p');
                        const title = titleEl ? titleEl.textContent.trim() : "";
                        if (title.length > 2) {
                            results.push({ titulo: title, precioCosto: price, imagen_url: img.src });
                        }
                    }
                });
                return results;
            });

            domItems.forEach(p => {
                const key = p.titulo.toLowerCase();
                if (!foundMap.has(key)) foundMap.set(key, p);
            });

            if (foundMap.size > lastSize) {
                console.log(`📦 Productos acumulados hasta ahora: ${foundMap.size}`);
                lastSize = foundMap.size;
                idleCycles = 0;
            } else {
                idleCycles++;
            }

            // Si llevamos 8 ciclos sin nada nuevo, probablemente terminamos
            if (idleCycles >= 8) break;

            // Scroll y click en "Ver más"
            await page.evaluate(() => {
                window.scrollBy(0, 1200);
                // Buscar botón de carga por texto, clases o proximidad
                const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
                const btn = btns.find(b => {
                    const txt = b.textContent.toLowerCase();
                    return txt.includes('ver más') || txt.includes('cargar más') || txt.includes('mostrar más');
                });
                if (btn) btn.click();
            });

            // Espera dinámica para permitir que la API responda y el DOM se estabilice
            await new Promise(r => setTimeout(r, 1500));

        } catch (e) {
            console.log("⚠️ Interrupción de contexto detectada. Recuperando flujo...");
            // No salimos del bucle, simplemente esperamos y reintentamos en la siguiente iteración
            await new Promise(r => setTimeout(r, 3000));
        }
    }
    return Array.from(foundMap.values());
}

async function syncCatalog() {
    console.log(`[${new Date().toISOString()}] Arrancando escáner...`);
    let browser;
    try {
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
                hasMore = false;
            }
        }

        console.log(`✅ Catálogo cargado totalmente. Total: ${dbProducts.length} productos.`);
        const localMap = new Map(dbProducts.map(p => [p.titulo.toLowerCase(), p]));

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36');

        const cookies = [{
            'name': 'session',
            'value': 'TU_VALOR_AQUI',
            'domain': 'catalogo.treinta.co'
        }];
        await page.setCookie(...cookies);

        await page.setRequestInterception(true);
        page.on('request', (request) => request.continue());

        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('products') || url.includes('catalog')) {
                try {
                    const data = await response.json();
                    console.log(`📡 API detectada: ${url}`);
                } catch (e) {}
            }
        });

        await page.goto(PROVIDER_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log("🖱️ Simulando interacción humana inicial...");
        await page.mouse.move(500, 500);
        await page.evaluate(() => window.scrollTo(0, 500));
        await new Promise(r => setTimeout(r, 2000));

        const scrapedProducts = await scrollAndExtract(page);
        await browser.close();

        const totalPotencial = scrapedProducts.length;
        console.log(`🔍 DEBUG: El total de productos únicos encontrados es: ${totalPotencial}`);

        const finalScraped = scrapedProducts.filter(p => p.titulo && p.precioCosto > 0);

        console.log(`\n=== 📊 AUDITORÍA DE CONTRASTE GINI ===`);
        console.log(`• Total de productos capturados: ${finalScraped.length}`);

        let inserts = [];
        let updates = [];

        for (const item of finalScraped) {
            const key = item.titulo.toLowerCase();
            if (localMap.has(key)) {
                const localItem = localMap.get(key);
                updates.push(supabase.from('productos').update({
                    precio_costo: item.precioCosto,
                    precio: localItem.precio_fijo || Math.round(item.precioCosto * (1 + (localItem.porcentaje_ganancia || DEFAULT_MARGIN) / 100)),
                    descripcion: item.descripcion,
                    imagen_url: item.imagen_url
                }).eq('id', localItem.id));
            } else {
                inserts.push({
                    titulo: item.titulo,
                    precio_costo: item.precioCosto,
                    porcentaje_ganancia: DEFAULT_MARGIN,
                    precio_fijo: null,
                    precio: Math.round(item.precioCosto * (1 + DEFAULT_MARGIN / 100)),
                    descripcion: item.descripcion,
                    imagen_url: item.imagen_url
                });
            }
        }

        if (inserts.length > 0) await supabase.from('productos').insert(inserts);
        for (let i = 0; i < updates.length; i += 50) await Promise.all(updates.slice(i, i + 50));

        console.log(`[SINCRO COMPLETADA] Base de datos actualizada.`);
    } catch (error) {
        console.error(`[Error]: ${error.message}`);
        if (browser) await browser.close();
        process.exit(1);
    }
}

syncCatalog();