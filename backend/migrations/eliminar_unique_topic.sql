-- ============================================
-- MIGRACIÓN: Eliminar restricción UNIQUE del tópico MQTT
-- ============================================
-- Este script elimina la restricción UNIQUE de la columna mqtt_topic
-- para permitir que múltiples sensores usen el mismo tópico
-- ============================================

BEGIN;

-- Eliminar la restricción UNIQUE de mqtt_topic si existe
ALTER TABLE public.sensores 
    DROP CONSTRAINT IF EXISTS "UQ_sensores_mqtt_topic";

-- También intentar eliminar por nombre alternativo (dependiendo de cómo TypeORM lo haya creado)
DO $$
BEGIN
    -- Buscar y eliminar cualquier constraint UNIQUE en mqtt_topic
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.sensores'::regclass 
        AND contype = 'u'
        AND conkey::text LIKE '%mqtt_topic%'
    LOOP
        EXECUTE 'ALTER TABLE public.sensores DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

COMMIT;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Después de esta migración, múltiples sensores pueden usar el mismo tópico
-- 2. Cuando llegue un mensaje MQTT a un tópico, se guardará en TODOS los sensores
--    activos que tengan ese tópico y cuyo surco tenga MQTT activo
-- 3. Cada sensor guardará los datos en su propio surco/lote
-- ============================================

