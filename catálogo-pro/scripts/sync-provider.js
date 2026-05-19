import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

const PROVIDER_URL = 'https://catalogo.treinta.co/brajaexpress-e8aefd';
const DEFAULT_MARGIN = 15; // Margen por defecto para productos nuevos

const { SUPABASE_URL, SUPABASE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: Faltan variables de entorno de Supabase.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Función para simular el scroll humano continuo hasta el fin de la página
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            let distance = 120; // Distancia de cada avance del scroll
            let timer = setInterval(() => {
                let scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight - window.innerHeight) {
                    // Esperamos un segundo extra para verificar si el scroll infinito cargó más productos
                    setTimeout(() => {
                        if (document.body.scrollHeight === scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 1200);
                }
            }, 80);
        });
    });
}

async function syncCatalog() {
    console.log(`[${new Date().toISOString()}] Lanzando navegador virtual para evadir límite de scroll...`);
    let browser;
    try {
        // 1. Obtener los productos locales para respetar tus cambios de márgenes manuales
        const { data: dbProducts, error: dbError } = await supabase
            .from('productos')
            .select('id, titulo, precio, porcentaje_ganancia, precio_costo');
        
        if (dbError) throw dbError;
        const localMap = new Map(dbProducts?.map(p => [p.titulo, p]) || []);

        // 2. Iniciar Chrome en modo headless compatible con los servidores de GitHub
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        
        // Evitamos firmas básicas de bots configurando un User-Agent real
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log(`Navegando a: ${PROVIDER_URL}`);
        await page.goto(PROVIDER_URL, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('Iniciando descenso por scroll infinito. Esperando carga total de cards...');
        await autoScroll(page);
        
        // Estabilización final para asegurar la hidratación de los scripts de Next.js
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Extraemos el código fuente completo con el DOM expandido al 100%
        const html = await page.content();
        await browser.close();

        // 3. Normalización radical del texto plano
        let cleanText = html.replace(/[\n\r\t]/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        
        // DECODIFICADOR UNICODE: Corrige los nombres rotos convirtiendo cosas como \u0026 en "&"
        cleanText = cleanText.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
            return String.fromCharCode(parseInt(grp, 16));
        });

        let scrapedProducts = [];
        const productRegex = /"(name|title)"\s*:\s*"([^"]+)"/g;
        let match;

        // 4. Raspado semántico por proximidad sobre el documento entero
        while ((match = productRegex.exec(cleanText)) !== null) {
            const titulo = match[2].trim();

            const blacklist = [
                "braja express", "catálogo", "dashboard", "viewport", 
                "no es posible acceder", "error", "icon", "manifest", 
                "robots", "width", "initial-scale", "device-width", "og:", "twitter:"
            ];

            if (blacklist.some(word => titulo.toLowerCase().includes(word)) || 
                titulo.length < 3 || titulo.length > 85) {
                continue;
            }

            const startIdx = match.index;
            const endIdx = Math.min(cleanText.length, match.index + 1800);
            const chunk = cleanText.substring(startIdx, endIdx);

            const priceMatch = chunk.match(/"price"\s*:\s*"?([0-9]+)"?/i) || 
                               chunk.match(/"price_amount"\s*:\s*"?([0-9]+)"?/i);

            const descMatch = chunk.match(/"description"\s*:\s*"([^"]*?)"/i) || 
                              chunk.match(/"desc"\s*:\s*"([^"]*?)"/i);

            const imgMatch = chunk.match(/"image"\s*:\s*"([^"]+?)"/i) || 
                             chunk.match(/"imageUrl"\s*:\s*"([^"]+?)"/i) || 
                             chunk.match(/"url"\s*:\s*"([^"]+?)"/i);

            if (priceMatch) {
                const precioCosto = parseFloat(priceMatch[1]);
                const descripcion = descMatch ? descMatch[1].trim() : 'Sin descripción disponible.';
                let imagen_url = imgMatch ? imgMatch[1].trim() : '';

                if (imagen_url && !imagen_url.startsWith('http')) {
                    if (imagen_url.startsWith('//')) imagen_url = 'https:' + imagen_url;
                    else if (imagen_url.startsWith('/')) imagen_url = 'https://catalogo.treinta.co' + imagen_url;
                }

                if (precioCosto > 0 && !scrapedProducts.some(p => p.titulo === titulo)) {
                    scrapedProducts.push({ titulo, precioCosto, descripcion, imagen_url });
                }
            }
        }

        if (scrapedProducts.length === 0) throw new Error("No se detectaron variables de productos tras el scroll.");

        console.log(`\n¡Éxito de captura! Se detectaron ${scrapedProducts.length} productos reales en total.`);

        // 5. Mapeo inteligente sin romper tus modificaciones manuales del admin
        let inserts = [];
        let updates = [];

        for (const item of scrapedProducts) {
            if (localMap.has(item.titulo)) {
                const localItem = localMap.get(item.titulo);
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

        if (inserts.length > 0) {
            const { error: insErr } = await supabase.from('productos').insert(inserts);
            if (insErr) throw insErr;
            console.log(`[OK] Insertados ${inserts.length} productos nuevos.`);
        }

        if (updates.length > 0) {
            await Promise.all(updates);
            console.log(`[OK] Sincronizados costos de ${updates.length} productos existentes.`);
        }

        console.log(`\n[SINCRO FINALIZADA] Tu base de datos quedó perfectamente espejada.`);

    } catch (error) {
        console.error(`[Fallo crítico del robot]: ${error.message}`);
        if (browser) await browser.close();
        process.exit(1);
    }
}

syncCatalog();