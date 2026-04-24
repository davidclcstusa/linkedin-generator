require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const querystring = require('querystring');

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/auth/linkedin/callback';
const SCOPES = 'openid profile w_member_social';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Faltan LINKEDIN_CLIENT_ID o LINKEDIN_CLIENT_SECRET en .env');
    process.exit(1);
}

const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code&` +
    `client_id=${CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(SCOPES)}`;

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost:3000');

    if (url.pathname !== '/auth/linkedin/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
    }

    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
        const desc = url.searchParams.get('error_description') || '';
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>Error: ${error}</h1><p>${desc}</p>`);
        console.error(`\n❌ Error LinkedIn: ${error} — ${desc}`);
        server.close();
        process.exit(1);
    }

    if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>No se recibió código de autorización</h1>');
        server.close();
        process.exit(1);
    }

    const body = querystring.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
    });

    const options = {
        hostname: 'www.linkedin.com',
        path: '/oauth/v2/accessToken',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body)
        }
    };

    const tokenReq = https.request(options, (tokenRes) => {
        let data = '';
        tokenRes.on('data', chunk => { data += chunk; });
        tokenRes.on('end', () => {
            try {
                const tokenData = JSON.parse(data);

                if (tokenData.error) {
                    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`<h1>Error: ${tokenData.error}</h1><p>${tokenData.error_description || ''}</p>`);
                    console.error(`\n❌ Error token: ${tokenData.error}`);
                    server.close();
                    process.exit(1);
                }

                const accessToken = tokenData.access_token;
                const expiresIn = tokenData.expires_in || 5183944;
                const expiresDate = new Date(Date.now() + expiresIn * 1000).toLocaleDateString('es-ES');

                const envPath = path.join(__dirname, '..', '.env');
                let envContent = fs.readFileSync(envPath, 'utf8');

                if (envContent.match(/LINKEDIN_ACCESS_TOKEN=/)) {
                    envContent = envContent.replace(/LINKEDIN_ACCESS_TOKEN=.*/g, `LINKEDIN_ACCESS_TOKEN=${accessToken}`);
                } else {
                    envContent = envContent.trimEnd() + `\nLINKEDIN_ACCESS_TOKEN=${accessToken}\n`;
                }

                fs.writeFileSync(envPath, envContent, 'utf8');

                console.log(`\n✅ Token guardado en .env`);
                console.log(`📅 Expira: ${expiresDate} (~60 días)`);
                console.log(`🔑 Token: ${accessToken.substring(0, 30)}...`);

                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
                    <!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
                    <h1>✅ ¡Autenticación completada!</h1>
                    <p>Token guardado en <code>.env</code></p>
                    <p>Expira: <strong>${expiresDate}</strong></p>
                    <p>Puedes cerrar esta ventana.</p>
                    </body></html>
                `);

                setTimeout(() => { server.close(); process.exit(0); }, 1500);

            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`<h1>Error parseando respuesta</h1><pre>${e.message}</pre>`);
                server.close();
                process.exit(1);
            }
        });
    });

    tokenReq.on('error', (e) => {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>Error de conexión: ${e.message}</h1>`);
        server.close();
        process.exit(1);
    });

    tokenReq.write(body);
    tokenReq.end();
});

server.listen(3000, () => {
    console.log('\n🔗 Abre este enlace en tu navegador para autorizar LinkedIn:\n');
    console.log(authUrl);
    console.log('\n⏳ Esperando respuesta en http://localhost:3000/callback...\n');

    const cmd = `start "" "${authUrl}"`;
    exec(cmd, (err) => {
        if (err) console.log('(Abre el enlace manualmente si el navegador no se abrió solo)');
    });
});
