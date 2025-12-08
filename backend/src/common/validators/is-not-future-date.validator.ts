import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsNotFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // Allow empty values
          const date = new Date(value);
          const now = new Date();
          now.setHours(0, 0, 0, 0); // Set to start of day
          return date <= now;
        },
        defaultMessage(args: ValidationArguments) {
          return 'La fecha no puede ser futura';
        },
      },
    });
  };
}