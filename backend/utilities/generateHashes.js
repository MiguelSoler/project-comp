require("dotenv").config();
const bcrypt = require("bcrypt");
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS);

if (Number.isNaN(BCRYPT_SALT_ROUNDS)) {
  throw new Error("BCRYPT_SALT_ROUNDS no es un número válido");
}

const passwords = {
  admin: "Admin123!",
  user: "User123!",
  advertiser: "Advertiser123!"
};

(async () => {
  for (const [role, pass] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(pass, BCRYPT_SALT_ROUNDS);
    console.log(`${role}: ${hash}`);
  }
})();
