require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '613921307';
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_PERSON_URN = process.env.LINKEDIN_PERSON_URN;
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // ej: https://tu-app.railway.app

if (!BOT_TOKEN) { console.error('Falta TELEGRAM_BOT_TOKEN'); process.exit(1); }

// ── Telegram API helpers ──────────────────────────────────────────────────────

function telegramRequest(method, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = https.request({
            hostname: 'api.telegram.org',
            path: `/bot${BOT_TOKEN}/${method}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        }, res => {
            let raw = '';
            res.on('data', c => raw += c);
            res.on('end', () => resolve(JSON.parse(raw)));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

const sendMessage = (text, extra = {}) =>
    telegramRequest('sendMessage', { chat_id: CHAT_ID, text, ...extra });

const answerCallback = (id, text) =>
    telegramRequest('answerCallbackQuery', { callback_query_id: id, text });

const editMessage = (messageId, text, extra = {}) =>
    telegramRequest('editMessageText', { chat_id: CHAT_ID, message_id: messageId, text, ...extra });

// ── GitHub raw content ────────────────────────────────────────────────────────

function leerBorradoresDeGitHub(fecha) {
    return new Promise((resolve, reject) => {
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const options = {
            hostname: 'api.github.com',
            path: `/repos/davidclcstusa/linkedin-generator/contents/outputs/${fecha}_borrador.md`,
            method: 'GET',
            headers: {
                'User-Agent': 'linkedin-generator-bot',
                'Accept': 'application/vnd.github.raw+json',
                ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {})
            }
        };
        https.get(options, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode !== 200) return reject(new Error(`GitHub ${res.statusCode}: ${fecha}_borrador.md`));
                resolve(extraerBorradores(data));
            });
        }).on('error', reject);
    });
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

// ── LinkedIn publisher ────────────────────────────────────────────────────────

function publicarEnLinkedIn(texto) {
    return new Promise((resolve, reject) => {
        if (!LINKEDIN_ACCESS_TOKEN) return reject(new Error('Falta LINKEDIN_ACCESS_TOKEN'));
        const authorUrn = LINKEDIN_PERSON_URN || 'urn:li:person:M77KqEbPeE';
        const body = JSON.stringify({
            author: authorUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
                'com.linkedin.ugc.ShareContent': {
                    shareCommentary: { text: texto },
                    shareMediaCategory: 'NONE'
                }
            },
            visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
        });
        const req = https.request({
            hostname: 'api.linkedin.com',
            path: '/v2/ugcPosts',
            method: 'POST',
            headers: {
                Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'X-Restli-Protocol-Version': '2.0.0'
            }
        }, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                const parsed = JSON.parse(data);
                if (res.statusCode >= 400) return reject(new Error(`LinkedIn ${res.statusCode}: ${JSON.stringify(parsed)}`));
                resolve(parsed.id);
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ── Procesar callback de Telegram ─────────────────────────────────────────────

async function procesarCallback(cq) {
    if (cq.message.chat.id.toString() !== CHAT_ID.toString()) return;

    const accion = cq.data;
    const msgId = cq.message.message_id;

    if (accion.startsWith('APROBAR_')) {
        const partes = accion.split('_');
        const letra = partes[partes.length - 1];
        const fecha = partes.slice(1, -1).join('_');

        await answerCallback(cq.id, `Borrador ${letra} seleccionado ✅`);

        let borradores;
        try {
            borradores = await leerBorradoresDeGitHub(fecha);
        } catch (e) {
            await sendMessage(`❌ No pude leer el borrador de GitHub: ${e.message}`);
            return;
        }

        if (!borradores[letra]) {
            await sendMessage(`❌ No encontré el Borrador ${letra} en el archivo.`);
            return;
        }

        await editMessage(msgId, `✅ Borrador ${letra} seleccionado.\n\n¿Lo publicamos en LinkedIn?`, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🚀 Sí, publicar ahora', callback_data: `PUBLICAR_${fecha}_${letra}` }],
                    [{ text: '⏸ No, lo publico yo manualmente', callback_data: `MANUAL_${fecha}` }]
                ]
            }
        });

    } else if (accion.startsWith('PUBLICAR_')) {
        const partes = accion.split('_');
        const letra = partes[partes.length - 1];
        const fecha = partes.slice(1, -1).join('_');

        await answerCallback(cq.id, 'Publicando...');
        await editMessage(msgId, '⏳ Publicando en LinkedIn...');

        let borradores;
        try {
            borradores = await leerBorradoresDeGitHub(fecha);
        } catch (e) {
            await sendMessage(`❌ Error leyendo borrador: ${e.message}`);
            return;
        }

        try {
            const postId = await publicarEnLinkedIn(borradores[letra]);
            await sendMessage(`✅ Publicado en LinkedIn.\n\nID: ${postId}`);
            console.log(`✅ Publicado: ${postId}`);
        } catch (err) {
            console.error('❌ Error publicando:', err.message);
            await sendMessage(`❌ Error al publicar:\n${err.message}\n\nEl borrador está en GitHub.`);
        }

    } else if (accion.startsWith('MANUAL_')) {
        await answerCallback(cq.id, 'Ok, lo publicas tú');
        await editMessage(msgId, '📋 Guardado en GitHub. Publícalo cuando quieras.');

    } else if (accion.startsWith('DESCARTAR_')) {
        await answerCallback(cq.id, 'Descartado');
        await editMessage(msgId, '🗑️ Descartado. No se publica nada hoy.');
    }
}

// ── Servidor HTTP (webhook) ───────────────────────────────────────────────────

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200);
        res.end('LinkedIn Bot activo ✅');
        return;
    }

    if (req.method !== 'POST' || req.url !== '/webhook') {
        res.writeHead(404);
        res.end();
        return;
    }

    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
        res.writeHead(200);
        res.end('ok');

        try {
            const update = JSON.parse(body);
            if (update.callback_query) {
                await procesarCallback(update.callback_query);
            }
        } catch (e) {
            console.error('Error procesando update:', e.message);
        }
    });
});

server.listen(PORT, async () => {
    console.log(`Bot webhook escuchando en puerto ${PORT}`);

    if (WEBHOOK_URL) {
        const result = await telegramRequest('setWebhook', { url: `${WEBHOOK_URL}/webhook` });
        console.log('Webhook configurado:', result.ok ? '✅' : `❌ ${result.description}`);
    } else {
        console.log('⚠️ WEBHOOK_URL no definida — configúrala en las variables de entorno de Railway');
    }
});
