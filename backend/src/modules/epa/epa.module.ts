import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EpaService } from './epa.service';
import { HttpModule } from '@nestjs/axios'; 
import { EpaController } from './epa.controller';
import { Epa } from './entities/epa.entity';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Epa]),
    HttpModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/epa-pic', // Nueva carpeta para imágenes de EPA
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${file.originalname.replace(
            /\s/g,
            '_',
          )}`;
          cb(null, uniqueName);
        },
      }),
    }),
  ],
  controllers: [EpaController],
  providers: [EpaService],
})
export class EpaModule {}