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
    console.log("👀 Iniciando extracción visual (Cazador de Botones Activado 🎯)...");
    let foundMap = new Map();
    let idleCycles = 0;

    console.log("🖱️ Dando foco a la página en el margen...");
    await page.mouse.click(5, 300);
    await page.focus('body');
    await new Promise(r => setTimeout(r, 1000));

    // Aumentamos a 150 intentos por si son muchos productos
    for (let attempt = 0; attempt < 150; attempt++) {
        // 1. EXTRACTOR
        const newProducts = await page.evaluate(() => {
            let results = [];
            const allImages = document.querySelectorAll('img');

            allImages.forEach(img => {
                let cardContainer = img.parentElement;
                for (let i = 0; i < 6; i++) {
                    if (!cardContainer) break;

                    const textContent = cardContainer.textContent || '';
                    if (textContent.includes('$')) {
                        const match = textContent.match(/\$[\s\u00a0]*([0-9.]+)/);
                        if (match) {
                            const price = parseFloat(match[1].replace(/\./g, ''));
                            const textElements = Array.from(cardContainer.querySelectorAll('h1, h2, h3, h4, p, span, div'))
                                .map(el => el.textContent.trim())
                                .filter(t => t && !t.includes('$') && t.length > 2 && t.length < 140);

                            if (textElements.length > 0) {
                                let titulo = textElements.find(t => t.length < 50) || textElements[0];
                                titulo = titulo.replace(/[\*\'\´\"]/g, '').trim();
                                results.push({ titulo, precioCosto: price, imagen_url: img.src });
                                break;
                            }
                        }
                    }
                    cardContainer = cardContainer.parentElement;
                }
            });
            return results;
        });

        // 2. Acumulamos y chequeamos
        let lastSize = foundMap.size;
        newProducts.forEach(p => foundMap.set(p.titulo.toLowerCase(), p));

        if (foundMap.size > lastSize) {
            console.log(`📦 Productos a la vista: ${foundMap.size}`);
            idleCycles = 0; // Si encontró nuevos, reseteamos la paciencia
        } else {
            idleCycles++;
            console.log(`⏳ Buscando más productos... (Intento vacío ${idleCycles}/12)`);
        }

        // Le damos 12 intentos de paciencia antes de rendirse
        if (idleCycles >= 12) {
            console.log("🛑 Se llegó al fondo real del catálogo.");
            break;
        }

        // 3. EL SCROLL CON ESPACIO Y CAZA DE BOTONES
        for (let j = 0; j < 6; j++) {
            await page.keyboard.press('Space');
            await new Promise(r => setTimeout(r, 400));
        }

        // BÚSQUEDA AGRESIVA DE BOTÓN DE CARGA
        await page.evaluate(() => {
            // Buscamos en TODOS los elementos, no solo botones
            const elements = document.querySelectorAll('button, a, div, span');
            for (let el of elements) {
                const txt = el.textContent.toLowerCase().trim();
                // Comprobamos si tiene el texto clave y si está visible (clientHeight > 0)
                if ((txt === 'ver más' || txt === 'cargar más' || txt === 'mostrar más' || txt === 'ver mas') && el.clientHeight > 0) {
                    el.click();
                    break; // Si encontramos uno y le damos clic, dejamos de buscar
                }
            }
        });

        // Espera de 2.5s para que la red traiga las fotos nuevas
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

        while (hasMore) {
            const { data, error } = await supabase
                .from('productos')
                .select('id, titulo, precio, porcentaje_ganancia, precio_costo, precio_fijo')
                .range(rangeStart, rangeEnd);

            if (error) throw error;
            if (data && data.length > 0) {
                dbProducts = dbProducts.concat(data);
                rangeStart += 1000;
                rangeEnd += 1000;
            } else {
                hasMore = false;
            }
        }

        const localMap = new Map(dbProducts.map(p => [p.titulo.toLowerCase(), p]));

        browser = await puppeteer.launch({
            headless: true, // Volvemos a ocultarlo para GitHub
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--window-size=1920,1080' // Forzamos un monitor Full HD virtual
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 }); // Clave para que el clic (5, 300) funcione
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36');
        console.log("🌐 Navegando a la tienda...");
        await page.goto(PROVIDER_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log("⏳ Esperando la carga inicial...");
        await new Promise(r => setTimeout(r, 4000));

        await page.addStyleTag({
            content: `
        .modal-content img, .product-detail img { 
            max-width: 400px !important; 
            max-height: 400px !important; 
            object-fit: contain !important; 
        }
    `
        });

        const scrapedProducts = await scrollAndExtract(page);

        console.log(`\n=== 📊 AUDITORÍA DE CONTRASTE GINI ===`);
        console.log(`• Total de productos capturados visualmente: ${scrapedProducts.length}`);

        await browser.close();

        const finalScraped = scrapedProducts.filter(p => p.titulo && p.precioCosto > 0);
        let inserts = [];
        let updates = [];

        for (const item of finalScraped) {
            const key = item.titulo.toLowerCase();
            if (localMap.has(key)) {
                const localItem = localMap.get(key);
                updates.push(supabase.from('productos').update({
                    precio_costo: item.precioCosto,
                    precio: localItem.precio_fijo || Math.round(item.precioCosto * (1 + (localItem.porcentaje_ganancia || DEFAULT_MARGIN) / 100)),
                    imagen_url: item.imagen_url
                }).eq('id', localItem.id));
            } else {
                inserts.push({
                    titulo: item.titulo,
                    precio_costo: item.precioCosto,
                    porcentaje_ganancia: DEFAULT_MARGIN,
                    precio_fijo: null,
                    precio: Math.round(item.precioCosto * (1 + DEFAULT_MARGIN / 100)),
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