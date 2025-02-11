import { v2 as cloudinary } from 'cloudinary';
import { Express } from 'express';
import sharp from 'sharp';
import environment from '../config/env';
import { ErrorResponse } from './errorResponse';

// Configure Cloudinary 
cloudinary.config({
  cloud_name: environment.CLOUDINARY_CLOUD_NAME,
  api_key: environment.CLOUDINARY_API_KEY,
  api_secret: environment.CLOUDINARY_API_SECRET,
});

export interface CustomFile extends Express.Multer.File {}

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

export const uploadImageToCloudinary = async (file: Express.Multer.File): Promise<string> => {
  // const processedBuffer = await sharp(file.buffer)
  //   .resize({ width: 800 })
  //   .toBuffer();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary Error:', error);
          reject(new Error('Image upload failed'));
        } else {
          console.log('Cloudinary Upload Result:', result);
          resolve(result?.secure_url || '');
        }
      }
    );
    uploadStream.end(file.buffer);
  });
};

export async function uploadSingleFileToCloudinary(
  file: Express.Multer.File, 
  area: string, 
  imageName: string, 
  retries: number = 5
): Promise<any> {

  validateImage(file);

  const processedBuffer = await sharp(file.buffer).rotate().toBuffer();

  try {
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            console.log(`Cloudinary Error:`, error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.on('error', (err) => {
        console.log(`Stream Error:`, err);
        reject(err);
      });

      uploadStream.end(processedBuffer);
    });

    // If successful, return the result
    return result;
  } catch (error) {
    throw new ErrorResponse('Failed to upload image', 500);
  }
}
