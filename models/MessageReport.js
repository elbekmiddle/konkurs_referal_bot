const mongoose = require('mongoose');

const messageReportSchema = new mongoose.Schema({
    reporterId: {
        type: Number,
        required: true
    },
    reporterName: {
        type: String,
        required: true
    },
    reporterUsername: {
        type: String,
        default: ''
    },
    message: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ['report', 'suggestion', 'bug', 'feature_request'],
        default: 'report'
    },
    status: {
        type: String,
        enum: ['pending', 'read', 'resolved', 'rejected'],
        default: 'pending'
    },
    adminReply: {
        type: String,
        default: ''
    },
    repliedAt: {
        type: Date
    },
    adminReplierId: {
        type: Number
    },
    adminReplierName: {
        type: String
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    attachments: [{
        type: String // Cloudinary URL lar uchun
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('MessageReport', messageReportSchema);