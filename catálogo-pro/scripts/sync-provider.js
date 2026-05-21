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
        let actualizarProductos = [];      // Para UPDATE en tabla principal
        let insertarProductosNuevos = []; // Para INSERT en tabla principal (cuando sea)
        let registrosAuditoria = [];       // Para INSERT en staging_products

        // ════════════════════════════════════════════════════════════════════════
        // 🔄 PROCESAR CAMBIOS: Productos modificados, nuevos y eliminados
        // ════════════════════════════════════════════════════════════════════════
        for (const item of finalScraped) {
            const key = item.titulo.toLowerCase();
            if (localMap.has(key)) {
                // ✅ PRODUCTO EXISTENTE - Comparar cambios
                const localItem = localMap.get(key);
                const costoCambio = item.precioCosto !== localItem.precio_costo;

                if (costoCambio) {
                    // 📊 CALCULAR NUEVO PRECIO CON MARGEN INTELIGENTE
                    let margenPorcentaje = localItem.porcentaje_ganancia || DEFAULT_MARGIN;
                    
                    // Si existe precio fijo, calcular el margen actual
                    if (localItem.precio_fijo && localItem.precio_fijo > 0 && localItem.precio_costo > 0) {
                        margenPorcentaje = ((localItem.precio_fijo / localItem.precio_costo) - 1) * 100;
                    }

                    const ventaSugerida = Math.round(
                        item.precioCosto * (1 + margenPorcentaje / 100)
                    );

                    // 🔄 Actualizar tabla principal
                    actualizarProductos.push({
                        id: localItem.id,
                        updates: {
                            precio_costo: item.precioCosto,
                            precio: ventaSugerida,
                            imagen_url: item.imagen_url
                        }
                    });

                    // 📝 Registrar en staging para auditoría
                    registrosAuditoria.push({
                        producto_id: localItem.id,
                        titulo: localItem.titulo,
                        tipo_cambio: 'PRECIO_MODIFICADO',
                        costo_anterior: localItem.precio_costo,
                        costo_nuevo: item.precioCosto,
                        margen_porcentaje: parseFloat(margenPorcentaje.toFixed(2)),
                        venta_sugerida: ventaSugerida,
                        timestamp: new Date().toISOString()
                    });

                    console.log(`📌 [ACTUALIZADO] ${localItem.titulo}: $${localItem.precio_costo} → $${item.precioCosto} | Margen: ${margenPorcentaje.toFixed(2)}% | Venta sugerida: $${ventaSugerida}`);
                } else {
                    // Solo actualizar imagen si cambió
                    if (localItem.imagen_url !== item.imagen_url) {
                        actualizarProductos.push({
                            id: localItem.id,
                            updates: {
                                imagen_url: item.imagen_url
                            }
                        });
                    }
                }
            } else {
                // ✨ PRODUCTO NUEVO - Registrar en staging, no en tabla principal
                const margenBase = 40; // 40% de ganancia por defecto
                const ventaSugerida = Math.round(
                    item.precioCosto * (1 + margenBase / 100)
                );

                registrosAuditoria.push({
                    producto_id: null, // Sin ID porque aún no está en tabla principal
                    titulo: item.titulo,
                    tipo_cambio: 'NUEVO',
                    costo_anterior: null,
                    costo_nuevo: item.precioCosto,
                    margen_porcentaje: margenBase,
                    venta_sugerida: ventaSugerida,
                    timestamp: new Date().toISOString(),
                    imagen_url: item.imagen_url
                });

                console.log(`✨ [NUEVO] ${item.titulo}: $${item.precioCosto} | Margen sugerido: ${margenBase}% | Venta sugerida: $${ventaSugerida}`);
            }
        }

        // ════════════════════════════════════════════════════════════════════════
        // 🗑️ DETECTAR PRODUCTOS ELIMINADOS (En BD local pero no en scraping)
        // ════════════════════════════════════════════════════════════════════════
        const scrapedTitles = new Set(finalScraped.map(p => p.titulo.toLowerCase()));
        for (const [key, localItem] of localMap) {
            if (!scrapedTitles.has(key)) {
                registrosAuditoria.push({
                    producto_id: localItem.id,
                    titulo: localItem.titulo,
                    tipo_cambio: 'ELIMINADO',
                    costo_anterior: localItem.precio_costo,
                    costo_nuevo: null,
                    margen_porcentaje: null,
                    venta_sugerida: null,
                    timestamp: new Date().toISOString()
                });

                console.log(`🗑️  [ELIMINADO] ${localItem.titulo} (ya no disponible en proveedor)`);
            }
        }

        // ════════════════════════════════════════════════════════════════════════
        // 💾 APLICAR CAMBIOS: 1) Auditoría, 2) Actualizaciones de precios
        // ════════════════════════════════════════════════════════════════════════

        // 1️⃣ Guardar registros de auditoría en staging_products
        if (registrosAuditoria.length > 0) {
            console.log(`\n📋 Registrando ${registrosAuditoria.length} cambios en auditoría...`);
            const { error: auditError } = await supabase
                .from('staging_products')
                .insert(registrosAuditoria);
            
            if (auditError) {
                console.error(`⚠️  Error al guardar auditoría: ${auditError.message}`);
            } else {
                console.log(`✅ Auditoría guardada exitosamente`);
            }
        }

        // 2️⃣ Actualizar precios en tabla principal (PILOTO AUTOMÁTICO)
        if (actualizarProductos.length > 0) {
            console.log(`\n⚙️  Actualizando ${actualizarProductos.length} productos en tabla principal...`);
            
            let updatePromises = [];
            for (const { id, updates } of actualizarProductos) {
                updatePromises.push(
                    supabase.from('productos').update(updates).eq('id', id)
                );
            }

            // Procesar actualizaciones en lotes de 50
            for (let i = 0; i < updatePromises.length; i += 50) {
                const batch = updatePromises.slice(i, i + 50);
                const results = await Promise.all(batch);
                
                const errors = results.filter(r => r.error);
                if (errors.length > 0) {
                    console.error(`⚠️  ${errors.length} errores en lote de actualizaciones`);
                    errors.forEach(e => console.error(`   → ${e.error.message}`));
                }
            }

            console.log(`✅ Productos actualizados con piloto automático`);
        }

        // 📊 RESUMEN FINAL
        console.log(`\n${'═'.repeat(70)}`);
        console.log(`[SINCRO COMPLETADA]`);
        console.log(`├─ Cambios registrados en auditoría: ${registrosAuditoria.length}`);
        console.log(`├─ Productos actualizados: ${actualizarProductos.length}`);
        console.log(`├─ Nuevos productos (en staging): ${registrosAuditoria.filter(r => r.tipo_cambio === 'NUEVO').length}`);
        console.log(`├─ Productos eliminados: ${registrosAuditoria.filter(r => r.tipo_cambio === 'ELIMINADO').length}`);
        console.log(`└─ Total de cambios detectados: ${registrosAuditoria.filter(r => r.tipo_cambio === 'PRECIO_MODIFICADO').length} modificaciones`);
        console.log(`${'═'.repeat(70)}\n`);
    } catch (error) {
        console.error(`[Error]: ${error.message}`);
        if (browser) await browser.close();
        process.exit(1);
    }
}

syncCatalog();