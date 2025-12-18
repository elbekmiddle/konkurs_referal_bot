// models/Settings.js
const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Sozlamalarni olish uchun statik metod
settingsSchema.statics.getSetting = async function (key, defaultValue = null) {
  try {
    const setting = await this.findOne({ key });
    return setting ? setting.value : defaultValue;
  } catch (error) {
    console.error("❌ Sozlama olish xatosi:", error);
    return defaultValue;
  }
};

// Sozlamalarni saqlash/ yangilash uchun statik metod
settingsSchema.statics.setSetting = async function (
  key,
  value,
  description = "",
) {
  try {
    return await this.findOneAndUpdate(
      { key },
      {
        value,
        description: description || `Setting for ${key}`,
        updatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      },
    );
  } catch (error) {
    console.error("❌ Sozlama saqlash xatosi:", error);
    return null;
  }
};

// Kunlik bonus sozlamalarini olish
settingsSchema.statics.getDailyBonusSettings = async function () {
  try {
    const [amount, enabled, time] = await Promise.all([
      this.getSetting("daily_bonus_amount", 10),
      this.getSetting("daily_bonus_enabled", true),
      this.getSetting("daily_bonus_time", "00:00"),
    ]);

    return {
      amount,
      enabled,
      time,
    };
  } catch (error) {
    console.error("❌ Kunlik bonus sozlamalarini olish xatosi:", error);
    return {
      amount: 10,
      enabled: true,
      time: "00:00",
    };
  }
};

// Kunlik bonus sozlamalarini yangilash
settingsSchema.statics.updateDailyBonusSettings = async function (updates) {
  try {
    const settingsToUpdate = [];

    if (updates.amount !== undefined) {
      settingsToUpdate.push(
        this.setSetting(
          "daily_bonus_amount",
          updates.amount,
          "Kunlik bonus miqdori",
        ),
      );
    }

    if (updates.enabled !== undefined) {
      settingsToUpdate.push(
        this.setSetting(
          "daily_bonus_enabled",
          updates.enabled,
          "Kunlik bonus holati",
        ),
      );
    }

    if (updates.time !== undefined) {
      settingsToUpdate.push(
        this.setSetting("daily_bonus_time", updates.time, "Kunlik bonus vaqti"),
      );
    }

    await Promise.all(settingsToUpdate);
    return true;
  } catch (error) {
    console.error("❌ Kunlik bonus sozlamalarini yangilash xatosi:", error);
    return false;
  }
};

// Dastlabki sozlamalarni yaratish
settingsSchema.statics.initializeDefaults = async function () {
  const defaults = [
    {
      key: "daily_bonus_amount",
      value: 10,
      description: "Kunlik bonus miqdori (ball)",
    },
    {
      key: "daily_bonus_enabled",
      value: true,
      description: "Kunlik bonus tizimi faolmi?",
    },
    {
      key: "daily_bonus_time",
      value: "00:00",
      description: "Kunlik bonus beriladigan vaqt",
    },
    {
      key: "referral_bonus",
      value: 5,
      description: "Har bir referal uchun bonus ballari",
    },
    {
      key: "contest_join_bonus",
      value: 3,
      description: "Konkursga qo'shilish uchun bonus",
    },
    {
      key: "min_withdrawal",
      value: 100,
      description: "Minimal yechib olish miqdori",
    },
    {
      key: "max_referrals_per_day",
      value: 10,
      description: "Kuniga maksimal referal soni",
    },
    {
      key: "bonus_cooldown_hours",
      value: 24,
      description: "Bonus o'rtasidagi kutish vaqti (soat)",
    },
  ];

  console.log("⚙️ Dastlabki sozlamalar yaratilmoqda...");

  for (const defaultSetting of defaults) {
    const exists = await this.findOne({ key: defaultSetting.key });
    if (!exists) {
      await this.create(defaultSetting);
      console.log(
        `✅ ${defaultSetting.key}: ${defaultSetting.value} (${defaultSetting.description})`,
      );
    }
  }

  console.log("✅ Dastlabki sozlamalar muvaffaqiyatli yaratildi");
};

module.exports = mongoose.model("Settings", settingsSchema);
