// Ejemplo de endpoint de health para tu backend
// Agrega este código a tu servidor backend para habilitar pruebas de conectividad

const express = require('express');
const app = express();

// Endpoint de health (agregar a tu servidor existente)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    message: 'Backend AgroTech funcionando correctamente',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Endpoint de información del servidor
app.get('/api/info', (req, res) => {
  res.status(200).json({
    name: 'AgroTech Backend',
    version: '1.0.0',
    endpoints: [
      'GET /health - Verificar estado del servidor',
      'POST /auth/login - Iniciar sesión',
      'GET /usuarios/perfil - Obtener perfil de usuario',
      // Agregar otros endpoints de tu API aquí
    ]
  });
});

console.log('✅ Endpoints de health agregados:');
console.log('   GET /health');
console.log('   GET /api/info');

// Iniciar servidor (si este archivo se ejecuta directamente)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app;