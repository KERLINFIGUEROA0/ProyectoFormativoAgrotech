import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);

  constructor(private readonly mailerService: MailerService) {}

  async enviarLink(destino: string, url: string) {
    try {
      const info = await this.mailerService.sendMail({
        to: destino,
        subject: 'Recuperación de contraseña - AgroTech',
        template: './recuperar', // usar recuperar.hbs
        context: { url },
      });

      this.logger.log(`Correo enviado: ${info.messageId}`);
      return { success: true, info };
    } catch (err) {
      this.logger.error('Error enviando correo', err);
      throw err;
    }
  }
}

