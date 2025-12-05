import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsObject,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Función de validación personalizada para tópicos
function IsValidTopico(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidTopico',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!Array.isArray(value)) return false;

          return value.every((item: any) => {
            // Puede ser un string
            if (typeof item === 'string') return true;

            // O puede ser un objeto con topic y opcionalmente min/max
            if (typeof item === 'object' && item !== null) {
              const hasTopic = typeof item.topic === 'string' && item.topic.trim().length > 0;
              const hasValidMin = item.min === undefined || (typeof item.min === 'number' && item.min >= 0);
              const hasValidMax = item.max === undefined || (typeof item.max === 'number' && item.max >= 0);

              return hasTopic && hasValidMin && hasValidMax;
            }

            return false;
          });
        },
        defaultMessage(args: ValidationArguments) {
          return 'Cada tópico debe ser un string o un objeto con topic (string requerido) y min/max (números opcionales >= 0)';
        },
      },
    });
  };
}

// Clase auxiliar para configuración personalizada de tópicos
export class TopicoConfigDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  min?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  max?: number;
}

export class CreateBrokerDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  protocolo: string;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  puerto: number;

  @IsString()
  @IsOptional()
  usuario?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsInt()
  @IsNotEmpty()
  loteId: number;

  @IsString()
  @IsOptional()
  prefijoTopicos?: string;

  @IsArray()
  @IsOptional()
  @IsValidTopico()
  @Transform(({ value }) => {
    if (!Array.isArray(value)) return value;
    return value.map(item => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        return {
          topic: item.topic,
          min: item.min !== undefined ? Number(item.min) : undefined,
          max: item.max !== undefined ? Number(item.max) : undefined,
        };
      }
      return item;
    });
  })
  topicosAdicionales?: (string | TopicoConfigDto)[];
}