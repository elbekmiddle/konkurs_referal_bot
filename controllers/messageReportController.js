const MessageReport = require("../models/MessageReport");
const User = require("../models/User");
const bot = require("./bot");
const messageManager = require("../utils/messageManager");

// ==================== USER XABAR YUBORISH ====================

const showMessageReportMenu = async (chatId) => {
  try {
    const user = await User.findOne({ chatId });
    if (!user) return;

    const message =
      `📬 *ADMINGA XABAR YUBORISH*\n\n` +
      `Bot haqida fikr-mulohazangiz, taklif yoki muammo haqida xabar yuborishingiz mumkin:\n\n` +
      `📋 *Xabar turlari:*\n` +
      `• 🐛 Xatolik haqida xabar\n` +
      `• 💡 Taklif\n` +
      `• ❓ Savol\n` +
      `• 📊 Botni takomillashtirish\n\n` +
      `Xabar turini tanlang:`;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🐛 Xatolik haqida", callback_data: "report_bug" },
            { text: "💡 Taklif", callback_data: "report_suggestion" },
          ],
          [
            { text: "❓ Savol", callback_data: "report_question" },
            { text: "📊 Takomillashtirish", callback_data: "report_feature" },
          ],
          [{ text: "◀️ Orqaga", callback_data: "main_menu" }],
        ],
      },
    };

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: keyboard.reply_markup,
    });
  } catch (error) {
    console.error("Xabar yuborish menyusi xatosi:", error);
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Xabar turini tanlash
const handleReportTypeSelection = async (chatId, type) => {
  try {
    const reportTypes = {
      report_bug: { name: "Xatolik", emoji: "🐛" },
      report_suggestion: { name: "Taklif", emoji: "💡" },
      report_question: { name: "Savol", emoji: "❓" },
      report_feature: { name: "Takomillashtirish", emoji: "📊" },
    };

    const selectedType = reportTypes[type];
    if (!selectedType) return;

    // User holatini saqlash
    reportStates[chatId] = {
      action: "send_report",
      type: type,
      data: {
        messageType: type.replace("report_", ""),
        attachments: [],
      },
    };

    const message =
      `${selectedType.emoji} *${selectedType.name.toUpperCase()} XABARI*\n\n` +
      `Iltimos, xabaringizni yuboring:\n\n` +
      `✍️ *Misol xabar:*\n` +
      `• ${selectedType.name === "Xatolik" ? "Bot konkurs ochilmayapti, xatolik berayapti." : ""}\n` +
      `• ${selectedType.name === "Taklif" ? "Yangi funksiya: Do'stlar bilan ball ulashish." : ""}\n` +
      `• ${selectedType.name === "Savol" ? "Ballarni qanday oshirish mumkin?" : ""}\n` +
      `• ${selectedType.name === "Takomillashtirish" ? "Reyting jadvalini yaxshilash mumkin." : ""}\n\n` +
      `📎 *Rasm yoki fayl ham qo\'shishingiz mumkin*\n` +
      `🚫 Bekor qilish uchun: /cancel`;

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: [[{ text: "🚫 Bekor qilish" }]],
        resize_keyboard: true,
      },
    });
  } catch (error) {
    console.error("Xabar turini tanlash xatosi:", error);
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Xabar qabul qilish
const reportStates = {};

const processReportMessage = async (chatId, msg) => {
  try {
    const state = reportStates[chatId];
    if (!state || state.action !== "send_report") return;

    const user = await User.findOne({ chatId });
    if (!user) return;

    const text = msg.text;
    const photo = msg.photo;
    const document = msg.document;

    // Bekor qilish
    if (text === "🚫 Bekor qilish" || text === "/cancel") {
      delete reportStates[chatId];
      await bot.sendMessage(chatId, "❌ Xabar yuborish bekor qilindi.", {
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    // Agar rasm yuborilsa
    if (photo && photo.length > 0) {
      const fileId = photo[photo.length - 1].file_id;
      state.data.attachments.push({
        type: "photo",
        fileId: fileId,
      });

      await bot.sendMessage(
        chatId,
        '✅ Rasm qabul qilindi. Xabarni yozishda davom eting yoki "✅ Xabarni yuborish" tugmasini bosing.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ Xabarni yuborish", callback_data: "submit_report" }],
              [{ text: "🚫 Bekor qilish", callback_data: "cancel_report" }],
            ],
          },
        },
      );
      return;
    }

    // Agar fayl yuborilsa
    if (document) {
      state.data.attachments.push({
        type: "document",
        fileId: document.file_id,
        fileName: document.file_name,
      });

      await bot.sendMessage(
        chatId,
        '✅ Fayl qabul qilindi. Xabarni yozishda davom eting yoki "✅ Xabarni yuborish" tugmasini bosing.',
      );
      return;
    }

    // Agar matn yuborilsa
    if (text && text.trim()) {
      state.data.message = text.trim();

      // Xabarni tasdiqlash
      const reportTypes = {
        bug: "🐛 Xatolik",
        suggestion: "💡 Taklif",
        question: "❓ Savol",
        feature: "📊 Takomillashtirish",
      };

      let previewMessage = `📋 *XABAR TAQDIMI*\n\n`;
      previewMessage += `📊 Turi: ${reportTypes[state.data.messageType]}\n`;
      previewMessage += `👤 Yuboruvchi: ${user.fullName}\n`;
      previewMessage += `📝 Xabar: ${state.data.message}\n`;

      if (state.data.attachments.length > 0) {
        previewMessage += `📎 Ilovalar: ${state.data.attachments.length} ta\n`;
      }

      previewMessage += `\nXabarni yuborishni tasdiqlaysizmi?`;

      await bot.sendMessage(chatId, previewMessage, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Yuborish", callback_data: "submit_report" },
              { text: "✏️ Qayta yozish", callback_data: "rewrite_report" },
            ],
            [{ text: "🚫 Bekor qilish", callback_data: "cancel_report" }],
          ],
        },
      });
    }
  } catch (error) {
    console.error("Xabar qayta ishlash xatosi:", error);
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Xabarni yuborish
const submitReport = async (chatId) => {
  try {
    const state = reportStates[chatId];
    if (!state || state.action !== "send_report") return;

    const user = await User.findOne({ chatId });
    if (!user) return;

    // MessageReport yaratish
    const report = new MessageReport({
      reporterId: user.chatId,
      reporterName: user.fullName,
      reporterUsername: user.username,
      message: state.data.message,
      messageType: state.data.messageType,
      status: "pending",
      priority: state.data.messageType === "bug" ? "high" : "medium",
      attachments: state.data.attachments.map((att) => JSON.stringify(att)),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await report.save();

    // Adminlarga xabar yuborish
    await notifyAdminsAboutNewReport(report, user);

    // Foydalanuvchiga tasdiq
    await bot.sendMessage(
      chatId,
      `✅ Xabaringiz muvaffaqiyatli yuborildi!\n\n` +
        `📊 Xabar raqami: #${report._id.toString().slice(-6)}\n` +
        `⏰ Yuborilgan vaqt: ${new Date().toLocaleString("uz-UZ")}\n\n` +
        `👨‍💼 Adminlar tez orada javob berishadi.\n` +
        `📬 Javobni shu yerda olasiz.`,
      {
        parse_mode: "Markdown",
        reply_markup: { remove_keyboard: true },
      },
    );

    delete reportStates[chatId];
  } catch (error) {
    console.error("Xabar yuborish xatosi:", error);
    await bot.sendMessage(chatId, "❌ Xabar yuborishda xatolik");
  }
};

// Adminlarga bildirish
const notifyAdminsAboutNewReport = async (report, reporter) => {
  try {
    const adminUsers = await User.find({ isAdmin: true });

    const reportTypes = {
      bug: "🐛 XATOLIK",
      suggestion: "💡 TAKLIF",
      question: "❓ SAVOL",
      feature: "📊 TAKOMILLASHTIRISH",
    };

    for (const admin of adminUsers) {
      try {
        let adminMessage = `📬 *YANGI XABAR KELDI!*\n\n`;
        adminMessage += `📊 Turi: ${reportTypes[report.messageType]}\n`;
        adminMessage += `🔢 Raqami: #${report._id.toString().slice(-6)}\n`;
        adminMessage += `👤 Yuboruvchi: ${reporter.fullName}\n`;
        adminMessage += `📱 Username: @${reporter.username || "Noma'lum"}\n`;
        adminMessage += `🆔 ID: ${reporter.chatId}\n`;
        adminMessage += `⏰ Vaqt: ${report.createdAt.toLocaleString("uz-UZ")}\n\n`;
        adminMessage += `📝 *XABAR:*\n${report.message}\n\n`;
        adminMessage += `📊 Holat: ⏳ Kutilyapti`;

        const keyboard = {
          inline_keyboard: [
            [
              {
                text: "👀 Ko'rish",
                callback_data: `view_report_${report._id}`,
              },
              { text: "📋 Barcha xabarlar", callback_data: "list_reports" },
            ],
          ],
        };

        await bot.sendMessage(admin.chatId, adminMessage, {
          parse_mode: "Markdown",
          reply_markup: keyboard,
        });
      } catch (adminError) {
        console.error(
          `Admin ${admin.chatId} ga xabar yuborish xatosi:`,
          adminError,
        );
      }
    }
  } catch (error) {
    console.error("Adminlarga bildirish xatosi:", error);
  }
};

// ==================== ADMIN XABARLARNI KO'RISH ====================

// Xabarlar ro'yxati
const showReportsList = async (chatId, page = 1) => {
  try {
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const totalReports = await MessageReport.countDocuments();
    const reports = await MessageReport.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    const totalPages = Math.ceil(totalReports / pageSize);

    let message = `📬 *XABARLAR RO'YXATI*\n\n`;
    message += `📊 Jami xabarlar: ${totalReports} ta\n`;
    message += `📄 Sahifa: ${page}/${totalPages}\n\n`;

    if (reports.length === 0) {
      message += `📭 Hozircha xabarlar yo'q`;
    } else {
      reports.forEach((report, index) => {
        const statusEmoji = {
          pending: "⏳",
          read: "👁️",
          resolved: "✅",
          rejected: "❌",
        }[report.status];

        const typeEmoji = {
          bug: "🐛",
          suggestion: "💡",
          question: "❓",
          feature: "📊",
        }[report.messageType];

        const num = skip + index + 1;
        const shortMessage =
          report.message.length > 30
            ? report.message.substring(0, 30) + "..."
            : report.message;

        message += `${num}. ${statusEmoji} ${typeEmoji} #${report._id.toString().slice(-6)}\n`;
        message += `   👤 ${report.reporterName}\n`;
        message += `   📝 ${shortMessage}\n`;
        message += `   ⏰ ${report.createdAt.toLocaleDateString("uz-UZ")}\n\n`;
      });
    }

    const keyboard = {
      inline_keyboard: [],
    };

    // Pagination
    if (totalPages > 1) {
      const paginationRow = [];

      if (page > 1) {
        paginationRow.push({
          text: "◀️",
          callback_data: `reports_page_${page - 1}`,
        });
      }

      paginationRow.push({
        text: `${page}/${totalPages}`,
        callback_data: `current_page_${page}`,
      });

      if (page < totalPages) {
        paginationRow.push({
          text: "▶️",
          callback_data: `reports_page_${page + 1}`,
        });
      }

      keyboard.inline_keyboard.push(paginationRow);
    }

    // Filtr tugmalari
    keyboard.inline_keyboard.push([
      { text: "⏳ Kutilyapti", callback_data: "filter_pending" },
      { text: "✅ Hal qilingan", callback_data: "filter_resolved" },
    ]);

    keyboard.inline_keyboard.push([
      { text: "🐛 Xatoliklar", callback_data: "filter_bugs" },
      { text: "💡 Takliflar", callback_data: "filter_suggestions" },
    ]);

    keyboard.inline_keyboard.push([
      { text: "🔄 Yangilash", callback_data: "refresh_reports" },
      { text: "📊 Statistika", callback_data: "reports_stats" },
    ]);

    keyboard.inline_keyboard.push([
      { text: "🏠 Admin panel", callback_data: "back_to_admin" },
    ]);

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error("Xabarlar ro'yxatini ko'rsatish xatosi:", error);
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Xabarni ko'rish
const showReportDetail = async (chatId, reportId) => {
  try {
    const report = await MessageReport.findById(reportId);
    if (!report) {
      await bot.sendMessage(chatId, "❌ Xabar topilmadi");
      return;
    }

    const admin = await User.findOne({ chatId });
    if (!admin || !admin.isAdmin) {
      await bot.sendMessage(chatId, "❌ Siz admin emassiz");
      return;
    }

    const statusText = {
      pending: "⏳ Kutilyapti",
      read: "👁️ O'qilgan",
      resolved: "✅ Hal qilingan",
      rejected: "❌ Rad etilgan",
    }[report.status];

    const typeText = {
      bug: "🐛 Xatolik",
      suggestion: "💡 Taklif",
      question: "❓ Savol",
      feature: "📊 Takomillashtirish",
    }[report.messageType];

    const priorityText = {
      low: "🟢 Past",
      medium: "🟡 O'rtacha",
      high: "🔴 Yuqori",
      critical: "⚫️ Juda yuqori",
    }[report.priority];

    let message = `📋 *XABAR TAQDIMI #${report._id.toString().slice(-6)}*\n\n`;
    message += `📊 Turi: ${typeText}\n`;
    message += `📊 Holat: ${statusText}\n`;
    message += `📊 Ahamiyati: ${priorityText}\n\n`;
    message += `👤 *Yuboruvchi:*\n`;
    message += `• Ism: ${report.reporterName}\n`;
    message += `• Username: @${report.reporterUsername || "Noma'lum"}\n`;
    message += `• ID: ${report.reporterId}\n\n`;
    message += `⏰ *Vaqt:*\n`;
    message += `• Yuborilgan: ${report.createdAt.toLocaleString("uz-UZ")}\n`;
    message += `• Yangilangan: ${report.updatedAt.toLocaleString("uz-UZ")}\n\n`;
    message += `📝 *XABAR:*\n${report.message}\n\n`;

    if (report.adminReply) {
      message += `👨‍💼 *ADMIN JAVOBI:*\n${report.adminReply}\n\n`;
      message += `• Javob beruvchi: ${report.adminReplierName}\n`;
      message += `• Javob vaqti: ${report.repliedAt.toLocaleString("uz-UZ")}\n`;
    }

    // Ilovalarni ko'rsatish
    if (report.attachments && report.attachments.length > 0) {
      message += `📎 Ilovalar: ${report.attachments.length} ta\n`;

      for (let i = 0; i < report.attachments.length; i++) {
        const att = JSON.parse(report.attachments[i]);
        if (att.type === "photo") {
          try {
            await bot.sendPhoto(chatId, att.fileId, {
              caption: `📸 Ilova ${i + 1}`,
            });
          } catch (photoError) {
            console.error("Rasm yuborish xatosi:", photoError);
          }
        } else if (att.type === "document") {
          message += `📄 ${att.fileName || "Fayl"}\n`;
        }
      }
    }

    const keyboard = {
      inline_keyboard: [],
    };

    // Holatni o'zgartirish
    if (report.status !== "resolved") {
      keyboard.inline_keyboard.push([
        {
          text: "✅ Hal qilindi",
          callback_data: `resolve_report_${report._id}`,
        },
        { text: "❌ Rad etish", callback_data: `reject_report_${report._id}` },
      ]);
    }

    // Javob berish
    keyboard.inline_keyboard.push([
      { text: "💬 Javob berish", callback_data: `reply_report_${report._id}` },
    ]);

    // Boshqa amallar
    keyboard.inline_keyboard.push([
      { text: "📊 Ahamiyat", callback_data: `change_priority_${report._id}` },
      { text: "👁️ O'qildi", callback_data: `mark_read_${report._id}` },
    ]);

    keyboard.inline_keyboard.push([
      { text: "📋 Barcha xabarlar", callback_data: "list_reports" },
      { text: "🏠 Admin panel", callback_data: "back_to_admin" },
    ]);

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });

    // Agar o'qilmagan bo'lsa, o'qilgan qilish
    if (report.status === "pending") {
      report.status = "read";
      report.updatedAt = new Date();
      await report.save();
    }
  } catch (error) {
    console.error("Xabar tafsilotlarini ko'rsatish xatosi:", error);
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

// Xabarga javob berish
const startReplyToReport = async (chatId, reportId) => {
  try {
    const report = await MessageReport.findById(reportId);
    if (!report) return;

    replyStates[chatId] = {
      action: "reply_to_report",
      reportId: reportId,
      data: {},
    };

    await bot.sendMessage(
      chatId,
      `✍️ *XABARGA JAVOB YOZISH*\n\n` +
        `Xabar: #${report._id.toString().slice(-6)}\n` +
        `Yuboruvchi: ${report.reporterName}\n\n` +
        `Javobingizni yozing:\n\n` +
        `ℹ️ *Eslatma:* Javob yuborilgach, foydalanuvchiga xabar boradi.\n` +
        `🚫 Bekor qilish: /cancel`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [[{ text: "🚫 Bekor qilish" }]],
          resize_keyboard: true,
        },
      },
    );
  } catch (error) {
    console.error("Javob yozishni boshlash xatosi:", error);
  }
};

const replyStates = {};

const processReplyMessage = async (chatId, msg) => {
  try {
    const state = replyStates[chatId];
    if (!state || state.action !== "reply_to_report") return;

    const text = msg.text;

    // Bekor qilish
    if (text === "🚫 Bekor qilish" || text === "/cancel") {
      delete replyStates[chatId];
      await bot.sendMessage(chatId, "❌ Javob berish bekor qilindi.", {
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    if (text && text.trim()) {
      state.data.reply = text.trim();

      // Javobni tasdiqlash
      await bot.sendMessage(
        chatId,
        `📋 *JAVOB TAQDIMI*\n\n` +
          `Javob: ${state.data.reply}\n\n` +
          `Javobni yuborishni tasdiqlaysizmi?`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Yuborish",
                  callback_data: `submit_reply_${state.reportId}`,
                },
                {
                  text: "✏️ Qayta yozish",
                  callback_data: `rewrite_reply_${state.reportId}`,
                },
              ],
              [
                {
                  text: "🚫 Bekor qilish",
                  callback_data: `cancel_reply_${state.reportId}`,
                },
              ],
            ],
          },
        },
      );
    }
  } catch (error) {
    console.error("Javob qayta ishlash xatosi:", error);
  }
};

const submitReply = async (chatId, reportId) => {
  try {
    const state = replyStates[chatId];
    if (!state || state.reportId !== reportId) return;

    const report = await MessageReport.findById(reportId);
    const admin = await User.findOne({ chatId });

    if (!report || !admin) {
      await bot.sendMessage(chatId, "❌ Xatolik yuz berdi");
      return;
    }

    // Report ni yangilash
    report.adminReply = state.data.reply;
    report.adminReplierId = admin.chatId;
    report.adminReplierName = admin.fullName;
    report.repliedAt = new Date();
    report.status = "resolved";
    report.updatedAt = new Date();

    await report.save();

    // Foydalanuvchiga javob yuborish
    try {
      await bot.sendMessage(
        report.reporterId,
        `📬 *ADMIN JAVOBI*\n\n` +
          `Xabaringizga javob keldi:\n\n` +
          `📊 Xabar raqami: #${report._id.toString().slice(-6)}\n` +
          `👨‍💼 Admin: ${admin.fullName}\n` +
          `⏰ Vaqt: ${report.repliedAt.toLocaleString("uz-UZ")}\n\n` +
          `💬 *JAVOB:*\n${report.adminReply}\n\n` +
          `ℹ️ Yangi xabar yuborish uchun "📬 Adminga xabar" tugmasini bosing.`,
        {
          parse_mode: "Markdown",
        },
      );
    } catch (userError) {
      console.error("Foydalanuvchiga javob yuborish xatosi:", userError);
    }

    // Admin ga tasdiq
    await bot.sendMessage(
      chatId,
      `✅ Javob muvaffaqiyatli yuborildi!\n\n` +
        `👤 Yuborildi: ${report.reporterName}\n` +
        `📝 Javob: ${state.data.reply}\n\n` +
        `✅ Xabar "Hal qilingan" holatiga o'zgartirildi.`,
      {
        parse_mode: "Markdown",
        reply_markup: { remove_keyboard: true },
      },
    );

    delete replyStates[chatId];
  } catch (error) {
    console.error("Javob yuborish xatosi:", error);
    await bot.sendMessage(chatId, "❌ Javob yuborishda xatolik");
  }
};

// Xabarni hal qilish
const resolveReport = async (chatId, reportId) => {
  try {
    const report = await MessageReport.findById(reportId);
    const admin = await User.findOne({ chatId });

    if (!report || !admin) return;

    report.status = "resolved";
    report.updatedAt = new Date();
    await report.save();

    await bot.sendMessage(
      chatId,
      `✅ Xabar hal qilindi!\n\n` +
        `📊 Raqam: #${report._id.toString().slice(-6)}\n` +
        `👤 Yuboruvchi: ${report.reporterName}\n` +
        `📊 Yangi holat: ✅ Hal qilingan`,
    );

    // Xabarni yangilash
    await showReportDetail(chatId, reportId);
  } catch (error) {
    console.error("Xabarni hal qilish xatosi:", error);
  }
};

// ==================== STATISTIKA ====================

const showReportsStats = async (chatId) => {
  try {
    const totalReports = await MessageReport.countDocuments();
    const pendingReports = await MessageReport.countDocuments({
      status: "pending",
    });
    const resolvedReports = await MessageReport.countDocuments({
      status: "resolved",
    });
    const bugReports = await MessageReport.countDocuments({
      messageType: "bug",
    });
    const suggestionReports = await MessageReport.countDocuments({
      messageType: "suggestion",
    });

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayReports = await MessageReport.countDocuments({
      createdAt: { $gte: last24Hours },
    });

    const message =
      `📊 *XABARLAR STATISTIKASI*\n\n` +
      `📈 Umumiy statistik:\n` +
      `• 📬 Jami xabarlar: ${totalReports} ta\n` +
      `• ⏳ Kutilyapti: ${pendingReports} ta\n` +
      `• ✅ Hal qilingan: ${resolvedReports} ta\n` +
      `• 🐛 Xatoliklar: ${bugReports} ta\n` +
      `• 💡 Takliflar: ${suggestionReports} ta\n` +
      `• 📅 Oxirgi 24 soat: ${todayReports} ta\n\n` +
      `📊 Foizlar:\n` +
      `• Hal qilingan: ${totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0}%\n` +
      `• Kutilyapti: ${totalReports > 0 ? Math.round((pendingReports / totalReports) * 100) : 0}%`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "📋 Xabarlar ro'yxati", callback_data: "list_reports" },
          { text: "🔄 Yangilash", callback_data: "refresh_stats" },
        ],
        [{ text: "🏠 Admin panel", callback_data: "back_to_admin" }],
      ],
    };

    await bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error("Statistika ko'rsatish xatosi:", error);
    await bot.sendMessage(chatId, "❌ Xatolik yuz berdi");
  }
};

module.exports = {
  // User funksiyalari
  showMessageReportMenu,
  handleReportTypeSelection,
  processReportMessage,
  submitReport,
  reportStates,

  // Admin funksiyalari
  showReportsList,
  showReportDetail,
  startReplyToReport,
  processReplyMessage,
  submitReply,
  resolveReport,
  showReportsStats,
  replyStates,
};
