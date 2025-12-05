import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Broker } from './entities/broker.entity';
import { BrokerLote } from './entities/broker-lote.entity';
import { Sensor } from '../sensores/entities/sensore.entity';
import { InformacionSensorService } from '../informacion_sensor/informacion_sensor.service';
import * as https from 'https';
import * as http from 'http';

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);
  private activeConnections = new Map<number, NodeJS.Timeout>(); // Mapa de brokerLoteId -> interval

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
   * Conecta a un broker HTTP/HTTPS y configura polling
   */
  async connectToHttpBroker(broker: Broker) {
    try {
      // Buscar configuraciones BrokerLote para este broker
      const brokerLotes = await this.brokerLoteRepo.find({
        where: { broker: { id: broker.id } },
        relations: ['lote']
      });

      if (brokerLotes.length === 0) {
        this.logger.warn(`No hay configuraciones BrokerLote para broker HTTP ${broker.nombre}`);
        return;
      }

      // Para cada configuración, configurar polling
      for (const brokerLote of brokerLotes) {
        await this.setupHttpPolling(broker, brokerLote);
      }

      this.logger.log(`✅ Broker HTTP ${broker.nombre} configurado con ${brokerLotes.length} endpoints`);
    } catch (error) {
      this.logger.error(`Error conectando a broker HTTP ${broker.nombre}: ${error.message}`);
    }
  }

  /**
   * Configura polling HTTP para una configuración específica
   */
  private async setupHttpPolling(broker: Broker, brokerLote: BrokerLote) {
    // Limpiar conexión anterior si existe
    if (this.activeConnections.has(brokerLote.id)) {
      clearInterval(this.activeConnections.get(brokerLote.id));
    }

    // Configurar intervalo de polling (por defecto cada 30 segundos)
    const pollingInterval = 30000; // 30 segundos

    const interval = setInterval(async () => {
      try {
        await this.pollHttpEndpoint(broker, brokerLote);
      } catch (error) {
        this.logger.error(`Error en polling HTTP para broker ${broker.nombre}: ${error.message}`);
      }
    }, pollingInterval);

    this.activeConnections.set(brokerLote.id, interval);
    this.logger.log(`📡 Configurado polling HTTP cada ${pollingInterval/1000}s para ${broker.nombre}`);
  }

  /**
   * Realiza una petición HTTP y procesa la respuesta
   */
  private async pollHttpEndpoint(broker: Broker, brokerLote: BrokerLote): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Construir URL base
        const baseUrl = `${broker.protocolo}://${broker.host}:${broker.puerto}`;

        // Para HTTP, usamos los tópicos como endpoints relativos
        // Ejemplo: si topico es "api/sensors", la URL sería "http://host:port/api/sensors"
        const endpoint = brokerLote.topicos.length > 0 ? brokerLote.topicos[0] : '';

        if (!endpoint) {
          this.logger.warn(`No hay endpoint configurado para broker HTTP ${broker.nombre}`);
          resolve();
          return;
        }

        const url = `${baseUrl}/${endpoint}`.replace(/\/+/g, '/'); // Evitar dobles slashes

        this.logger.debug(`📡 Polling HTTP: ${url}`);

        // Configurar opciones de la petición
        const options: http.RequestOptions | https.RequestOptions = {
          method: 'GET',
          headers: {
            'User-Agent': 'Agrotech-IoT-Client/1.0',
            'Accept': 'application/json',
          },
          timeout: 10000, // 10 segundos timeout
        };

        // Agregar autenticación si existe
        if (broker.usuario && broker.password) {
          const auth = Buffer.from(`${broker.usuario}:${broker.password}`).toString('base64');
          (options.headers as any)['Authorization'] = `Basic ${auth}`;
        }

        // SSL configuration
        if (broker.sslConfig?.enabled) {
          if (broker.protocolo === 'https') {
            const httpsOptions = options as https.RequestOptions;
            httpsOptions.rejectUnauthorized = broker.sslConfig.rejectUnauthorized ?? true;

            if (broker.sslConfig.ca) {
              httpsOptions.ca = broker.sslConfig.ca;
            }
            if (broker.sslConfig.cert) {
              httpsOptions.cert = broker.sslConfig.cert;
            }
            if (broker.sslConfig.key) {
              httpsOptions.key = broker.sslConfig.key;
            }
          }
        }

        // Realizar la petición
        const client = broker.protocolo === 'https' ? https : http;
        const req = client.request(url, options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', async () => {
            try {
              if (res.statusCode === 200) {
                // Procesar la respuesta JSON
                await this.processHttpResponse(data, brokerLote);
                this.logger.debug(`✅ HTTP response received from ${url}`);
              } else {
                this.logger.warn(`HTTP ${res.statusCode} from ${url}: ${data}`);
              }
              resolve();
            } catch (error) {
              this.logger.error(`Error procesando respuesta HTTP: ${error.message}`);
              reject(error);
            }
          });
        });

        req.on('error', (error) => {
          this.logger.error(`Error en petición HTTP a ${url}: ${error.message}`);
          reject(error);
        });

        req.on('timeout', () => {
          req.destroy();
          this.logger.warn(`Timeout en petición HTTP a ${url}`);
          reject(new Error('Request timeout'));
        });

        req.end();

      } catch (error) {
        this.logger.error(`Error en pollHttpEndpoint: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Procesa la respuesta JSON de un endpoint HTTP
   */
  private async processHttpResponse(data: string, brokerLote: BrokerLote): Promise<void> {
    try {
      // Intentar parsear como JSON
      let jsonData: any;
      try {
        jsonData = JSON.parse(data);
      } catch (parseError) {
        // Si no es JSON válido, intentar procesar como valor plano
        this.logger.debug(`Respuesta HTTP no es JSON válido: ${data}`);
        // Podríamos procesar como valor único aquí si es necesario
        return;
      }

      // Procesar el JSON usando el servicio existente
      // Simulamos un tópico MQTT para reutilizar la lógica existente
      const simulatedTopic = `http/${brokerLote.lote.id}/${brokerLote.id}`;

      await this.infoSensorService.createFromMqtt(simulatedTopic, JSON.stringify(jsonData));

    } catch (error) {
      this.logger.error(`Error procesando respuesta HTTP: ${error.message}`);
    }
  }

  /**
   * Desconecta un broker HTTP
   */
  async disconnectHttpBroker(brokerId: number) {
    // Buscar todas las conexiones activas para este broker
    const brokerLotes = await this.brokerLoteRepo.find({
      where: { broker: { id: brokerId } }
    });

    for (const brokerLote of brokerLotes) {
      if (this.activeConnections.has(brokerLote.id)) {
        clearInterval(this.activeConnections.get(brokerLote.id));
        this.activeConnections.delete(brokerLote.id);
        this.logger.log(`Desconectado polling HTTP para broker lote ID: ${brokerLote.id}`);
      }
    }
  }

  /**
   * Prueba conexión HTTP
   */
  async testHttpConnection(broker: Broker, endpoint?: string): Promise<{ connected: boolean; message: string; responseTime?: number }> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      try {
        const baseUrl = `${broker.protocolo}://${broker.host}:${broker.puerto}`;
        const testEndpoint = endpoint || (broker.prefijoTopicos ? `/${broker.prefijoTopicos}` : '/');
        const url = `${baseUrl}${testEndpoint}`.replace(/\/+/g, '/');

        const options: http.RequestOptions | https.RequestOptions = {
          method: 'GET',
          headers: {
            'User-Agent': 'Agrotech-IoT-Test/1.0',
          },
          timeout: 5000, // 5 segundos para test
        };

        // Agregar autenticación
        if (broker.usuario && broker.password) {
          const auth = Buffer.from(`${broker.usuario}:${broker.password}`).toString('base64');
          (options.headers as any)['Authorization'] = `Basic ${auth}`;
        }

        const client = broker.protocolo === 'https' ? https : http;
        const req = client.request(url, options, (res) => {
          const responseTime = Date.now() - startTime;

          if (res.statusCode === 200) {
            resolve({
              connected: true,
              message: `Conexión exitosa (${responseTime}ms)`,
              responseTime
            });
          } else {
            resolve({
              connected: false,
              message: `HTTP ${res.statusCode} (${responseTime}ms)`,
              responseTime
            });
          }

          req.destroy();
        });

        req.on('error', (error) => {
          const responseTime = Date.now() - startTime;
          resolve({
            connected: false,
            message: `Error: ${error.message} (${responseTime}ms)`,
            responseTime
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            connected: false,
            message: 'Timeout: No se pudo conectar en 5 segundos'
          });
        });

        req.end();

      } catch (error) {
        resolve({
          connected: false,
          message: `Error de configuración: ${error.message}`
        });
      }
    });
  }
}