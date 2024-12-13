import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import environment from '../config/env';

// Configuration
cloudinary.config({
  cloud_name: environment.CLOUDINARY_CLOUD_NAME,
  api_key: environment.CLOUDINARY_API_KEY,
  api_secret: environment.CLOUDINARY_API_SECRET,
});

/**
 * Custom file interface
 */
export interface CustomFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  size: number;
  buffer: Buffer;
  mimetype: string;
}

/**
 * Validates if the file is an image
 * @param file - The file to validate
 * @returns True if the file is an image, false otherwise
 */
export function validateImage(file: Express.Multer.File): boolean {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    'image/tiff',
    'image/jpg',
    'image/x-png',
  ];

  return allowedMimeTypes.includes(file.mimetype);
}

export default cloudinary;