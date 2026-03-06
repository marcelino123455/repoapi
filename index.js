const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    // Obtenemos la versión más reciente de WA Web para evitar conflictos
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Usando WA v${version.join('.')}, ¿Es la última?: ${isLatest}`);

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        // Reducimos los logs para ver solo lo importante
        logger: pino({ level: 'error' }), 
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async(update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('>> NUEVO QR GENERADO. ESCANEA AHORA:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(`Conexión cerrada por: ${lastDisconnect?.error}. Reconectando en 5s...`);
            
            if (shouldReconnect) {
                setTimeout(() => connectToWhatsApp(), 5000); // Pausa de 5 seg antes de reintentar
            }
        } else if (connection === 'open') {
            console.log('✅ ¡CONEXIÓN EXITOSA!');
            console.log('Esperando estabilización de sesión (10s)...');
            await delay(10000);
            const id = '51900585116@s.whatsapp.net'; // Ejemplo para Perú (51)
            
            const sentMsg = await sock.sendMessage(id, { 
                text: 'Miau miau🚀' 
            });

            console.log('Mensaje enviado con éxito:', sentMsg.key.id);
            
            const tiempoEspera = Math.floor(Math.random() * (2000 - 1000 + 1) + 1000);

            console.log(`Esperando ${tiempoEspera / 1000} segundos...`);
            await delay(tiempoEspera);

            await sock.sendMessage(id, { 
                image: { url: './testing.jpg' }, 
                caption: '¡Mira lo que tenemos para ti! 📸'
            });
        }
    });

    return sock;
}

connectToWhatsApp();