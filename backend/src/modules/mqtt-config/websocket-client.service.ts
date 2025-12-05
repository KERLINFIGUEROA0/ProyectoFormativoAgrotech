import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Broker } from './entities/broker.entity';
import { BrokerLote } from './entities/broker-lote.entity';
import { Sensor } from '../sensores/entities/sensore.entity';
import { InformacionSensorService } from '../informacion_sensor/informacion_sensor.service';
import * as WebSocket from 'ws';

@Injectable()
export class WebSocketClientService {
  private readonly logger = new Logger(WebSocketClientService.name);
  private activeConnections = new Map<number, WebSocket>(); // Mapa de brokerLoteId -> WebSocket

  constructor(
    @InjectRepository(Broker)
    private readonly brokerRepo: Repository<Broker>,
    @InjectRepository(BrokerLote)
    private readonly brokerLoteRepo: Repository<BrokerLote>,
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
    @Inject(forwardRef(() => InformacionSensorService))
    private readonly infoSensorService: InformacionSensorService,
  ) {}

  /**
   * Conecta a un broker WebSocket
   */
  async connectToWebSocketBroker(broker: Broker) {
    try {
      // Buscar configuraciones BrokerLote para este broker
      const brokerLotes = await this.brokerLoteRepo.find({
        where: { broker: { id: broker.id } },
        relations: ['lote']
      });

      if (brokerLotes.length === 0) {
        this.logger.warn(`No hay configuraciones BrokerLote para broker WebSocket ${broker.nombre}`);
        return;
      }

      // Para cada configuración, conectar WebSocket
      for (const brokerLote of brokerLotes) {
        await this.connectWebSocket(broker, brokerLote);
      }

      this.logger.log(`✅ Broker WebSocket ${broker.nombre} configurado con ${brokerLotes.length} conexiones`);
    } catch (error) {
      this.logger.error(`Error conectando a broker WebSocket ${broker.nombre}: ${error.message}`);
    }
  }

