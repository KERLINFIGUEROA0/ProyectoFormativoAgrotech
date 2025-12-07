---
title: "Módulo Notifications"
---

# Módulo Notifications

## Funcionalidades Avanzadas

- **Notificaciones en Tiempo Real**: Comunicación bidireccional vía WebSocket
- **Eventos del Sistema**: Notificación de cambios importantes
- **Actualización de Permisos**: Notificación automática de cambios de acceso
- **Alertas del Sistema**: Comunicación de eventos críticos

## Flujo de Trabajo

1. **Conexión**: Cliente establece conexión WebSocket
2. **Escucha**: Sistema espera eventos del servidor
3. **Notificación**: Servidor emite eventos a clientes conectados
4. **Actualización**: Cliente procesa y actualiza interfaz

## Integración con Otros Módulos

- **Usuarios Permisos**: Notificación de cambios de permisos
- **MQTT**: Alertas de sensores fuera de rango
- **Authorization**: Actualización de acceso en tiempo real
- **WebSocket**: Comunicación bidireccional con frontend