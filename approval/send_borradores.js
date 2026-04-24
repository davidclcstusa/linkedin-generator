require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '613921307';
const PROJECT_DIR = path.join(__dirname, '..');

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

async function main() {
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

    console.log('✅ Borradores enviados a Telegram. Railway se encarga del resto.');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
