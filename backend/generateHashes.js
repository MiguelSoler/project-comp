const bcrypt = require('bcrypt');

async function generateHash(password) {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log(`Contraseña: ${password} → Hash: ${hash}`);
}

(async () => {
    await generateHash('admin123'); // ejemplo para admin
    await generateHash('usuario123'); // ejemplo para usuario
})();
