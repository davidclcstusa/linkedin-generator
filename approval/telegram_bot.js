require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { publicarEnLinkedIn } = require('../publication/linkedin_publisher');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '613921307';
const PROJECT_DIR = path.join(__dirname, '..');

if (!BOT_TOKEN) {
    console.error('❌ Falta TELEGRAM_BOT_TOKEN en .env');
    process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: false });

function leerUltimoBorrador() {
    const outputsDir = path.join(PROJECT_DIR, 'outputs');
    const archivos = fs.readdirSync(outputsDir)
        .filter(f => f.endsWith('_borrador.md'))
        .sort()
        .reverse();

    if (archivos.length === 0) throw new Error('No hay borradores en outputs/');

    const contenido = fs.readFileSync(path.join(outputsDir, archivos[0]), 'utf8');
    const fecha = archivos[0].replace('_borrador.md', '');
    return { contenido, fecha };
}

function extraerBorradores(contenido) {
    const borradores = {};
    const secciones = contenido.split(/\n## BORRADOR /);

    for (const seccion of secciones) {
        const letra = seccion.match(/^([ABC]) —/)?.[1];
        if (!letra) continue;

        let texto = seccion.replace(/^[^\n]+\n/, '');
        texto = texto.split(/\n---/)[0];
        texto = texto.replace(/📊 Longitud:.*\n?/g, '');
        texto = texto.replace(/⚠️ Notas:.*\n?/g, '');
        borradores[letra] = texto.trim();
    }

    return borradores;
}

function guardarEnHistorial(fecha, letra, texto) {
    const historialDir = path.join(PROJECT_DIR, 'historial');
    if (!fs.existsSync(historialDir)) fs.mkdirSync(historialDir);
    const contenido = `# Post aprobado — ${fecha}\nBorrador: ${letra}\n\n${texto}\n`;
    fs.writeFileSync(path.join(historialDir, `${fecha}.md`), contenido, 'utf8');
    console.log(`✅ Guardado en historial/${fecha}.md`);
}

async function enviarBorradores() {
    const { contenido, fecha } = leerUltimoBorrador();
    const borradores = extraerBorradores(contenido);

    if (!borradores.A && !borradores.B && !borradores.C) {
        throw new Error('No se pudieron extraer borradores');
    }

    for (const letra of ['A', 'B', 'C']) {
        if (!borradores[letra]) continue;
        const texto = `── ${letra} ──\n\n${borradores[letra]}`.substring(0, 4000);
        await bot.sendMessage(CHAT_ID, texto);
        await new Promise(r => setTimeout(r, 800));
    }

    const keyboard = [];
    if (borradores.A) keyboard.push([{ text: '✅ Aprobar A', callback_data: `APROBAR_${fecha}_A` }]);
    if (borradores.B) keyboard.push([{ text: '✅ Aprobar B', callback_data: `APROBAR_${fecha}_B` }]);
    if (borradores.C) keyboard.push([{ text: '✅ Aprobar C', callback_data: `APROBAR_${fecha}_C` }]);
    keyboard.push([{ text: '❌ Descartar', callback_data: `DESCARTAR_${fecha}` }]);

    await bot.sendMessage(CHAT_ID, '¿Cuál publicamos?', {
        reply_markup: { inline_keyboard: keyboard }
    });

    console.log('✅ Borradores enviados. Esperando respuesta (máx 2h)...');
    return { borradores, fecha };
}

async function procesarUpdate(update, borradores, fecha) {
    const cq = update.callback_query;
    if (!cq || cq.message.chat.id.toString() !== CHAT_ID.toString()) return false;

    const accion = cq.data;

    if (accion.startsWith('APROBAR_')) {
        const partes = accion.split('_');
        const letra = partes[partes.length - 1];
        const fechaPost = partes.slice(1, -1).join('_');

        const historialPath = path.join(PROJECT_DIR, 'historial', `${fechaPost}.md`);
        if (fs.existsSync(historialPath)) {
            await bot.answerCallbackQuery(cq.id, { text: 'Ya procesado ✅' }).catch(() => {});
            return false;
        }

        guardarEnHistorial(fechaPost, letra, borradores[letra]);
        await bot.answerCallbackQuery(cq.id, { text: `Borrador ${letra} guardado ✅` }).catch(() => {});

        try {
            await bot.editMessageText(
                `✅ Borrador ${letra} guardado.\n\n¿Lo publicamos ahora en LinkedIn?`,
                {
                    chat_id: CHAT_ID,
                    message_id: cq.message.message_id,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🚀 Sí, publicar ahora', callback_data: `PUBLICAR_${fechaPost}_${letra}` }],
                            [{ text: '⏸ No, lo publico yo manualmente', callback_data: `MANUAL_${fechaPost}` }]
                        ]
                    }
                }
            );
        } catch (e) { /* ignorar */ }
        return false; // seguir escuchando para el botón de publicar

    } else if (accion.startsWith('PUBLICAR_')) {
        const partes = accion.split('_');
        const letra = partes[partes.length - 1];

        await bot.answerCallbackQuery(cq.id, { text: 'Publicando...' }).catch(() => {});
        try {
            await bot.editMessageText('⏳ Publicando en LinkedIn...', {
                chat_id: CHAT_ID, message_id: cq.message.message_id
            });
        } catch (e) { /* ignorar */ }

        try {
            const postId = await publicarEnLinkedIn(borradores[letra]);
            console.log(`✅ Publicado en LinkedIn: ${postId}`);
            await bot.sendMessage(CHAT_ID, `✅ Publicado en LinkedIn.\n\nID: ${postId}`);
        } catch (err) {
            console.error('❌ Error publicando:', err.message);
            await bot.sendMessage(CHAT_ID,
                `❌ Error al publicar:\n${err.message}\n\nEl borrador está en historial/ — puedes publicarlo manualmente.`
            );
        }
        return true; // cerrar

    } else if (accion.startsWith('MANUAL_')) {
        await bot.answerCallbackQuery(cq.id, { text: 'Ok, lo publicas tú' }).catch(() => {});
        try {
            await bot.editMessageText('📋 Guardado en historial/. Publícalo cuando quieras.',
                { chat_id: CHAT_ID, message_id: cq.message.message_id }
            );
        } catch (e) { /* ignorar */ }
        return true; // cerrar

    } else if (accion.startsWith('DESCARTAR_')) {
        await bot.answerCallbackQuery(cq.id, { text: 'Descartado' }).catch(() => {});
        try {
            await bot.editMessageText('🗑️ Descartado. No se publica nada hoy.',
                { chat_id: CHAT_ID, message_id: cq.message.message_id }
            );
        } catch (e) { /* ignorar */ }
        return true; // cerrar
    }

    return false;
}

