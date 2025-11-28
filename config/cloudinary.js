const cloudinary = require('cloudinary').v2
const axios = require('axios')
const dotenv = require('dotenv')

dotenv.config()

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadToCloudinary = async (fileUrl, contestName) => {
	try {
		console.log('Cloudinary yuklash boshlandi:', fileUrl)

		const response = await axios.get(fileUrl, {
			responseType: 'arraybuffer',
			timeout: 30000,
		})

		const fileBuffer = Buffer.from(response.data)

		return new Promise((resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						folder: 'telegram_contests',
						public_id: `contest_${contestName}_${Date.now()}`.replace(
							/[^a-zA-Z0-9]/g,
							'_'
						),
						resource_type: 'image',
					},
					(error, result) => {
						if (error) {
							console.error('Cloudinary upload error:', error)
							reject(error)
						} else {
							console.log(
								'Cloudinary yuklash muvaffaqiyatli:',
								result.secure_url
							)
							resolve(result)
						}
					}
				)
				.end(fileBuffer)
		})
	} catch (error) {
		console.error('Rasm yuklash xatosi:', error)
		throw new Error(`Rasm yuklash muvaffaqiyatsiz: ${error.message}`)
	}
}

module.exports = {
	cloudinary,
	uploadToCloudinary,
}
