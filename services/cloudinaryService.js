const cloudinary = require('cloudinary').v2

// Cloudinary konfiguratsiyasi
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
})

class CloudinaryService {
	static async uploadImage(imageUrl, folder = 'contest_images') {
		try {
			const result = await cloudinary.uploader.upload(imageUrl, {
				folder: folder,
				quality: 'auto',
				fetch_format: 'auto',
			})

			return {
				success: true,
				url: result.secure_url,
				public_id: result.public_id,
			}
		} catch (error) {
			console.error('Cloudinary upload error:', error)
			return {
				success: false,
				error: error.message,
			}
		}
	}

	static async deleteImage(publicId) {
		try {
			await cloudinary.uploader.destroy(publicId)
			return { success: true }
		} catch (error) {
			console.error('Cloudinary delete error:', error)
			return { success: false, error: error.message }
		}
	}
}

module.exports = CloudinaryService
