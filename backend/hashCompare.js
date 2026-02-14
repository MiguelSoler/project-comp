const bcrypt = require("bcrypt");

const hash = "<$2b$10$CLx0cM2xxBXBeJFgUq.B9OjTzjwjdttMvwpkKADWlVwla61QyLPb2>";

bcrypt.compare("Advertiser123!", hash).then((ok) => {
  console.log("MATCH:", ok);
});
