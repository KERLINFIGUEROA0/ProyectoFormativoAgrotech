import { DateTime } from 'luxon';

export class DateUtil {
  /**
   * Obtener fecha actual en Colombia como objeto Date (para TypeORM)
   */
  static getCurrentDate(): Date {
    return DateTime.now().setZone('America/Bogota').toJSDate();
  }

  /**
   * Obtener fecha actual en Colombia como ISO String (para enviar al Frontend)
   */
  static getCurrentISO(): string {
    return DateTime.now().setZone('America/Bogota').toISO() || '';
  }

  /**
   * Convertir una fecha que viene del frontend a hora Colombia
   */
  static fromISO(date: string): Date {
    return DateTime.fromISO(date).setZone('America/Bogota').toJSDate();
  }

  /**
   * Convertir una fecha Date a zona horaria de Colombia
   */
  static toColombiaTime(date: Date): Date {
    return DateTime.fromJSDate(date).setZone('America/Bogota').toJSDate();
  }
}