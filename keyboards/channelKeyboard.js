const { Markup } = require("telegraf");

const channelManagementKeyboard = () => {
  return Markup.inlineKeyboard([
    [Markup.button.callback("➕ Kanal qoʻshish", "add_channel")],
    [Markup.button.callback("📋 Kanallar roʻyxati", "list_channels")],
    [Markup.button.callback("◀️ Orqaga", "back_to_admin")],
  ]);
};

const confirmChannelKeyboard = () => {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ Tasdiqlash", "confirm_channel"),
      Markup.button.callback("❌ Bekor qilish", "cancel_channel"),
    ],
  ]);
};

const channelListKeyboard = (channels) => {
  const buttons = channels.map((channel) => [
    Markup.button.callback(
      `❌ ${channel.name}`,
      `delete_channel_${channel._id}`,
    ),
  ]);
  buttons.push([Markup.button.callback("◀️ Orqaga", "back_to_channels")]);
  return Markup.inlineKeyboard(buttons);
};

module.exports = {
  channelManagementKeyboard,
  confirmChannelKeyboard,
  channelListKeyboard,
};
