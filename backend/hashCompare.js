const bcrypt = require("bcrypt");

const hash = "$2b$10$BIt4yvuTCyZQqMyODE4uN.3lsg8Y0MeBRPd5z6pT07R8rOXInp/Ju";

bcrypt.compare("Advertiser123!", hash).then((ok) => {
  console.log("MATCH:", ok);
});
