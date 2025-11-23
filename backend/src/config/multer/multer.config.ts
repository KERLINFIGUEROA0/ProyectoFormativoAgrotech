import { diskStorage } from 'multer';

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads/profile-pic',

    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
};

export const multerConfigActividades = {
  storage: diskStorage({
    destination: './temp-uploads/actividades',
    filename: (req, file, cb) => {
      // Formato simple: timestamp-random-originalname
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
};

