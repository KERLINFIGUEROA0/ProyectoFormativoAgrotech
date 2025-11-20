#!/usr/bin/env node

/**
 * Script para probar la conexión con el backend desde diferentes plataformas
 * 
 * Uso:
 * node scripts/test-connection.js [url_backend]
 * 
 * Ejemplo:
 * node scripts/test-connection.js http://192.168.1.100:3000
 */

const axios = require('axios');

const DEFAULT_BACKEND_URL = process.argv[2] || 'http://localhost:3000';
const TEST_ENDPOINTS = [
  '/health',
  '/auth/test',
  '/usuarios/perfil'
];

async function testConnection(url) {
  console.log(`🔍 Probando conexión con: ${url}`);
  console.log('=' .repeat(50));
  
  const results = {
    url,
    timestamp: new Date().toISOString(),
    success: true,
    tests: []
  };
  
  for (const endpoint of TEST_ENDPOINTS) {
    try {
      console.log(`\n📡 Probando: ${endpoint}`);
      
      const fullUrl = `${url}${endpoint}`;
      const response = await axios.get(fullUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': 'AgroTech-Mobile-Test/1.0'
        }
      });
      
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
      
      results.tests.push({
        endpoint,
        status: 'success',
        statusCode: response.status,
        responseTime: response.headers['x-response-time'] || 'N/A'
      });
      
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
      
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Response: ${error.response.data?.message || error.response.statusText}`);
        
        results.tests.push({
          endpoint,
          status: 'error',
          statusCode: error.response.status,
          error: error.response.data?.message || error.response.statusText
        });
      } else {
        console.log(`   Error Type: ${error.code || 'UNKNOWN'}`);
        
        results.tests.push({
          endpoint,
          status: 'error',
          error: error.code || error.message
        });
      }
    }
  }
  
  // Verificar si al menos una prueba fue exitosa
  results.success = results.tests.some(test => test.status === 'success');
  
  console.log('\n' + '=' .repeat(50));
  console.log(`🎯 Resultado General: ${results.success ? '✅ CONEXIÓN EXITOSA' : '❌ FALLO DE CONEXIÓN'}`);
  
  if (results.success) {
    console.log('\n📱 Configuración móvil sugerida:');
    console.log(`VITE_MOBILE_BACKEND_URL=${url}`);
    console.log('\n🖥️  Para emulador Android:');
    console.log(`VITE_EMULATOR_BACKEND_URL=http://10.0.2.2:3000`);
  } else {
    console.log('\n⚠️  Soluciones sugeridas:');
    console.log('1. Verifica que el backend esté ejecutándose');
    console.log('2. Verifica la IP y puerto del backend');
    console.log('3. Verifica configuración CORS en el backend');
    console.log('4. Verifica conectividad de red');
  }
  
  return results;
}

// Función para probar múltiples URLs
async function testMultipleUrls() {
  const urls = [
    'http://localhost:3000',
    'http://192.168.1.100:3000',
    'http://10.0.2.2:3000',
    process.argv[2] || ''
  ].filter(Boolean);
  
  const results = [];
  
  for (const url of urls) {
    try {
      const result = await testConnection(url);
      results.push(result);
      
      if (result.success) {
        console.log(`\n🎉 ¡Conexión exitosa encontrada en: ${url}`);
        break;
      }
    } catch (error) {
      console.error(`❌ Error probando ${url}:`, error.message);
    }
  }
  
  return results;
}

// Ejecutar pruebas
if (require.main === module) {
  console.log('🚀 Iniciando pruebas de conectividad...\n');
  
  if (process.argv[2]) {
    testConnection(process.argv[2])
      .then(() => process.exit(0))
      .catch(error => {
        console.error('💥 Error inesperado:', error);
        process.exit(1);
      });
  } else {
    testMultipleUrls()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('💥 Error inesperado:', error);
        process.exit(1);
      });
  }
}

module.exports = { testConnection, testMultipleUrls };