require('dotenv').config({ path: __dirname + '/.env' });
const { Client } = require('pg');
const net = require('net');

async function checkPort(host, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(2000);

        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.on('error', () => {
            resolve(false);
        });

        socket.connect(port, host);
    });
}

async function testConnection() {
    const host = process.env.PGHOST;
    const port = parseInt(process.env.PGPORT, 10);

    console.log("🔍 Probando conexión a PostgreSQL...");
    console.log(`📡 Host: ${host}`);
    console.log(`📡 Puerto: ${port}`);
    console.log(`📡 Base de datos: ${process.env.PGDATABASE}`);
    console.log(`📡 Usuario: ${process.env.PGUSER}`);

    const portOpen = await checkPort(host, port);

    if (!portOpen) {
        console.error(`❌ El puerto ${port} en ${host} está cerrado o PostgreSQL no está escuchando.`);
        return;
    }

    console.log(`✅ El puerto ${port} está abierto. Intentando conexión a PostgreSQL...`);

    const client = new Client({
        user: process.env.PGUSER,
        host: host,
        database: process.env.PGDATABASE,
        password: process.env.PGPASSWORD,
        port: port
    });

    try {
        await client.connect();
        console.log("✅ Conexión exitosa a PostgreSQL");
        const res = await client.query('SELECT NOW()');
        console.log("🕒 Hora del servidor:", res.rows[0].now);
    } catch (err) {
        console.error("❌ Error de conexión:", err.message);
    } finally {
        await client.end();
        console.log("🔒 Conexión cerrada");
    }
}

testConnection();
