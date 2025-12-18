const axios = require("axios");
const { uploadToCloudinary } = require("../config/cloudinary");
const bot = require("../controllers/bot");

async function uploadTelegramFile(fileId, contestName) {
  try {
    console.log("File yuklash boshlandi, fileId:", fileId);

    const fileLink = await bot.getFileLink(fileId);
    console.log("File link olingan:", fileLink);

    const uploadResult = await uploadToCloudinary(fileLink, contestName);

    return {
      success: true,
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    };
  } catch (error) {
    console.error("File yuklash xatosi:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

function isValidImageFormat(mimeType) {
  if (!mimeType) return false;

  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/svg+xml",
    "image/tiff",
  ];
  return validTypes.includes(mimeType.toLowerCase());
}

function getImageFileId(msg) {
  console.log("Message mime_type check:", {
    hasPhoto: !!msg.photo,
    hasDocument: !!msg.document,
    documentMimeType: msg.document?.mime_type,
  });

  // 1. Photo sifatida yuborilgan rasm
  if (msg.photo && msg.photo.length > 0) {
    console.log("Rasm photo sifatida yuborildi");
    return msg.photo[msg.photo.length - 1].file_id;
  }

  // 2. Document sifatida yuborilgan rasm
  if (msg.document) {
    console.log("Document yuborildi, mime_type:", msg.document.mime_type);
    if (isValidImageFormat(msg.document.mime_type)) {
      console.log("Rasm document sifatida yuborildi");
      return msg.document.file_id;
    }
  }

  // 3. File sifatida yuborilgan (mime_type bo'lmasa ham)
  if (msg.document && !msg.document.mime_type) {
    console.log("File yuborildi, mime_type yoq");
    // Mime type bo'lmasa ham, rasm deb hisoblaymiz
    return msg.document.file_id;
  }

  console.log("Rasm topilmadi yoki noto'g'ri format");
  return null;
}

module.exports = {
  uploadTelegramFile,
  isValidImageFormat,
  getImageFileId,
};
