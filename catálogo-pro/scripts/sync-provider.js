import { createClient } from '@supabase/supabase-js';

const PROVIDER_URL = 'https://catalogo.treinta.co/brajaexpress-e8aefd';
const DEFAULT_MARGIN = 15; // Margen por defecto para productos nuevos

const { SUPABASE_URL, SUPABASE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: Faltan variables de entorno de Supabase.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncCatalog() {
    console.log(`[${new Date().toISOString()}] Iniciando sincronización profunda multidominio...`);
    try {
        // 1. Obtener el estado actual de tu catálogo en Supabase para contrastar en memoria
        const { data: dbProducts, error: dbError } = await supabase
            .from('productos')
            .select('id, titulo, precio, porcentaje_ganancia, precio_costo');
        
        if (dbError) throw dbError;
        const localMap = new Map(dbProducts?.map(p => [p.titulo, p]) || []);

        let scrapedProducts = [];
        let page = 1;
        let keepScraping = true;
        const maxPages = 20; // Salvaguarda para evitar bucles infinitos

        // 2. Bucle de paginación profunda (Bypasa el scroll infinito simulando un bot de SEO)
        while (keepScraping && page <= maxPages) {
            // Combinamos limitadores de tamaño y número de página para forzar la entrega completa
            const pageUrl = `${PROVIDER_URL}?page=${page}&limit=200&per_page=200&size=200`;
            console.log(`Rastreando lote de productos en: ${pageUrl}`);

            const response = await fetch(pageUrl);
            if (!response.ok) {
                console.log(`Llegamos al final de las páginas públicas en el lote ${page}.`);
                break;
            }

            const html = await response.text();
            
            // Limpieza y normalización de caracteres de control
            let cleanText = html.replace(/[\n\r\t]/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

            // DECODIFICADOR UNICODE: Soluciona problemas de símbolos extraños como \u0026 en los títulos
            cleanText = cleanText.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
                return String.fromCharCode(parseInt(grp, 16));
            });

            const productRegex = /"(name|title)"\s*:\s*"([^"]+)"/g;
            let match;
            let itemsFoundOnThisPage = 0;

            // 3. Extracción de tokens por proximidad en la página actual
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

                    // Guardar si tiene precio real y no está duplicado en la tanda actual
                    if (precioCosto > 0 && !scrapedProducts.some(p => p.titulo === titulo)) {
                        scrapedProducts.push({ titulo, precioCosto, descripcion, imagen_url });
                        itemsFoundOnThisPage++;
                    }
                }
            }

            console.log(`Resultados de página ${page}: ${itemsFoundOnThisPage} productos nuevos mapeados.`);
            
            // Si una página entera no arrojó nada nuevo, significa que agotamos el catálogo del proveedor
            if (itemsFoundOnThisPage === 0) {
                keepScraping = false;
            } else {
                page++;
            }
        }

        if (scrapedProducts.length === 0) throw new Error("No se pudo extraer ningún artículo válido del árbol multidominio.");

        console.log(`\nTotal global extraído: ${scrapedProducts.length} productos. Sincronizando Supabase...`);

        // 4. Clasificación no destructiva para mantener tus márgenes manuales del admin
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

        // 5. Impactar la base de datos
        if (inserts.length > 0) {
            const { error: insErr } = await supabase.from('productos').insert(inserts);
            if (insErr) throw insErr;
            console.log(`[OK] Insertados ${inserts.length} artículos nuevos al inventario.`);
        }

        if (updates.length > 0) {
            await Promise.all(updates);
            console.log(`[OK] Actualizados costos de ${updates.length} artículos existentes.`);
        }

        console.log(`\n[PROCESO COMPLETADO] Catálogo unificado y sincronizado con éxito.`);

    } catch (error) {
        console.error(`[Fallo crítico del script]: ${error.message}`);
        process.exit(1);
    }
}

syncCatalog();