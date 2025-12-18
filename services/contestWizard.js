const Contest = require("../models/Contest");
const CloudinaryService = require("./cloudinaryService");

class ContestWizard {
  constructor() {
    this.sessions = new Map();
  }

  startWizard(chatId) {
    this.sessions.set(chatId, {
      step: "name",
      data: {},
    });

    return {
      step: "name",
      message:
        "🎯 Yangi konkurs yaratish boshlandi!\n\n**1-bosqich:** Konkurs nomini kiriting:",
    };
  }

  async handleStep(chatId, input, bot) {
    const session = this.sessions.get(chatId);
    if (!session) return null;

    try {
      switch (session.step) {
        case "name":
          return this.handleName(input, session);

        case "description":
          return this.handleDescription(input, session);

        case "points":
          return this.handlePoints(input, session);

        case "bonus":
          return this.handleBonus(input, session);

        case "image":
          return await this.handleImage(chatId, input, session, bot);

        case "start_date":
          return this.handleStartDate(input, session);

        case "end_date":
          return this.handleEndDate(input, session);

        case "confirm":
          return this.handleConfirm(chatId, input, session);

        default:
          return null;
      }
    } catch (error) {
      return {
        step: session.step,
        message: `❌ ${error.message}\n\nIltimos, qaytadan kiriting:`,
        error: true,
      };
    }
  }

  handleName(input, session) {
    if (input.length < 3) {
      throw new Error(
        "Konkurs nomi kamida 3 ta belgidan iborat bo'lishi kerak",
      );
    }

    session.data.name = input;
    session.step = "description";

    return {
      step: "description",
      message:
        "✅ **Nomi saqlandi!**\n\n**2-bosqich:** Konkurs tavsifini kiriting:",
    };
  }

  handleDescription(input, session) {
    if (input.length < 10) {
      throw new Error("Tavsif kamida 10 ta belgidan iborat bo'lishi kerak");
    }

    session.data.description = input;
    session.step = "points";

    return {
      step: "points",
      message:
        "✅ **Tavsif saqlandi!**\n\n**3-bosqich:** Konkurs uchun ball miqdorini kiriting:\n\n💰 *Misollar: 100, 250, 500*",
    };
  }

  handlePoints(input, session) {
    const points = parseInt(input);
    if (isNaN(points) || points < 1) {
      throw new Error("Ball miqdori musbat raqam bo'lishi kerak");
    }

    session.data.points = points;
    session.step = "bonus";

    return {
      step: "bonus",
      message: `✅ **${points} ball saqlandi!**\n\n**4-bosqich:** Qo'shimcha bonus ball miqdorini kiriting:\n\n🎁 *Agar bonus bermasangiz 0 kiriting*`,
    };
  }

  handleBonus(input, session) {
    const bonus = parseInt(input);
    if (isNaN(bonus) || bonus < 0) {
      throw new Error("Bonus miqdori manfiy bo'lmagan raqam bo'lishi kerak");
    }

    session.data.bonus = bonus;
    session.step = "image";

    return {
      step: "image",
      message: `✅ **${bonus} bonus ball saqlandi!**\n\n**5-bosqich:** Konkurs uchun rasm yuboring (opsional):\n\nAgar rasm qo'shmasangiz "O'tkazib yuborish" tugmasini bosing.`,
      hasImage: true,
    };
  }

  async handleImage(chatId, input, session, bot) {
    // Agar rasm yuborilgan bo'lsa
    if (input.photo) {
      const photo = input.photo[input.photo.length - 1];
      const file = await bot.getFile(photo.file_id);
      const imageUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

      // Cloudinary ga yuklash
      const uploadResult = await CloudinaryService.uploadImage(imageUrl);

      if (uploadResult.success) {
        session.data.image = uploadResult.url;
        session.data.imagePublicId = uploadResult.public_id;
      } else {
        throw new Error("Rasm yuklashda xatolik: " + uploadResult.error);
      }
    }
    // Agar skip bosilsa
    else if (input === "skip") {
      session.data.image = null;
      session.data.imagePublicId = null;
    } else {
      throw new Error(
        'Iltimos, rasm yuboring yoki "O\'tkazib yuborish" tugmasini bosing',
      );
    }

    session.step = "start_date";

    return {
      step: "start_date",
      message: `✅ ${
        session.data.image
          ? "Rasm muvaffaqiyatli yuklandi!"
          : "Rasm o'tkazib yuborildi!"
      }\n\n**6-bosqich:** Konkurs boshlanish sanasini kiriting:\n\n📅 *Format: YYYY-MM-DD*\n*Misol: 2025-01-15*`,
    };
  }

