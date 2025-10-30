import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';

@Module({
  providers: [PdfService],
  exports: [PdfService], // Lo exportamos para que otros módulos puedan usarlo
})
export class PdfModule {}