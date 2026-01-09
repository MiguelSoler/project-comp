require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
   user: process.env.PGUSER,
   host: process.env.PGHOST,
   database: process.env.PGDATABASE,
   password: process.env.PGPASSWORD,
   port: process.env.PGPORT
});

async function test() {
   try {
       await client.connect();
       console.log("✅ Conexión exitosa a PostgreSQL");
       const res = await client.query('SELECT NOW()');
       console.log(res.rows);
   } catch (err) {
       console.error("❌ Error de conexión:", err);
   } finally {
       await client.end();
   }
}

test();
