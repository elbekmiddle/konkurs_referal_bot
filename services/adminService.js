const User = require("../models/User");
const Contest = require("../models/Contest");
const Channel = require("../models/Channel");

class AdminService {
  // USER SERVICES
  static async getUserById(chatId) {
    return await User.findOne({ chatId });
  }

  static async searchUsers(query) {
    return await User.find({
      $or: [
        { firstName: { $regex: query, $options: "i" } },
        { username: { $regex: query, $options: "i" } },
        { chatId: isNaN(query) ? 0 : parseInt(query) },
      ],
    }).limit(10);
  }

  static async getAllUsers(limit = 50) {
    return await User.find().sort({ joinDate: -1 }).limit(limit);
  }

  static async addPoints(chatId, points) {
    const user = await User.findOne({ chatId });
    if (!user) return null;

    user.points += points;
    await user.save();
    return user;
  }

  static async setPoints(chatId, points) {
    const user = await User.findOne({ chatId });
    if (!user) return null;

    user.points = points;
    await user.save();
    return user;
  }

  // CONTEST SERVICES
  static async createContest(contestData) {
    const contest = new Contest(contestData);
    return await contest.save();
  }

  static async getAllContests() {
    return await Contest.find().sort({ createdAt: -1 });
  }

  static async getContestById(id) {
    return await Contest.findById(id);
  }

  static async updateContest(id, updateData) {
    return await Contest.findByIdAndUpdate(id, updateData, { new: true });
  }

  static async deleteContest(id) {
    return await Contest.findByIdAndDelete(id);
  }

  // CHANNEL SERVICES
  static async createChannel(channelData) {
    const channel = new Channel(channelData);
    return await channel.save();
  }

  static async getAllChannels() {
    return await Channel.find().sort({ createdAt: -1 });
  }

  static async deleteChannel(channelName) {
    return await Channel.findOneAndDelete({ channelName });
  }

  // STATISTICS
  static async getStatistics() {
    const totalUsers = await User.countDocuments();
    const todayUsers = await User.countDocuments({
      joinDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });
    const totalPoints = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]);
    const topUsers = await User.find().sort({ points: -1 }).limit(10);
    const totalContests = await Contest.countDocuments();
    const activeContests = await Contest.countDocuments({ isActive: true });

    return {
      totalUsers,
      todayUsers,
      totalPoints: totalPoints[0]?.total || 0,
      topUsers,
      totalContests,
      activeContests,
    };
  }
}

module.exports = AdminService;
