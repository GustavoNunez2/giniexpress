import { createClient } from '@supabase/supabase-js';

// Configuración de Negocio
const PROVIDER_URL = 'https://catalogo.treinta.co/brajaexpress-e8aefd';
const PROFIT_MARGIN = 1.15; // 15% de ganancia sobre el costo del proveedor

// Configuración de Entorno (GitHub Secrets)
const { SUPABASE_URL, SUPABASE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Faltan las credenciales de Supabase en las variables de entorno.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncCatalog() {
    console.log(`[${new Date().toISOString()}] Iniciando sincronización desde: ${PROVIDER_URL}`);

    try {
        // 1. Descargar HTML del proveedor
        const response = await fetch(PROVIDER_URL);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const html = await response.text();

        // 2. Normalización radical del flujo de datos
        // Eliminamos saltos de línea y normalizamos escapes de JSON para tratarlo como texto plano puro
        let cleanText = html.replace(/[\n\r\t]/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

        let extractedProducts = [];
        
        // 3. Bucle iterativo de identificación de productos
        // Buscamos patrones de nombres/títulos como anclas principales
        const productRegex = /"(name|title)"\s*:\s*"([^"]+)"/g;
        let match;

        while ((match = productRegex.exec(cleanText)) !== null) {
            const titulo = match[2].trim();
            
            // Filtrar ruidos del sistema (nombres de tienda, llaves de configuración, etc.)
            if (titulo.toLowerCase().includes("braja express") || 
                titulo.toLowerCase().includes("catálogo") || 
                titulo.toLowerCase() === "dashboard" ||
                titulo.length < 2 || 
                titulo.length > 85) {
                continue;
            }

            // 4. Ventana de Proximidad (1800 caracteres)
            // Extraemos un bloque de texto después del nombre para buscar sus atributos vinculados
            const startIdx = match.index;
            const endIdx = Math.min(cleanText.length, match.index + 1800);
            const chunk = cleanText.substring(startIdx, endIdx);

            // Extracción de Precio (soporta price, price_amount o priceAmount)
            const priceMatch = chunk.match(/"price"\s*:\s*"?([0-9]+)"?/i) || 
                               chunk.match(/"price_amount"\s*:\s*"?([0-9]+)"?/i) ||
                               chunk.match(/"priceAmount"\s*:\s*"?([0-9]+)"?/i);

            // Extracción de Descripción
            const descMatch = chunk.match(/"description"\s*:\s*"([^"]*?)"/i) || 
                              chunk.match(/"desc"\s*:\s*"([^"]*?)"/i);

            // Extracción de Imagen (soporta múltiples llaves de URL)
            const imgMatch = chunk.match(/"image"\s*:\s*"([^"]+?)"/i) || 
                             chunk.match(/"imageUrl"\s*:\s*"([^"]+?)"/i) || 
                             chunk.match(/"url"\s*:\s*"([^"]+?)"/i);

            if (priceMatch) {
                // 5. Aplicación de Margen de Ganancia y Normalización
                const precioOriginal = parseFloat(priceMatch[1]);
                const precioFinal = Math.round(precioOriginal * PROFIT_MARGIN);
                const descripcion = descMatch ? descMatch[1].trim() : '';
                let imagen_url = imgMatch ? imgMatch[1].trim() : '';

                // Corrección de URLs de imagen relativas
                if (imagen_url && !imagen_url.startsWith('http')) {
                    if (imagen_url.startsWith('//')) imagen_url = 'https:' + imagen_url;
                    else if (imagen_url.startsWith('/')) imagen_url = 'https://catalogo.treinta.co' + imagen_url;
                }

                // Evitar duplicados en la misma tanda por título
                if (precioFinal > 0 && !extractedProducts.some(p => p.titulo === titulo)) {
                    extractedProducts.push({ 
                        titulo, 
                        precio: precioFinal, 
                        descripcion, 
                        imagen_url 
                    });
                }
            }
        }

        if (extractedProducts.length === 0) {
            throw new Error("El escaneo radical no detectó productos. Es posible que la estructura del stream haya cambiado drásticamente.");
        }

        console.log(`Se encontraron ${extractedProducts.length} productos. Actualizando base de datos...`);

        /**
         * 3. Estrategia de Sincronización: Limpiar e Insertar
         * En un entorno gratuito, es más rápido borrar y reinsertar que hacer 100 upserts individuales.
         * Usamos una transacción simulada (Delete + Insert).
         */
        
        // Paso A: Borrar productos actuales (opcional, podrías usar upsert si tienes IDs fijos)
        const { error: deleteError } = await supabase
            .from('productos')
            .delete()
            .neq('id', 0); // Borra todo

        if (deleteError) throw deleteError;

        // Paso B: Inserción masiva
        const { error: insertError } = await supabase
            .from('productos')
            .insert(extractedProducts);

        if (insertError) throw insertError;

        console.log(`[Éxito] Catálogo actualizado correctamente con ${extractedProducts.length} productos.`);

    } catch (error) {
        console.error(`[Error de Sincronización]: ${error.message}`);
        process.exit(1);
    }
}

syncCatalog();