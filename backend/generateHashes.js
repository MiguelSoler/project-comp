const bcrypt = require("bcrypt");

const passwords = {
  admin: "Admin123!",
  user: "User123!",
  advertiser: "Advertiser123!"
};

(async () => {
  for (const [role, pass] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(pass, 10);
    console.log(`${role}: ${hash}`);
  }
})();
