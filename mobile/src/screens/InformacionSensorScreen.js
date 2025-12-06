import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getSensores, getInformacionSensoresLatest, insertTestDataForSensor } from '../config/api';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const { width } = Dimensions.get('window');

const InformacionSensorScreen = () => {
  const [latestData, setLatestData] = useState([]);
  const [sensorHistories, setSensorHistories] = useState({});
  const [sensores, setSensores] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [sublotes, setSublotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modoVista, setModoVista] = useState('GENERAL');
  const [filtroId, setFiltroId] = useState('TODOS');
  const [surcoSeleccionado, setSurcoSeleccionado] = useState('TODOS');
  const [historySensor, setHistorySensor] = useState(null);
  const [sensoresGrafica, setSensoresGrafica] = useState([]);
  const [paginaSensores, setPaginaSensores] = useState(0);
  const [isSystemRecording, setIsSystemRecording] = useState(true);
  const tarjetasPorPagina = 4;

  useEffect(() => {
    loadStructure();
  }, []);

  useEffect(() => {
    if (sensores.length > 0) {
      fetchData();
      const interval = setInterval(fetchData, 2000);
      return () => clearInterval(interval);
    }
  }, [filtroId, surcoSeleccionado, sensores.length]);

  const loadStructure = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [sensoresRes, lotesRes, sublotesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/sensores/listar`, { headers }),
        axios.get(`${API_BASE_URL}/lotes/listar`, { headers }),
        axios.get(`${API_BASE_URL}/sublotes/listar`, { headers })
      ]);
      setSensores(sensoresRes.data.data || []);
      setLotes(lotesRes.data.data || []);
      setSublotes(sublotesRes.data.data || []);
    } catch (error) {
      console.error('Error cargando estructura', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const toggleSystemRecording = async () => {
    if (!currentLote) return;

    const newState = !isSystemRecording;
    try {
      const token = await AsyncStorage.getItem('access_token');
      await axios.patch(`${API_BASE_URL}/lotes/actualizar/${currentLote.id}`, {
        activo_mqtt: newState
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsSystemRecording(newState);
      Alert.alert('Éxito', newState ? 'Grabación activada' : 'Grabación pausada');
    } catch (error) {
      console.error('Error cambiando estado del lote', error);
      Alert.alert('Error', 'No se pudo cambiar el estado del lote');
    }
  };

  const generateTestData = async () => {
    if (sensores.length === 0) {
      Alert.alert('Error', 'No hay sensores disponibles para generar datos de prueba');
      return;
    }

    try {
      const promises = sensores.slice(0, 3).map(sensor => insertTestDataForSensor(sensor.id));
      await Promise.all(promises);
      Alert.alert('Éxito', 'Datos de prueba generados para los primeros 3 sensores');
      // Refrescar datos
      fetchData();
    } catch (error) {
      console.error('Error generando datos de prueba', error);
      Alert.alert('Error', 'No se pudieron generar datos de prueba');
    }
  };

  const currentLote = useMemo(() => {
    if (modoVista === 'LOTE' && filtroId !== 'TODOS') {
      return lotes.find(l => l.id === filtroId);
    }
    return null;
  }, [lotes, filtroId, modoVista]);

  const fetchData = async () => {
    if (historySensor) return;

    try {
      console.log('🔍 Fetching sensor data...');
      const response = await getInformacionSensoresLatest();
      console.log('✅ Sensor data received:', response);
      setLatestData(response || []);
    } catch (error) {
      console.error('❌ Error fetching sensor data:', error);
      // Si hay error de autenticación, mostrar mensaje
      if (error.response?.status === 401) {
        Alert.alert('Error de autenticación', 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else {
        Alert.alert('Error', 'No se pudieron cargar los datos de sensores');
      }
    }
  };

  const getDisplayData = (sensor, valor) => {
    const name = sensor.nombre.toLowerCase();
    const topic = sensor.topic?.toLowerCase() || '';
    if (name.includes('luz') || topic.includes('luz')) return { valor: valor !== null ? valor * 100 : null, unit: 'lux' };
    if (name.includes('temperatura') || topic.includes('temperatura')) return { valor, unit: '°C' };
    if (name.includes('humedad')) return { valor, unit: '%' };
    return { valor, unit: '' };
  };

  const getStatusColor = (sensor, latestDataItem) => {
    const rawValor = latestDataItem ? latestDataItem.valor : null;
    const isDisconnected = latestDataItem?.estado === 'Desconectado';
    const min = sensor.nombre.toLowerCase().includes('luz') ? sensor.valor_minimo_alerta * 100 : sensor.valor_minimo_alerta;
    const max = sensor.nombre.toLowerCase().includes('luz') ? sensor.valor_maximo_alerta * 100 : sensor.valor_maximo_alerta;

    if (isDisconnected) return '#DC3545';
    if (rawValor !== null) {
      if (rawValor < Number(min)) return '#FFC107';
      if (rawValor > Number(max)) return '#DC3545';
    }
    return '#28A745';
  };

  const sensoresFiltrados = useMemo(() => {
    let res = sensores.map(s => {
      const sensorData = latestData.find(d => d.id === s.id);
      return {
        ...s,
        latestData: sensorData ? {
          ...sensorData,
          // Mapear campos del backend al formato esperado por el frontend
          valor_minimo_alerta: sensorData.valorMinimo || s.valor_minimo_alerta,
          valor_maximo_alerta: sensorData.valorMaximo || s.valor_maximo_alerta,
          fechaRegistro: sensorData.fechaRegistro
        } : null
      };
    });

    if (modoVista === 'GENERAL') {
      if (filtroId !== 'TODOS') {
        res = res.filter(s => s.lote?.id === filtroId);
      }
      return res;
    }

    if (modoVista === 'LOTE') {
      res = res.filter(s => s.lote?.id === filtroId);
      if (surcoSeleccionado !== 'TODOS') {
        res = res.filter(s => s.surco?.id === surcoSeleccionado);
      }
    }

    return res;
  }, [sensores, latestData, modoVista, filtroId, surcoSeleccionado]);

  const sensoresPaginaActual = useMemo(() => {
    const inicio = paginaSensores * tarjetasPorPagina;
    const fin = inicio + tarjetasPorPagina;
    return sensoresFiltrados.slice(inicio, fin);
  }, [sensoresFiltrados, paginaSensores, tarjetasPorPagina]);

  const totalPaginas = Math.ceil(sensoresFiltrados.length / tarjetasPorPagina);

  const renderSensorCard = ({ item }) => {
    const latestDataItem = item.latestData;
    const rawValor = latestDataItem ? latestDataItem.valor : null;
    const isDisconnected = latestDataItem?.estado === 'Desconectado';
    const { valor, unit } = getDisplayData(item, rawValor);

    const min = item.nombre.toLowerCase().includes('luz') ? item.valor_minimo_alerta * 100 : item.valor_minimo_alerta;
    const max = item.nombre.toLowerCase().includes('luz') ? item.valor_maximo_alerta * 100 : item.valor_maximo_alerta;

    let valorColor = "#374151";
    let alertMessage = null;
    let cardBorderColor = "transparent";
    let bellColor = "#6B7280";

    if (isDisconnected) {
      valorColor = "#DC2626";
      alertMessage = "DESCONECTADO";
      cardBorderColor = "#DC2626";
      bellColor = "#DC2626";
    } else if (valor !== null) {
      if (valor < Number(min)) {
        valorColor = "#2563EB";
        alertMessage = "BAJO";
        cardBorderColor = "#2563EB";
        bellColor = "#2563EB";
      } else if (valor > Number(max)) {
        valorColor = "#DC2626";
        alertMessage = "ALTO";
        cardBorderColor = "#DC2626";
        bellColor = "#DC2626";
      }
    }

    if (!isSystemRecording && valor !== null && !isDisconnected) {
      valorColor = "#6B7280";
      alertMessage = null;
    }

    const isActive = item.estado === 'Activo';

    return (
      <View style={[styles.sensorCard, {
        borderColor: cardBorderColor,
        borderWidth: cardBorderColor !== 'transparent' ? 2 : 0,
        shadowColor: cardBorderColor !== 'transparent' ? cardBorderColor : '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }]}>
        <View style={styles.cardBackground} />

        <View style={styles.cardContent}>
          <View style={styles.sensorHeader}>
            <View style={styles.sensorInfo}>
              <View style={[styles.bellIcon, { backgroundColor: `${bellColor}20` }]}>
                <Ionicons name="pulse" size={20} color={bellColor} />
              </View>
              <View style={styles.sensorDetails}>
                <Text style={styles.sensorName} numberOfLines={1}>{item.nombre}</Text>
                <View style={[styles.statusBadge, {
                  backgroundColor: isDisconnected ? '#FEF2F2' : isActive ? '#F0FDF4' : '#F9FAFB',
                  borderColor: isDisconnected ? '#FECACA' : isActive ? '#BBF7D0' : '#E5E7EB'
                }]}>
                  <Text style={[styles.statusText, {
                    color: isDisconnected ? '#DC2626' : isActive ? '#16A34A' : '#6B7280'
                  }]}>
                    ● {isDisconnected ? 'DESCONECTADO' : isActive ? 'ACTIVO' : 'INACTIVO'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-vertical" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.sensorValueContainer}>
            {valor !== null ? (
              <>
                <View style={styles.valueRow}>
                  <Text style={[styles.valueText, { color: valorColor }]}>
                    {Number(valor).toFixed(1)}
                  </Text>
                  <Text style={styles.unitText}>{unit}</Text>
                </View>

                {!isSystemRecording ? (
                  <View style={styles.alertBadge}>
                    <Ionicons name="pause" size={12} color="#F59E0B" />
                    <Text style={styles.alertText}>⏸️ Congelado</Text>
                  </View>
                ) : alertMessage ? (
                  <View style={[styles.alertBadge, {
                    backgroundColor: alertMessage === 'ALTO' ? '#FEF2F2' : '#EFF6FF',
                    borderColor: alertMessage === 'ALTO' ? '#FECACA' : '#BFDBFE'
                  }]}>
                    <Ionicons name="warning" size={12} color={alertMessage === 'ALTO' ? '#DC2626' : '#2563EB'} />
                    <Text style={[styles.alertText, {
                      color: alertMessage === 'ALTO' ? '#DC2626' : '#2563EB'
                    }]}>
                      ⚠️ {alertMessage}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.alertBadge}>
                    <View style={styles.greenDot} />
                    <Text style={styles.normalText}>✅ Normal</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noValueText}>--</Text>
                <Text style={styles.noDataText}>Sin datos</Text>
              </View>
            )}
          </View>

          <View style={styles.timestampContainer}>
            <Ionicons name="time-outline" size={12} color="#9CA3AF" />
            <Text style={styles.timestampText}>
              {latestDataItem?.fechaRegistro ?
                new Date(latestDataItem.fechaRegistro).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                '--:--'
              }
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHistoryModal = () => {
    if (!historySensor) return null;

    const sensorData = latestData.find(d => d.id === historySensor.id);

    return (
      <Modal visible={!!historySensor} animationType="slide" onRequestClose={() => setHistorySensor(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Historial: {historySensor.nombre}</Text>
            <TouchableOpacity onPress={() => setHistorySensor(null)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.historyContainer}>
            <View style={styles.historyItem}>
              <Text style={styles.historyLabel}>Valor Actual:</Text>
              <Text style={styles.historyValue}>
                {sensorData ? `${sensorData.valor} ${getDisplayData(historySensor, sensorData.valor).unit}` : 'Sin datos'}
              </Text>
            </View>

            <View style={styles.historyItem}>
              <Text style={styles.historyLabel}>Estado:</Text>
              <Text style={styles.historyValue}>
                {sensorData?.estado === 'Desconectado' ? 'Desconectado' : historySensor.estado}
              </Text>
            </View>

            <View style={styles.historyItem}>
              <Text style={styles.historyLabel}>Última actualización:</Text>
              <Text style={styles.historyValue}>
                {sensorData?.fechaRegistro ?
                  new Date(sensorData.fechaRegistro).toLocaleString() :
                  'Nunca'
                }
              </Text>
            </View>

            <View style={styles.historyItem}>
              <Text style={styles.historyLabel}>Límites de alerta:</Text>
              <Text style={styles.historyValue}>
                Mín: {historySensor.valor_minimo_alerta} | Máx: {historySensor.valor_maximo_alerta}
              </Text>
            </View>

            <View style={styles.historyItem}>
              <Text style={styles.historyLabel}>Topic MQTT:</Text>
              <Text style={styles.historyValue}>{historySensor.topic || 'Sin topic'}</Text>
            </View>

            <View style={styles.historyItem}>
              <Text style={styles.historyLabel}>Frecuencia de escaneo:</Text>
              <Text style={styles.historyValue}>{historySensor.frecuencia_escaneo}s</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2d5a27" />
        <Text>Cargando datos de sensores...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER COMPACTO */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {/* FILTROS PRINCIPALES */}
          <View style={styles.filtersContainer}>
            <View style={styles.modeSelector}>
              {[
                { id: 'GENERAL', icon: 'layers', label: 'General', color: '#10B981' },
                { id: 'LOTE', icon: 'map', label: 'Lote', color: '#F59E0B' }
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.modeButton,
                    modoVista === m.id && { backgroundColor: m.color, shadowColor: m.color }
                  ]}
                  onPress={() => {
                    setModoVista(m.id);
                    if (m.id === 'GENERAL') {
                      setFiltroId('TODOS');
                      setSurcoSeleccionado('TODOS');
                    }
                    setLatestData([]);
                    setSensorHistories({});
                    setPaginaSensores(0);
                  }}
                >
                  <Ionicons
                    name={m.icon}
                    size={16}
                    color={modoVista === m.id ? '#fff' : '#666'}
                  />
                  <Text style={[
                    styles.modeButtonText,
                    modoVista === m.id && styles.modeButtonTextActive
                  ]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* SELECTS DE FILTRO */}
            {modoVista !== 'GENERAL' && (
              <View style={styles.filterSelects}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.loteSelector}>
                  {lotes.map((lote) => (
                    <TouchableOpacity
                      key={lote.id}
                      style={[styles.loteOption, filtroId === lote.id && styles.loteOptionSelected]}
                      onPress={() => {
                        setFiltroId(lote.id);
                        setSurcoSeleccionado('TODOS');
                        setLatestData([]);
                        setSensorHistories({});
                        setPaginaSensores(0);
                      }}
                    >
                      <Text style={[styles.loteOptionText, filtroId === lote.id && styles.loteOptionTextSelected]}>
                        {lote.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {modoVista === 'LOTE' && filtroId !== 'TODOS' && (
                  <View style={styles.surcoSelector}>
                    <Text style={styles.selectorLabel}>Surco:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.surcoScroll}>
                      <TouchableOpacity
                        style={[styles.surcoOption, surcoSeleccionado === 'TODOS' && styles.surcoOptionSelected]}
                        onPress={() => {
                          setSurcoSeleccionado('TODOS');
                          setLatestData([]);
                          setSensorHistories({});
                          setPaginaSensores(0);
                        }}
                      >
                        <Text style={[styles.surcoOptionText, surcoSeleccionado === 'TODOS' && styles.surcoOptionTextSelected]}>
                          Todos los Surcos
                        </Text>
                      </TouchableOpacity>
                      {sublotes.filter(s => s.lote?.id === filtroId).map(s => (
                        <TouchableOpacity
                          key={s.id}
                          style={[styles.surcoOption, surcoSeleccionado === s.id && styles.surcoOptionSelected]}
                          onPress={() => {
                            setSurcoSeleccionado(s.id);
                            setLatestData([]);
                            setSensorHistories({});
                            setPaginaSensores(0);
                          }}
                        >
                          <Text style={[styles.surcoOptionText, surcoSeleccionado === s.id && styles.surcoOptionTextSelected]}>
                            {s.nombre}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ACCIONES */}
          <View style={styles.actionsContainer}>
            {/* BOTÓN DE CONTROL MAESTRO */}
            {modoVista === 'LOTE' && filtroId !== 'TODOS' && (
              <TouchableOpacity
                style={[styles.controlButton, {
                  backgroundColor: isSystemRecording ? '#10B981' : '#F59E0B'
                }]}
                onPress={toggleSystemRecording}
              >
                <Ionicons
                  name={isSystemRecording ? 'pause' : 'play'}
                  size={16}
                  color="#fff"
                />
                <Text style={styles.controlButtonText}>
                  {isSystemRecording ? "Pausar" : "Activar"}
                </Text>
              </TouchableOpacity>
            )}

            {/* BOTONES DE ACCIÓN */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={generateTestData}>
                <Ionicons name="flask" size={16} color="#8B5CF6" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="server" size={16} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="download" size={16} color="#10B981" />
              </TouchableOpacity>
              {modoVista === 'LOTE' && filtroId !== 'TODOS' && (
                <>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="git-branch" size={16} color="#F59E0B" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="refresh" size={16} color="#3B82F6" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* CONTENIDO PRINCIPAL */}
      <View style={[styles.contentContainer, {
        backgroundColor: isSystemRecording && filtroId !== 'TODOS' ? '#F0FDF4' : '#F9FAFB'
      }]}>
        <View style={styles.contentHeader}>
          <View style={styles.contentInfo}>
            <Text style={styles.contentTitle}>
              {modoVista === 'GENERAL' ? 'Todos los Sensores' :
               `Lote: ${lotes.find(l=>l.id===filtroId)?.nombre || 'Seleccionar'}`}
            </Text>

            {modoVista === 'LOTE' && surcoSeleccionado !== 'TODOS' && (
              <View style={styles.surcoBadge}>
                <Text style={styles.surcoBadgeText}>
                  Sublote: {sublotes.find(s=>s.id===surcoSeleccionado)?.nombre}
                </Text>
              </View>
            )}

            {/* Estado del sistema */}
            {modoVista === 'LOTE' && filtroId !== 'TODOS' && (
              <View style={styles.systemStatus}>
                {isSystemRecording ? (
                  <>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusTextActive}>GRABANDO</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="pause" size={12} color="#F59E0B" />
                    <Text style={styles.statusTextPaused}>PAUSADO</Text>
                  </>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Leyenda de Colores de Estado */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Estados:</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.legendText}>Desconectado</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#DC2626' }]} />
              <Text style={styles.legendText}>Alto</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#2563EB' }]} />
              <Text style={styles.legendText}>Bajo</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#6B7280' }]} />
              <Text style={styles.legendText}>Óptimo</Text>
            </View>
          </View>
        </View>

        {/* Mensaje cuando no hay datos */}
        {sensoresFiltrados.length > 0 && latestData.length === 0 && (
          <View style={styles.noDataMessage}>
            <Ionicons name="information-circle" size={24} color="#6B7280" />
            <Text style={styles.noDataTitle}>No hay datos de sensores</Text>
            <Text style={styles.noDataSubtitle}>
              Los sensores no han enviado datos recientemente. Puedes generar datos de prueba usando el botón de laboratorio (🧪).
            </Text>
          </View>
        )}

        {/* PAGINACIÓN HORIZONTAL DE SENSORES */}
        <View style={styles.sensorsContainer}>
          {sensoresFiltrados.length > 0 ? (
            <View style={styles.sensorsWrapper}>
              {/* Botón anterior */}
              {paginaSensores > 0 && (
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => setPaginaSensores(prev => Math.max(0, prev - 1))}
                >
                  <Ionicons name="chevron-back" size={24} color="#3B82F6" />
                </TouchableOpacity>
              )}

              {/* Contenedor de tarjetas */}
              <View style={styles.sensorsList}>
                {sensoresPaginaActual.map(sensor => (
                  <View key={sensor.id} style={styles.sensorWrapper}>
                    {renderSensorCard({ item: sensor })}
                  </View>
                ))}
              </View>

              {/* Botón siguiente */}
              {paginaSensores < totalPaginas - 1 && (
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => setPaginaSensores(prev => Math.min(totalPaginas - 1, prev + 1))}
                >
                  <Ionicons name="chevron-forward" size={24} color="#3B82F6" />
                </TouchableOpacity>
              )}

              {/* Indicador de página */}
              {totalPaginas > 1 && (
                <View style={styles.pageIndicator}>
                  {Array.from({ length: totalPaginas }, (_, i) => (
                    <View
                      key={i}
                      style={[styles.pageDot, i === paginaSensores && styles.pageDotActive]}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="filter" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Sin sensores</Text>
            </View>
          )}
        </View>
      </View>

      {/* Modal de historial */}
      {renderHistoryModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // HEADER ESTILOS
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    padding: 16,
  },
  filtersContainer: {
    marginBottom: 12,
  },
  modeSelector: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 6,
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  filterSelects: {
    gap: 8,
  },
  loteSelector: {
    marginBottom: 8,
  },
  loteOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  loteOptionSelected: {
    backgroundColor: '#10B981',
  },
  loteOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  loteOptionTextSelected: {
    color: '#fff',
  },
  surcoSelector: {
    marginTop: 8,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  surcoScroll: {
    marginTop: 4,
  },
  surcoOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  surcoOptionSelected: {
    backgroundColor: '#F59E0B',
  },
  surcoOptionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  surcoOptionTextSelected: {
    color: '#fff',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // CONTENIDO PRINCIPAL
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  contentHeader: {
    marginBottom: 16,
  },
  contentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  surcoBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  surcoBadgeText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  systemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusTextActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  statusTextPaused: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  // LEYENDA
  legend: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  // MENSAJE SIN DATOS
  noDataMessage: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  noDataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  noDataSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // SENSORES
  sensorsContainer: {
    flex: 1,
  },
  sensorsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 120,
  },
  navButton: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sensorsList: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    flex: 1,
    justifyContent: 'center',
  },
  sensorWrapper: {
    width: 240,
  },
  sensorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    height: 88,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  sensorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bellIcon: {
    padding: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  sensorDetails: {
    flex: 1,
  },
  sensorName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  moreButton: {
    padding: 4,
  },
  sensorValueContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  valueText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 4,
  },
  unitText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  normalText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  noDataContainer: {
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  noValueText: {
    fontSize: 16,
    color: '#D1D5DB',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  timestampText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    gap: 4,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  pageDotActive: {
    backgroundColor: '#3B82F6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  // MODAL
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
  },
  historyContainer: {
    flex: 1,
    padding: 20,
  },
  historyItem: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  historyValue: {
    fontSize: 16,
    color: '#111827',
  },
});

export default InformacionSensorScreen;