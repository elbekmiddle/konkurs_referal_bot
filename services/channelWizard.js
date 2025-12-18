const Channel = require("../models/Channel");

class ChannelWizard {
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
        "📢 Yangi kanal qo'shish boshlandi!\n\n**1-bosqich:** Kanal nomini kiriting:",
    };
  }

  async handleStep(chatId, input) {
    const session = this.sessions.get(chatId);
    if (!session) return null;

    try {
      switch (session.step) {
        case "name":
          return this.handleName(input, session);

        case "link":
          return this.handleLink(input, session);

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
      throw new Error("Kanal nomi kamida 3 ta belgidan iborat bo'lishi kerak");
    }

    session.data.channelName = input;
    session.step = "link";

    return {
      step: "link",
      message:
        "✅ **Nomi saqlandi!**\n\n**2-bosqich:** Kanal linkini kiriting:\n\n🔗 *Format: https://t.me/... yoki @...*\n*Misol: https://t.me/super_anatomiya*\n*Yoki: @doctors_team*",
    };
  }

  handleLink(input, session) {
    // Link formatini tekshirish
    if (!this.isValidChannelLink(input)) {
      throw new Error(
        "Noto'g'ri kanal link formati. Iltimos, https://t.me/... yoki @... formatida kiriting",
      );
    }

    session.data.channelLink = input;
    session.step = "confirm";

    const channelInfo = this.formatChannelInfo(session.data);

    return {
      step: "confirm",
      message: `🎉 **Barcha ma\'lumotlar to'plandi!**\n\n${channelInfo}\n\n**Kanalni qo'shishni tasdiqlaysizmi?**`,
      needsConfirmation: true,
      channelData: session.data,
    };
  }

  async handleConfirm(chatId, input, session) {
    if (input.toLowerCase() !== "ha" && input !== "✅ Ha, qo'shish") {
      this.sessions.delete(chatId);
      return {
        step: "cancelled",
        message: "❌ Kanal qo'shish bekor qilindi.",
        cancelled: true,
      };
    }

    // Kanalni bazaga saqlash
    const channel = new Channel({
      ...session.data,
      isActive: true,
      createdAt: new Date(),
    });

    await channel.save();
    this.sessions.delete(chatId);

    return {
      step: "completed",
      message: `✅ **Kanal muvaffaqiyatli qo'shildi!**\n\n📢 *${session.data.channelName}*\n🔗 ${session.data.channelLink}`,
      completed: true,
      channelId: channel._id,
    };
  }

  isValidChannelLink(link) {
    // https://t.me/... yoki @... formatlarini tekshirish
    const telegramLinkRegex =
      /^(https:\/\/t\.me\/[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)$/;
    return telegramLinkRegex.test(link);
  }

  formatChannelInfo(data) {
    return `📢 **Nomi:** ${data.channelName}
🔗 **Link:** ${data.channelLink}`;
  }

  cancelWizard(chatId) {
    this.sessions.delete(chatId);
    return "❌ Kanal qo'shish bekor qilindi.";
  }

  getSession(chatId) {
    return this.sessions.get(chatId);
  }

  hasActiveSession(chatId) {
    return this.sessions.has(chatId);
  }
}

// Instance yaratish va eksport qilish
const channelWizard = new ChannelWizard();
module.exports = channelWizard;
