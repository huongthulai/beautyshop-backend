const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.resolve(__dirname, "../../tmp");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-products${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const isCsv =
    file.mimetype === "text/csv" ||
    file.originalname.toLowerCase().endsWith(".csv");

  if (!isCsv) {
    return cb(new Error("Chỉ cho phép file CSV"));
  }

  cb(null, true);
};

const csvUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

module.exports = csvUpload;