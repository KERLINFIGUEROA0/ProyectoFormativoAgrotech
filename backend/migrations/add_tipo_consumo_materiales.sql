-- Crear enum tipo_consumo
CREATE TYPE tipo_consumo_enum AS ENUM ('consumible', 'no_consumible');

-- Agregar columnas tipo_consumo, cantidad_por_unidad, cantidad_restante_unidad_actual, usos_totales y usos_actuales a la tabla materiales
ALTER TABLE materiales ADD COLUMN tipo_consumo tipo_consumo_enum NOT NULL DEFAULT 'consumible';
ALTER TABLE materiales ADD COLUMN cantidad_por_unidad INTEGER NULL;
ALTER TABLE materiales ADD COLUMN cantidad_restante_unidad_actual INTEGER NULL;
ALTER TABLE materiales ADD COLUMN usos_totales INTEGER NULL;
ALTER TABLE materiales ADD COLUMN usos_actuales INTEGER NOT NULL DEFAULT 0;