import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

export const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const dest = './uploads/profile-pic';
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
};

export const multerConfigActividades = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const dest = './temp-uploads/actividades';
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      // Formato simple: timestamp-random-originalname
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
};

