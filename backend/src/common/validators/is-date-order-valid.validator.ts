import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsDateOrderValid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isDateOrderValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const fechaInicio = (args.object as any).fechaInicio;
          const fechaFinal = (args.object as any).fechaFinal;
          if (!fechaInicio || !fechaFinal) return true; // Allow if one is missing
          return new Date(fechaInicio) <= new Date(fechaFinal);
        },
        defaultMessage(args: ValidationArguments) {
          return 'La fecha de inicio debe ser anterior o igual a la fecha final';
        },
      },
    });
  };
}