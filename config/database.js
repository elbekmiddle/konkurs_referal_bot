// config/database.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // .env faylidan MONGO_URI ni olish
    const mongoURI = process.env.MONGO_URI;

    // Agar MONGO_URI mavjud bo'lmasa, xato chiqaramiz
    if (!mongoURI) {
      console.error("❌ MONGO_URI .env faylida aniqlanmagan!");
      console.log("📋 .env faylida quyidagilarni qo'shing:");
      console.log("MONGO_URI=mongodb://localhost:27017/telegram_bot_referral");
      // Test uchun default URI
      const defaultURI = "mongodb://127.0.0.1:27017/telegram_bot_referral";
      console.log(`🔧 Test uchun default URL: ${defaultURI}`);
      return mongoose.connect(defaultURI);
    }

    console.log(`🔗 MongoDB ulanish urli: ${mongoURI.substring(0, 40)}...`);

    // Yangi mongoose versiyasi uchun (6.x va undan yuqori)
    const conn = await mongoose.connect(mongoURI);

    console.log(`✅ MongoDB ga ulandi: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // MongoDB connection events
    mongoose.connection.on("error", (err) => {
      console.error(`❌ MongoDB xatosi: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB ulanish uzildi");
    });

    // App tugaganda MongoDB ulanishni yopish
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("📴 MongoDB ulanish yopildi");
      process.exit(0);
    });
  } catch (error) {
    console.error(`❌ MongoDB ulanish xatosi: ${error.message}`);

    // Qo'shimcha ma'lumot
    if (error.name === "MongoServerSelectionError") {
      console.log("🔍 Sabab: MongoDB serverga ulanish mumkin emas");
      console.log("💡 Tahlil:");
      console.log("1. MongoDB lokalda ishlamayapti");
      console.log("2. .env faylida MONGO_URI noto'g'ri");
      console.log("3. Tarmoq sozlamalari xato");
      console.log("🔄 MongoDB ni yoqing:");
      console.log("  Windows: net start MongoDB");
      console.log("  Linux/Mac: sudo systemctl start mongod");
    } else if (error.name === "MongooseServerSelectionError") {
      console.log("🔧 Yangi mongoose versiyasi uchun sozlamalar...");
      console.log(
        "📦 package.json ni tekshiring: mongoose versiyasi 6.x yoki 7.x bo'lishi kerak",
      );
    }

    // Aks holda, memory MongoDB bilan davom etish
    console.log("🔄 Memory MongoDB bilan davom etilmoqda...");
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      console.log("🧪 Memory MongoDB ishlatilmoqda");
      await mongoose.connect(uri);
      console.log("✅ Memory MongoDB ga ulandi");
    } catch (memError) {
      console.error("❌ Memory MongoDB ham ishlamadi:", memError.message);
      console.log("⚠️ MongoDB siz davom etilmoqda...");
    }
  }
};

module.exports = connectDB;
