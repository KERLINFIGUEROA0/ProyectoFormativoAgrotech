-- Agregar columna ultimo_mqtt_mensaje a la tabla sensores
ALTER TABLE sensores ADD COLUMN ultimo_mqtt_mensaje TIMESTAMP NULL;