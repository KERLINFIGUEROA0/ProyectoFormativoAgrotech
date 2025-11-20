# Configuración de Conexión Móvil - AgroTech

Esta guía explica cómo configurar la conexión entre la APK móvil y el backend de AgroTech.

## 📱 Configuración de Variables de Entorno

### 1. Variables Obligatorias

Edita el archivo `.env` con las siguientes variables:

```env
# Configuración móvil (OBLIGATORIO - Cambia la IP)
VITE_MOBILE_BACKEND_URL=http://192.168.1.100:3000

# Para emulador Android (emulador)
VITE_EMULATOR_BACKEND_URL=http://10.0.2.2:3000

# Para emulador iOS (emulador)
VITE_IOS_BACKEND_URL=http://localhost:3000

# Configuración de producción
VITE_PRODUCTION_BACKEND_URL=https://tu-backend-production.com
```

⚠️ **IMPORTANTE**: Cambia `192.168.1.100` por la IP real de tu computadora en la red local.

### 2. Cómo encontrar tu IP local

**En Windows:**
```cmd
ipconfig
```

**En Mac/Linux:**
```bash
ifconfig
```

Busca la IP que comienza con `192.168.` o `10.0.0.`

## 🔧 Configuración CORS en el Backend

### Para Node.js/Express

```javascript
const cors = require('cors');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',    // Vite dev server
    'http://192.168.1.100:5173', // IP local con puerto
    'capacitor://localhost',     // Capacitor local
    'http://localhost:3000',     // Backend local
    'http://10.0.2.2:3000',     // Emulador Android
    // Agrega aquí las URLs de producción
    'https://tu-dominio.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Time']
}));

// Para desarrollo móvil (permite todas las IPs locales)
if (process.env.NODE_ENV === 'development') {
  app.use(cors({
    origin: true, // Permite todas las orígenes en desarrollo
    credentials: true
  }));
}
```

### Para otros frameworks

**Django:**
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://192.168.1.100:5173",
    "http://10.0.2.2:3000",
    # Agregar URLs de producción
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = ['content-type', 'authorization', 'x-request-time']
```

**Spring Boot:**
```java
@CrossOrigin(origins = {
    "http://localhost:5173",
    "http://192.168.1.100:5173", 
    "http://10.0.2.2:3000",
    // URLs de producción
})
```

## 🚀 Endpoint de Salud (Health Check)

Asegúrate de que tu backend tenga un endpoint de salud:

```javascript
// Ejemplo para Node.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});
```

## 📡 Verificar Conectividad

### 1. Script de Prueba

Ejecuta el script incluido para verificar la conectividad:

```bash
# Instalar dependencias si es necesario
npm install axios

# Probar conexión específica
node scripts/test-connection.js http://192.168.1.100:3000

# Probar múltiples URLs automáticamente
node scripts/test-connection.js
```

### 2. Prueba Manual

Abre una terminal y ejecuta:

```bash
curl http://192.168.1.100:3000/health
curl http://10.0.2.2:3000/health
```

## 🔒 Configuración de Autenticación

### Headers Necesarios

La APK enviará automáticamente estos headers:

```javascript
Authorization: Bearer <token>
Content-Type: application/json
X-Request-Time: <timestamp>
```

### WebSocket Configuration

Para conexiones en tiempo real:

```javascript
// En el contexto de autenticación
const wsUrl = isNative 
  ? 'ws://192.168.1.100:3000' 
  : 'ws://localhost:3000';

const socket = io(wsUrl, {
  extraHeaders: {
    Authorization: `Bearer ${token}`
  }
});
```

## 📲 Configuración por Plataforma

### Android Emulator
- **URL**: `http://10.0.2.2:3000`
- **WebSocket**: `ws://10.0.2.2:3000`
- **Cleartext**: Habilitar en `capacitor.config.ts`

### iOS Simulator  
- **URL**: `http://localhost:3000`
- **WebSocket**: `ws://localhost:3000`

### Dispositivo Físico
- **URL**: `http://192.168.1.100:3000` (IP de tu computadora)
- **WebSocket**: `ws://192.168.1.100:3000`

## 🛠️ Troubleshooting

### Error: "Network Error"
1. Verifica que el backend esté ejecutándose
2. Verifica la IP y puerto
3. Verifica configuración CORS
4. Verifica firewall/antivirus

### Error: "CORS policy"
1. Verifica configuración CORS en backend
2. Asegúrate de que la IP esté en la lista de orígenes permitidos
3. Para desarrollo, usar `origin: true`

### Error: "Connection refused"
1. Verifica que el backend esté escuchando en el puerto correcto
2. Verifica firewall de Windows
3. Para emulador, usar `10.0.2.2` en lugar de `localhost`

### Error: "Timeout"
1. Verifica conectividad de red
2. Verifica que no haya proxy corporativo
3. Verifica DNS

## 🚀 Deployment Producción

### Variables de Producción

```env
VITE_PRODUCTION_BACKEND_URL=https://api.agrotech.com
VITE_PRODUCTION_WS_URL=wss://api.agrotech.com
```

### Backend CORS Producción

```javascript
app.use(cors({
  origin: [
    'https://agrotech.com',
    'https://www.agrotech.com',
    'capacitor://localhost', // Para APK
    // IPs específicas si es necesario
  ],
  credentials: true
}));
```

## 📞 Soporte

Si sigues teniendo problemas:

1. Ejecuta el script de prueba
2. Revisa los logs del navegador (F12)
3. Verifica configuración de red
4. Consulta la documentación de tu framework backend

---

**Nota**: Esta configuración está optimizada para desarrollo. Para producción, usa URLs HTTPS y configura apropiadamente certificados SSL.