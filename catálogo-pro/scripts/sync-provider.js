import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import 'dotenv/config';

const PROVIDER_URL = 'https://catalogo.treinta.co/brajaexpress-e8aefd?sort=name-asc';
const DEFAULT_MARGIN = 15;

const limpiarTitulo = (t) => {
    if (!t) return "";
    return t.toString()
        .toLowerCase()
        .normalize("NFD") // Descompone caracteres con acentos
        .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
        .replace(/[^a-z0-9\s]/g, "") // Conserva espacios para evitar colisiones erróneas
        .replace(/\s+/g, "") // Elimina espacios al final para la comparación
        .trim();
};

const { SUPABASE_URL, SUPABASE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
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

async function notificarCambios(cantidadNuevos, cantidadModificados) {
    const hora = new Date().getHours();

    // Franja de silencio local: 01:00 a 08:00
    if (hora >= 1 && hora < 8) return;
    if (cantidadNuevos === 0 && cantidadModificados === 0) return;

    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

    if (!token || !chatId) {
        console.warn("⚠️ Notificación omitida: Faltan credenciales de Telegram.");
        return;
    }

    // Formateo limpio en HTML (A prueba de balas)
    const mensaje = `🚨 <b>Actualización GINI EXPRESS</b>\n\n` +
        `✅ Nuevos: <b>${cantidadNuevos}</b>\n` +
        `🔄 Cambios de precio: <b>${cantidadModificados}</b>\n\n` +
        `🔗 https://gustavonunez2.github.io/giniexpress/admin.html`;

    const baseUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const params = new URLSearchParams({
        chat_id: chatId,
        text: mensaje,
        parse_mode: 'HTML' // <--- HTML no se rompe con caracteres raros
    });

    fetch(`${baseUrl}?${params.toString()}`)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            console.log("✅ Notificación enviada a Telegram de manera exitosa.");
        })
        .catch(e => {
            console.error("❌ Falló el envío a Telegram:", e.message);
        });
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
                .select('id, titulo, precio, porcentaje_ganancia, precio_costo, precio_fijo, disponible')
                .order('id')
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

        const localMap = new Map(dbProducts.map(p => [limpiarTitulo(p.titulo), p]));

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

        const { data: stagingActual } = await supabase
            .from('staging_products')
            .select('producto_id, titulo, tipo_cambio')
            .eq('procesado', false);

        const alertasExistentes = new Set(
            (stagingActual || []).map(a => {
                const claveObj = a.producto_id ? a.producto_id : limpiarTitulo(a.titulo);
                return `${claveObj}-${a.tipo_cambio}`;
            })
        );

        // ════════════════════════════════════════════════════════════════════════
        // 🔄 PROCESAR CAMBIOS: Productos modificados, nuevos y eliminados
        // ════════════════════════════════════════════════════════════════════════
        for (const item of finalScraped) {
            const key = limpiarTitulo(item.titulo);
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

                    // 📝 Registrar en staging para auditoría (Evitando duplicados)
                    const claveAlerta = `${localItem.id}-PRECIO_MODIFICADO`;
                    if (!alertasExistentes.has(claveAlerta)) {
                        registrosAuditoria.push({
                            producto_id: localItem.id,
                            titulo: localItem.titulo,
                            tipo_cambio: 'PRECIO_MODIFICADO',
                            costo_anterior: localItem.precio_costo,
                            costo_nuevo: item.precioCosto,
                            margen_porcentaje: parseFloat(margenPorcentaje.toFixed(2)),
                            venta_sugerida: ventaSugerida,
                            created_at: new Date().toISOString(),
                            imagen_url_nueva: item.imagen_url
                        });
                        console.log(`📌 [ACTUALIZADO] ${localItem.titulo}: $${localItem.precio_costo} → $${item.precioCosto} | Margen: ${margenPorcentaje.toFixed(2)}% | Venta sugerida: $${ventaSugerida}`);
                    } else {
                        console.log(`ℹ️ Alerta de cambio de precio para ${localItem.titulo} ya existe en staging, ignorando duplicado.`);
                    }
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

                const claveAlerta = `${limpiarTitulo(item.titulo)}-NUEVO`;
                if (!alertasExistentes.has(claveAlerta)) {
                    registrosAuditoria.push({
                        producto_id: null, // Sin ID porque aún no está en tabla principal
                        titulo: item.titulo,
                        tipo_cambio: 'NUEVO',
                        costo_anterior: null,
                        costo_nuevo: item.precioCosto,
                        margen_porcentaje: margenBase,
                        venta_sugerida: ventaSugerida,
                        created_at: new Date().toISOString(),
                        imagen_url_nueva: item.imagen_url
                    });

                    console.log(`✨ [NUEVO] ${item.titulo}: $${item.precioCosto} | Margen sugerido: ${margenBase}% | Venta sugerida: $${ventaSugerida}`);
                } else {
                    console.log(`ℹ️ Alerta de NUEVO para ${item.titulo} ya existe en staging, ignorando duplicado.`);
                }
            }
        }

        // ════════════════════════════════════════════════════════════════════════
        // 🗑️ DETECTAR PRODUCTOS ELIMINADOS (Con Freno de Emergencia)
        // ════════════════════════════════════════════════════════════════════════
        const scrapedTitles = new Set(finalScraped.map(p => limpiarTitulo(p.titulo)));

        // Si el scraper capturó menos del 70% de lo que hay en BD, ABORTAR eliminación
        if (finalScraped.length < (localMap.size * 0.7)) {
            console.warn(`🚨 ALERTA: Scraper capturó solo ${finalScraped.length} productos (BD tiene ${localMap.size}).`);
            console.warn("🛑 Freno de emergencia activado: Omitiendo detección de productos eliminados.");
        } else {
            for (const [key, localItem] of localMap) {
                if (!scrapedTitles.has(key)) {
                    const claveAlerta = `${localItem.id}-ELIMINADO`;

                    if (!alertasExistentes.has(claveAlerta)) {
                        registrosAuditoria.push({
                            producto_id: localItem.id,
                            titulo: localItem.titulo,
                            tipo_cambio: 'ELIMINADO',
                            costo_anterior: localItem.precio_costo,
                            costo_nuevo: null,
                            margen_porcentaje: null,
                            venta_sugerida: null,
                            created_at: new Date().toISOString()
                        });
                        console.log(`🗑️  [ELIMINADO] ${localItem.titulo} (realmente no está)`);
                    } else {
                        console.log(`ℹ️ Alerta de ELIMINADO para ${localItem.titulo} ya existe en staging, ignorando duplicado.`);
                    }

                    // 🔄 OCULTAR PRODUCTO EN TABLA PRINCIPAL INMEDIATAMENTE
                    actualizarProductos.push({
                        id: localItem.id,
                        updates: {
                            disponible: false
                        }
                    });
                }
            }
        }

        // ════════════════════════════════════════════════════════════════════════
        // 💾 APLICAR CAMBIOS: SOLO EN AUDITORÍA (PILOTO AUTOMÁTICO DESACTIVADO)
        // ════════════════════════════════════════════════════════════════════════

        // 1️⃣ Guardar registros de auditoría en staging_products (SÍ SE HACE)
        if (registrosAuditoria.length > 0) {
            console.log(`\n📋 Registrando ${registrosAuditoria.length} cambios en auditoría...`);
            const { error: auditError } = await supabase
                .from('staging_products')
                .insert(registrosAuditoria);

            if (auditError) {
                console.error(`⚠️ Error al guardar auditoría: ${auditError.message}`);
            } else {
                console.log(`✅ Auditoría guardada exitosamente`);
            }
        }

        // 2️⃣ Aplicar actualizaciones automáticas (Hiding de bajas)
        if (actualizarProductos.length > 0) {
            console.log(`\n⚙️  Procesando ${actualizarProductos.length} actualizaciones en tabla principal...`);
            let updatePromises = [];
            for (const { id, updates } of actualizarProductos) {
                updatePromises.push(
                    supabase.from('productos').update(updates).eq('id', id)
                );
            }
            for (let i = 0; i < updatePromises.length; i += 50) {
                const batch = updatePromises.slice(i, i + 50);
                await Promise.all(batch);
            }
            console.log(`✅ Tabla principal sincronizada (Bajas procesadas)`);
        }

        console.log("ℹ️ Los cambios de PRECIO siguen requiriendo aprobación manual en el panel de control.");

        // ════════════════════════════════════════════════════════════════════════
        // 📊 RESUMEN FINAL Y NOTIFICACIÓN
        // ════════════════════════════════════════════════════════════════════════

        // 1. Calculamos los totales ANTES del log final
        const nuevos = registrosAuditoria.filter(r => r.tipo_cambio === 'NUEVO').length;
        const modificados = registrosAuditoria.filter(r => r.tipo_cambio === 'PRECIO_MODIFICADO').length;

        // 2. Disparamos la notificación a Telegram
        await notificarCambios(nuevos, modificados);
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