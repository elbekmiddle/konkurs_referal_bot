const Contest = require('../models/Contest');
const User = require('../models/User');
const { isAdmin } = require('../utils/helpers');
const { contestKeyboard, contestParticipationKeyboard } = require('../utils/keyboard');
const messageManager = require('../utils/messageManager');
const bot = require('../config/bot');

const getActiveContests = async (chatId) => {
  const contests = await Contest.find({ isActive: true });
  
  if (contests.length === 0) {
    return await messageManager.sendNewMessage(chatId, 
      '🎯 Hozircha aktiv konkurslar mavjud emas.\n\nTez orada yangi konkurslar boʻladi!'
    );
  }
  
  let message = `🎯 *Aktiv Konkurslar*\n\n`;
  
  for (const contest of contests) {
    const participantsCount = contest.participants.length;
    const timeLeft = Math.ceil((contest.endDate - new Date()) / (1000 * 60 * 60 * 24));
    const isParticipant = contest.participants.includes(chatId);
    
    message += `*${contest.title}*\n`;
    message += `📝 ${contest.description}\n`;
    message += `👥 Ishtirokchilar: ${participantsCount} ta\n`;
    message += `🏆 Gʻoliblar: ${contest.winnersCount} ta\n`;
    message += `🎁 Sovgʻa: ${contest.prize}\n`;
    message += `⏰ Qolgan kun: ${timeLeft}\n`;
    message += `📊 Holat: ${isParticipant ? '✅ Qatnashyapsiz' : '❌ Hali qatnashmadingiz'}\n\n`;
  }
  
  // Faol konkurslardan birini tanlash va qatnashish tugmasi
  const activeContest = contests[0]; // Birinchi aktiv konkurs
  await messageManager.sendNewMessage(chatId, message, { 
    parse_mode: 'Markdown',
    ...contestParticipationKeyboard(activeContest._id)
  });
};

const joinContest = async (chatId, contestId) => {
  try {
    const contest = await Contest.findById(contestId);
    
    if (!contest) {
      return await messageManager.sendNewMessage(chatId, '❌ Konkurs topilmadi.');
    }
    
    if (!contest.isActive) {
      return await messageManager.sendNewMessage(chatId, '❌ Bu konkurs aktiv emas.');
    }
    
    if (contest.participants.includes(chatId)) {
      return await messageManager.sendNewMessage(chatId, 
        'ℹ️ Siz allaqachon bu konkursda ishtirok etgansiz.'
      );
    }
    
    contest.participants.push(chatId);
    await contest.save();
    
    await messageManager.sendNewMessage(chatId, 
      `✅ Siz "${contest.title}" konkursiga muvaffaqiyatli qoʻshildingiz!\n\n` +
      `👥 Jami ishtirokchilar: ${contest.participants.length}\n` +
      `🎁 Sovgʻa: ${contest.prize}\n` +
      `🏆 Gʻoliblar soni: ${contest.winnersCount}\n\n` +
      `Omad tilaymiz! 🍀`,
      { parse_mode: 'Markdown' }
    );
    
  } catch (error) {
    console.error('Konkursga qoʻshilishda xato:', error);
    await messageManager.sendNewMessage(chatId, '❌ Konkursga qoʻshilishda xato yuz berdi.');
  }
};

module.exports = { getActiveContests, joinContest }