async function esperarRespuesta(borradores, fecha) {
    let offset = 0;

    // Procesar updates pendientes recientes (ignorar callbacks de más de 10 min)
    try {
        const updates = await bot.getUpdates({ timeout: 0, limit: 100 });
        const ahoraTs = Math.floor(Date.now() / 1000);
        for (const update of updates) {
            offset = update.update_id + 1;
            const ts = update.callback_query?.message?.date || update.message?.date || 0;
            if (ahoraTs - ts > 600) continue; // ignorar si tiene más de 10 min
            const cerrar = await procesarUpdate(update, borradores, fecha);
            if (cerrar) { console.log('✅ Completado. Cerrando.'); process.exit(0); }
        }
    } catch (e) { /* ignorar */ }

    const deadline = Date.now() + 2 * 60 * 60 * 1000;

    while (Date.now() < deadline) {
        try {
            const updates = await bot.getUpdates({ offset, timeout: 0, limit: 10 });

            for (const update of updates) {
                offset = update.update_id + 1;
                const cerrar = await procesarUpdate(update, borradores, fecha);
                if (cerrar) { console.log('✅ Completado. Cerrando.'); process.exit(0); }
            }
        } catch (err) {
            // Ignorar errores transitorios
        }

        await new Promise(r => setTimeout(r, 3000));
    }

    console.log('⏰ Timeout 2h. Sin respuesta. Cerrando.');
    process.exit(0);
}

async function main() {
    const { borradores, fecha } = await enviarBorradores();
    await esperarRespuesta(borradores, fecha);
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
