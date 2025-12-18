class ASCIIDesign {
  static createStatsBox(user, rank) {
    const boxWidth = 34;
    const centerText = (text, width) => {
      const padding = Math.max(0, width - text.length);
      const leftPadding = Math.floor(padding / 2);
      const rightPadding = padding - leftPadding;
      return " ".repeat(leftPadding) + text + " ".repeat(rightPadding);
    };

    return (
      `┌${"─".repeat(boxWidth)}┐\n` +
      `│${centerText("🏆 SIZNING STATISTIKA", boxWidth)}│\n` +
      `├${"─".repeat(boxWidth)}┤\n` +
      `│ 👤 Ism: ${user.fullName.substring(0, 20).padEnd(boxWidth - 10)}│\n` +
      ```│ 🆔 ID: ${user.chatId.toString().padEnd(boxWidth - 9)}│\n` +
      `│ 🎯 Takliflar: ${user.referrals.toString().padEnd(boxWidth - 17)}│\n` +
      `│ ⭐ Ball: ${user.points.toString().padEnd(boxWidth - 12)}│\n` +
      `│ 🥇 Reytingdagi o'rni: ${rank.toString().padEnd(boxWidth - 26)}│\n` +
      `└${"─".repeat(boxWidth)}┘`
    );
  }

  static createLeaderboard(users, currentUserId) {
    let leaderboard =
      `╔════════════════════════════════════╗\n` +
      `║${this.centerText("GLOBAL SCOREBOARD", 34)}║\n` +
      `╠════╦════════════╦════════╦═════════╣\n` +
      `║ #  ║ User       ║ Refs   ║ Points  ║\n` +
      `╠════╬════════════╬════════╬═════════╣\n`;

    users.forEach((user, index) => {
      const isCurrentUser = user.chatId === currentUserId;
      const rank = (index + 1).toString().padEnd(2);

      // Userni qisqartirish
      let displayName = user.username ? `@${user.username}` : user.fullName;
      if (displayName.length > 10) {
        displayName = displayName.substring(0, 8) + "..";
      }

      if (isCurrentUser) {
        displayName = `${displayName}`;
      }

      displayName = displayName.padEnd(12);
      const refs = user.referrals.toString().padEnd(6);
      const points = user.points.toString().padEnd(7);

      leaderboard += `║ ${rank} ║ ${displayName} ║ ${refs} ║ ${points} ║\n`;
    });

    leaderboard += `╚════╩════════════╩════════╩═════════╝`;
    return leaderboard;
  }

  static centerText(text, width) {
    const padding = Math.max(0, width - text.length);
    const leftPadding = Math.floor(padding / 2);
    const rightPadding = padding - leftPadding;
    return " ".repeat(leftPadding) + text + " ".repeat(rightPadding);
  }

  static createProgressBar(points, maxPoints = 100) {
    const percentage = Math.min((points / maxPoints) * 100, 100);
    const filledBars = Math.round((percentage / 100) * 20);
    const emptyBars = 20 - filledBars;

    return `[${"█".repeat(filledBars)}${"░".repeat(emptyBars)}] ${Math.round(
      percentage,
    )}%`;
  }
}

module.exports = ASCIIDesign;
