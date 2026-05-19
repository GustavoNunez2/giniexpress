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
    console.log("🐢 Iniciando extracción blindada...");
    let foundMap = new Map();
    let lastCount = 0;
    let attemptsWithoutNewProducts = 0;

    for (let i = 0; i < 60; i++) {
        try {
            const newProducts = await page.evaluate(() => {
                const results = [];
                document.querySelectorAll('img').forEach(img => {
                    let card = img.closest('div[class*="product"], article, li, div');
                    if (!card) return;
                    const priceMatch = card.textContent.match(/\$[\s\u00a0]*([0-9.]+)/);
                    if (!priceMatch) return;
                    const price = parseFloat(priceMatch[1].replace(/\./g, ''));
                    const titleEl = card.querySelector('h1, h2, h3, h4, p');
                    const title = titleEl ? titleEl.textContent.trim().replace(/[\*\'\´\"]/g, '') : "Producto";
                    results.push({ titulo: title, precioCosto: price, imagen_url: img.src });
                });
                return results;
            });

            newProducts.forEach(p => foundMap.set(p.titulo.toLowerCase(), p));

            if (foundMap.size > lastCount) {
                console.log(`📦 Productos acumulados hasta ahora: ${foundMap.size}`);
                lastCount = foundMap.size;
                attemptsWithoutNewProducts = 0;
            } else {
                attemptsWithoutNewProducts++;
            }

            if (attemptsWithoutNewProducts >= 5) break;

            await page.evaluate(() => {
                window.scrollBy(0, 800);
                const btns = Array.from(document.querySelectorAll('button, a'));
                const btn = btns.find(b => ['ver más', 'cargar más', 'mostrar más'].some(kw => b.textContent.toLowerCase().includes(kw)));
                if (btn) btn.click();
            });
        } catch (e) {
            console.log("⚠️ Contexto destruido, reintentando...");
        }
        await new Promise(r => setTimeout(r, 2500));
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