  /**
   * Establece conexión WebSocket para una configuración específica
   */
  private async connectWebSocket(broker: Broker, brokerLote: BrokerLote) {
    try {
      // Limpiar conexión anterior si existe
      if (this.activeConnections.has(brokerLote.id)) {
        this.activeConnections.get(brokerLote.id)?.close();
        this.activeConnections.delete(brokerLote.id);
      }

      // Construir URL WebSocket
      const protocol = broker.protocolo === 'wss' ? 'wss' : 'ws';
      const baseUrl = `${protocol}://${broker.host}:${broker.puerto}`;

      // Para WebSocket, usamos los tópicos como rutas o parámetros
      let wsUrl = baseUrl;
      if (brokerLote.topicos.length > 0) {
        // Podríamos usar el primer tópico como ruta
        const endpoint = brokerLote.topicos[0];
        wsUrl = `${baseUrl}/${endpoint}`;
      }

      this.logger.log(`🔌 Conectando WebSocket: ${wsUrl}`);

      // Configurar opciones de conexión
      const options: WebSocket.ClientOptions = {};

      // Agregar autenticación básica si existe
      if (broker.usuario && broker.password) {
        const auth = Buffer.from(`${broker.usuario}:${broker.password}`).toString('base64');
        options.headers = {
          'Authorization': `Basic ${auth}`
        };
      }

      // SSL configuration
      if (broker.sslConfig?.enabled && broker.protocolo === 'wss') {
        if (broker.sslConfig.rejectUnauthorized !== undefined) {
          options.rejectUnauthorized = broker.sslConfig.rejectUnauthorized;
        }
        if (broker.sslConfig.ca) {
          options.ca = broker.sslConfig.ca;
        }
        if (broker.sslConfig.cert) {
          options.cert = broker.sslConfig.cert;
        }
        if (broker.sslConfig.key) {
          options.key = broker.sslConfig.key;
        }
      }

      // Crear conexión WebSocket
      const ws = new WebSocket(wsUrl, options);

      // Configurar timeouts
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          this.logger.error(`Timeout conectando a WebSocket: ${wsUrl}`);
        }
      }, 10000); // 10 segundos timeout

      ws.on('open', () => {
        clearTimeout(connectionTimeout);
        this.logger.log(`✅ WebSocket conectado: ${wsUrl}`);

        // Enviar mensaje de suscripción si es necesario
        if (brokerLote.topicos.length > 1) {
          // Podríamos enviar un mensaje de suscripción con los tópicos adicionales
          const subscriptionMessage = {
            type: 'subscribe',
            topics: brokerLote.topicos.slice(1) // Excluir el primero que ya usamos como ruta
          };
          ws.send(JSON.stringify(subscriptionMessage));
        }
      });

      ws.on('message', async (data: WebSocket.RawData) => {
        try {
          const message = data.toString();
          this.logger.debug(`📨 WebSocket message received: ${message}`);

          // Procesar el mensaje usando el servicio existente
          const simulatedTopic = `ws/${brokerLote.lote.id}/${brokerLote.id}`;
          await this.infoSensorService.createFromMqtt(simulatedTopic, message);

        } catch (error) {
          this.logger.error(`Error procesando mensaje WebSocket: ${error.message}`);
        }
      });

      ws.on('error', (error) => {
        this.logger.error(`❌ Error en WebSocket ${wsUrl}: ${error.message}`);
      });

      ws.on('close', (code, reason) => {
        this.logger.warn(`🔌 WebSocket cerrado ${wsUrl} - Código: ${code}, Razón: ${reason.toString()}`);

        // Intentar reconectar después de un delay
        setTimeout(() => {
          if (broker.estado === 'Activo') {
            this.logger.log(`🔄 Intentando reconectar WebSocket: ${wsUrl}`);
            this.connectWebSocket(broker, brokerLote);
          }
        }, 5000); // 5 segundos de delay
      });

      // Ping/Pong para mantener conexión viva
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }, 30000); // Ping cada 30 segundos

      // Limpiar interval cuando se cierre
      ws.on('close', () => {
        clearInterval(pingInterval);
      });

      // Guardar la conexión
      this.activeConnections.set(brokerLote.id, ws);

    } catch (error) {
      this.logger.error(`Error creando conexión WebSocket: ${error.message}`);
    }
  }

  /**
   * Desconecta un broker WebSocket
   */
  async disconnectWebSocketBroker(brokerId: number) {
    // Buscar todas las conexiones activas para este broker
    const brokerLotes = await this.brokerLoteRepo.find({
      where: { broker: { id: brokerId } }
    });

    for (const brokerLote of brokerLotes) {
      if (this.activeConnections.has(brokerLote.id)) {
        const ws = this.activeConnections.get(brokerLote.id);
        ws?.close();
        this.activeConnections.delete(brokerLote.id);
        this.logger.log(`Desconectado WebSocket para broker lote ID: ${brokerLote.id}`);
      }
    }
  }

  /**
   * Envía un mensaje a través de WebSocket
   */
  async sendWebSocketMessage(brokerId: number, message: string): Promise<void> {
    // Buscar conexiones activas para este broker
    const brokerLotes = await this.brokerLoteRepo.find({
      where: { broker: { id: brokerId } }
    });

    for (const brokerLote of brokerLotes) {
      const ws = this.activeConnections.get(brokerLote.id);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        this.logger.log(`📤 Mensaje enviado via WebSocket para broker ${brokerId}: ${message}`);
        return; // Enviar solo al primero que encontremos
      }
    }

    throw new Error(`No hay conexión WebSocket activa para broker ${brokerId}`);
  }

  /**
   * Prueba conexión WebSocket
   */
  async testWebSocketConnection(broker: Broker, endpoint?: string): Promise<{ connected: boolean; message: string; responseTime?: number }> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      try {
        const protocol = broker.protocolo === 'wss' ? 'wss' : 'ws';
        const baseUrl = `${protocol}://${broker.host}:${broker.puerto}`;
        const testEndpoint = endpoint || '';
        const wsUrl = testEndpoint ? `${baseUrl}/${testEndpoint}` : baseUrl;

        const options: WebSocket.ClientOptions = {};

        // Agregar autenticación
        if (broker.usuario && broker.password) {
          const auth = Buffer.from(`${broker.usuario}:${broker.password}`).toString('base64');
          options.headers = {
            'Authorization': `Basic ${auth}`
          };
        }

        const ws = new WebSocket(wsUrl, options);

        const timeout = setTimeout(() => {
          ws.close();
          resolve({
            connected: false,
            message: 'Timeout: No se pudo conectar en 5 segundos'
          });
        }, 5000);

        ws.on('open', () => {
          clearTimeout(timeout);
          const responseTime = Date.now() - startTime;
          ws.close();
          resolve({
            connected: true,
            message: `Conexión exitosa (${responseTime}ms)`,
            responseTime
          });
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          const responseTime = Date.now() - startTime;
          resolve({
            connected: false,
            message: `Error: ${error.message} (${responseTime}ms)`,
            responseTime
          });
        });

      } catch (error) {
        resolve({
          connected: false,
          message: `Error de configuración: ${error.message}`
        });
      }
    });
  }
}