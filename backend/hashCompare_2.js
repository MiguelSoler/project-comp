const bcrypt = require("bcrypt");

(async () => {
  const hash = await bcrypt.hash("Advertiser123!", 10);
  console.log(hash);

  const ok = await bcrypt.compare("Advertiser123!", hash);
  console.log("MATCH:", ok);
})();