  handleStartDate(input, session) {
    const startDate = new Date(input);
    if (isNaN(startDate.getTime())) {
      throw new Error(
        "Noto'g'ri sana formati. Iltimos, YYYY-MM-DD formatida kiriting",
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      throw new Error("Boshlanish sanasi bugundan oldin bo'lishi mumkin emas");
    }

    session.data.startDate = startDate;
    session.step = "end_date";

    return {
      step: "end_date",
      message: `✅ **Boshlanish sanasi saqlandi: ${startDate.toLocaleDateString()}**\n\n**7-bosqich:** Konkurs tugash sanasini kiriting:\n\n📅 *Format: YYYY-MM-DD*\n*Misol: 2025-02-15*`,
    };
  }

  handleEndDate(input, session) {
    const endDate = new Date(input);
    if (isNaN(endDate.getTime())) {
      throw new Error(
        "Noto'g'ri sana formati. Iltimos, YYYY-MM-DD formatida kiriting",
      );
    }

    if (endDate <= session.data.startDate) {
      throw new Error(
        "Tugash sanasi boshlanish sanasidan keyin bo'lishi kerak",
      );
    }

    session.data.endDate = endDate;
    session.step = "confirm";

    const contestInfo = this.formatContestInfo(session.data);

    return {
      step: "confirm",
      message: `🎉 **Barcha ma\'lumotlar to'plandi!**\n\n${contestInfo}\n\n**Konkursni yaratishni tasdiqlaysizmi?**`,
      needsConfirmation: true,
      contestData: session.data,
    };
  }

  async handleConfirm(chatId, input, session) {
    if (input.toLowerCase() !== "ha" && input !== "✅ Ha, yaratish") {
      this.sessions.delete(chatId);
      return {
        step: "cancelled",
        message: "❌ Konkurs yaratish bekor qilindi.",
        cancelled: true,
      };
    }

    // Konkursni bazaga saqlash
    const contest = new Contest({
      ...session.data,
      isActive: false,
      participants: [],
      winners: [],
      createdAt: new Date(),
    });

    await contest.save();
    this.sessions.delete(chatId);

    return {
      step: "completed",
      message: `🎉 **Konkurs muvaffaqiyatli yaratildi!**\n\n🏆 *${
        session.data.name
      }*\n\nKonkurs avtomatik ravishda:\n📅 ${session.data.startDate.toLocaleDateString()} - boshlanadi\n📅 ${session.data.endDate.toLocaleDateString()} - tugaydi`,
      completed: true,
      contestId: contest._id,
    };
  }

  formatContestInfo(data) {
    let info = `🏆 **Nomi:** ${data.name}
📝 **Tavsif:** ${data.description}
💰 **Asosiy mukofot:** ${data.points} ball
🎁 **Bonus:** ${data.bonus} ball
📅 **Boshlanish:** ${data.startDate.toLocaleDateString()}
📅 **Tugash:** ${data.endDate.toLocaleDateString()}`;

    if (data.image) {
      info += `\n🖼️ **Rasm:** Yuklangan`;
    }

    return info;
  }

  cancelWizard(chatId) {
    this.sessions.delete(chatId);
    return "❌ Konkurs yaratish bekor qilindi.";
  }

  getSession(chatId) {
    return this.sessions.get(chatId);
  }

  hasActiveSession(chatId) {
    return this.sessions.has(chatId);
  }
}

// Instance yaratish va eksport qilish
const contestWizard = new ContestWizard();
module.exports = contestWizard;
