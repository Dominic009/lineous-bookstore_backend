/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Upload a file to Cloudinary
   * @returns Promise with secure_url and public_id
   */
  async uploadFile(
    file: Express.Multer.File,
    folder = 'bookstore',
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      // Determine resource type based on mimetype
      let resourceType: 'auto' | 'image' | 'raw' | 'video' = 'auto';
      if (file.mimetype === 'application/pdf') {
        resourceType = 'raw';
      }

      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
        },
        (error, result) => {
          if (error) {
            reject(new Error(error.message || 'Upload failed'));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          } else {
            reject(new Error('Upload failed: no result returned'));
          }
        },
      );

      upload.end(file.buffer);
    });
  }

  /**
   * Delete a file from Cloudinary by public_id
   */
  async deleteFile(publicId: string): Promise<{ result: string }> {
    return cloudinary.uploader.destroy(publicId) as Promise<{ result: string }>;
  }
}
