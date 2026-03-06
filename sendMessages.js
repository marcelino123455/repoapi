const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connectToWhatsApp(numbers) {

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Usando WA v${version.join('.')}, ¿Es la última?: ${isLatest}`);

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'error' }),
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('>> NUEVO QR GENERADO. ESCANEA:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {

            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log('Conexión cerrada...');

            if (shouldReconnect) {
                setTimeout(() => connectToWhatsApp(numbers), 5000);
            }

        } else if (connection === 'open') {

            console.log('✅ Conectado a WhatsApp');
            console.log('Esperando estabilización (10s)...');

            await delay(10000);

            for (const number of numbers) {

                try {

                    const id = number.replace(/\D/g, '') + '@s.whatsapp.net';

                    console.log(`Enviando mensaje a ${number}`);

                    const sentMsg = await sock.sendMessage(id, {
                        text: 'Miau miau 🚀'
                    });

                    console.log('Mensaje enviado:', sentMsg.key.id);

                    const tiempoEntreMensajes =
                        Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;

                    console.log(`Esperando ${tiempoEntreMensajes / 1000}s antes de enviar imagen`);

                    await delay(tiempoEntreMensajes);

                    await sock.sendMessage(id, {
                        image: { url: './testing.jpg' },
                        caption: '¡Mira lo que tenemos para ti! 📸'
                    });

                    const tiempoEntreContactos =
                        Math.floor(Math.random() * (15000 - 8000 + 1)) + 8000;

                    console.log(`Esperando ${tiempoEntreContactos / 1000}s antes del siguiente número`);

                    await delay(tiempoEntreContactos);

                } catch (err) {
                    console.log(`Error enviando a ${number}`, err);
                }

            }

            console.log('🚀 Todos los mensajes enviados');

        }

    });

    return sock;
}


// ARRAY DE NUMEROS
const numeros = [
    '51972355676',
    '51972355676',
    '51972355676'
];

connectToWhatsApp(numeros);