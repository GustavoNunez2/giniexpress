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
    console.log(`[${new Date().toISOString()}] Iniciando sincronización inteligente...`);
    try {
        // 1. Obtener el estado actual de tu catálogo en Supabase para contrastar en memoria
        const { data: dbProducts, error: dbError } = await supabase
            .from('productos')
            .select('id, titulo, precio, porcentaje_ganancia, precio_costo');
        
        if (dbError) throw dbError;
        const localMap = new Map(dbProducts?.map(p => [p.titulo, p]) || []);

        // 2. Descargar y normalizar el stream de datos del proveedor
        const response = await fetch(PROVIDER_URL);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const html = await response.text();
        let cleanText = html.replace(/[\n\r\t]/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

        let scrapedProducts = [];
        const productRegex = /"(name|title)"\s*:\s*"([^"]+)"/g;
        let match;

        // 3. Extracción de tokens por proximidad
        while ((match = productRegex.exec(cleanText)) !== null) {
            const titulo = match[2].trim();

            if (titulo.toLowerCase().includes("braja express") || 
                titulo.toLowerCase().includes("catálogo") || 
                titulo.toLowerCase() === "dashboard" ||
                titulo.length < 2 || titulo.length > 85) {
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
                const descripcion = descMatch ? descMatch[1].trim() : '';
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

        if (scrapedProducts.length === 0) throw new Error("No se extrajeron datos del proveedor.");

        // 4. Clasificación de operaciones (Evita el vaciado destructivo de la tabla)
        let inserts = [];
        let updates = [];

        for (const item of scrapedProducts) {
            if (localMap.has(item.titulo)) {
                // El producto ya existe: preservamos su margen personalizado del admin panel
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
                // Producto nuevo del mayorista: aplica margen por defecto
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

        // 5. Ejecutar operaciones en Supabase
        if (inserts.length > 0) {
            const { error: insErr } = await supabase.from('productos').insert(inserts);
            if (insErr) throw insErr;
            console.log(`Insertados ${inserts.length} productos nuevos.`);
        }

        if (updates.length > 0) {
            await Promise.all(updates);
            console.log(`Actualizados ${updates.length} productos existentes de forma no destructiva.`);
        }

        console.log(`[Sincronización Exitosa] Proceso completado sin alteración de márgenes personalizados.`);

    } catch (error) {
        console.error(`[Fallo crítico del script]: ${error.message}`);
        process.exit(1);
    }
}

syncCatalog();