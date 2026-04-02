const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeExt(filename) {
  const ext = path.extname(filename || "").toLowerCase();
  return ext || ".jpg";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(
      __dirname,
      "..",
      "..",
      "uploads",
      "perfiles"
    );

    try {
      ensureDir(uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = sanitizeExt(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

function fileFilter(req, file, cb) {
  if (!file.mimetype?.startsWith("image/")) {
    return cb(new Error("INVALID_FILE_TYPE"));
  }

  cb(null, true);
}

const uploadPerfilPhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

module.exports = {
  uploadPerfilPhoto,
};