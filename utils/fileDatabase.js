const fs = require('fs').promises
const path = require('path')

class FileDatabase {
	constructor() {
		this.dataDir = path.join(__dirname, '../data')
		this.usersFile = path.join(this.dataDir, 'users.json')
		this.configFile = path.join(this.dataDir, 'config.json')
		this.init()
	}

	async init() {
		try {
			await fs.mkdir(this.dataDir, { recursive: true })

			// Fayllarni yaratish agar mavjud bo'lmasa
			try {
				await fs.access(this.usersFile)
			} catch {
				await fs.writeFile(this.usersFile, '{}')
			}

			try {
				await fs.access(this.configFile)
			} catch {
				await fs.writeFile(this.configFile, '{}')
			}

			console.log('✅ File database initialized')
		} catch (error) {
			console.error('❌ File database init error:', error)
		}
	}

	// Users operations
	async getUsers() {
		try {
			const data = await fs.readFile(this.usersFile, 'utf8')
			return JSON.parse(data)
		} catch (error) {
			return {}
		}
	}

	async saveUsers(users) {
		try {
			await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2))
			return true
		} catch (error) {
			console.error('Save users error:', error)
			return false
		}
	}

	async getUser(chatId) {
		const users = await this.getUsers()
		return users[chatId] || null
	}

	async saveUser(user) {
		const users = await this.getUsers()
		users[user.chatId] = user
		return await this.saveUsers(users)
	}

	async getAllUsers() {
		const users = await this.getUsers()
		return Object.values(users)
	}

	async countUsers() {
		const users = await this.getUsers()
		return Object.keys(users).length
	}

	// Config operations
	async getConfig() {
		try {
			const data = await fs.readFile(this.configFile, 'utf8')
			return JSON.parse(data)
		} catch (error) {
			return {}
		}
	}

	async saveConfig(config) {
		try {
			await fs.writeFile(this.configFile, JSON.stringify(config, null, 2))
			return true
		} catch (error) {
			console.error('Save config error:', error)
			return false
		}
	}

	async getConfigValue(key) {
		const config = await this.getConfig()
		return config[key]
	}

	async setConfigValue(key, value) {
		const config = await this.getConfig()
		config[key] = value
		return await this.saveConfig(config)
	}
}

module.exports = new FileDatabase()
