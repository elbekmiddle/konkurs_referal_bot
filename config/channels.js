require('dotenv').config()

const channels = process.env.CHANNELS ? process.env.CHANNELS.split(',') : []
const CHANNELS = channels.map(channel => channel.trim())

module.exports = CHANNELS
