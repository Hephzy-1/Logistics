// multerConfig.ts
import multer from 'multer';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 16 * 1024 * 1024 }, 
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
    console.log('Multer file filter executed');
  },
});

export default upload;