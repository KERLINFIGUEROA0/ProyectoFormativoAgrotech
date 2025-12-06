import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../config/api';

const { width } = Dimensions.get('window');

const ReportesSensoresScreen = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cultivos, setCultivos] = useState([]);
  const [surcos, setSurcos] = useState([]);

  // Filtros
  const [scope, setScope] = useState('cultivo');
  const [scopeId, setScopeId] = useState(null);
  const [timeFilter, setTimeFilter] = useState('day');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cultivosRes, surcosRes] = await Promise.all([
        api.get('/cultivos/listar'),
        api.get('/sublotes/listar')
      ]);
      setCultivos(cultivosRes.data.data || []);
      setSurcos(surcosRes.data.data || []);
    } catch (error) {
      console.error('Error loading data', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    }
  };

  const getScopeName = () => {
    if (scope === 'cultivo') {
      const cultivo = cultivos.find(c => c.id === scopeId);
      return cultivo ? cultivo.nombre : 'Desconocido';
    } else {
      const surco = surcos.find(s => s.id === scopeId);
      return surco ? surco.nombre : 'Desconocido';
    }
  };

  const generateReport = async () => {
    if (!scopeId) {
      Alert.alert('Error', 'Selecciona un cultivo o surco');
      return;
    }

    if ((timeFilter === 'date' || timeFilter === 'month') && !selectedDate) {
      Alert.alert('Error', 'Selecciona una fecha');
      return;
    }

    setLoading(true);
    try {
      const params = {
        scope,
        scopeId,
        timeFilter,
        date: selectedDate || undefined
      };

      const response = await api.post('/informacion-sensor/reporte', params);
      setReportData(response.data);

      Alert.alert('Éxito', 'Reporte generado exitosamente');
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', `Error al generar el reporte: ${error.response?.data?.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    date.setHours(date.getHours() - 5);
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStatisticsCard = (sensor) => (
    <View key={sensor.sensorId} style={styles.sensorCard}>
      <Text style={styles.sensorTitle}>{sensor.sensorName}</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{sensor.statistics.min.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Mínimo</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#DC2626' }]}>{sensor.statistics.max.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Máximo</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{sensor.statistics.average.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Promedio</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{sensor.statistics.standardDeviation.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Desv. Estándar</Text>
        </View>
      </View>

      {sensor.alertas.length > 0 && (
        <View style={styles.alertsContainer}>
          <Text style={styles.alertsTitle}>🚨 Alertas de Pronósticos</Text>
          {sensor.alertas.map((alerta, index) => (
            <Text key={index} style={styles.alertText}>• {alerta}</Text>
          ))}
        </View>
      )}

      <View style={styles.chartPlaceholder}>
        <Ionicons name="bar-chart" size={48} color="#D1D5DB" />
        <Text style={styles.chartText}>Gráfico de datos</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="file-text" size={32} color="#3B82F6" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Reportes Avanzados de Sensores</Text>
            <Text style={styles.headerSubtitle}>Análisis estadístico y visualización de datos IoT</Text>
          </View>
        </View>
      </View>

      {/* FILTROS */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Alcance</Text>
            <View style={styles.selectContainer}>
              <TouchableOpacity
                style={[styles.selectOption, scope === 'cultivo' && styles.selectOptionSelected]}
                onPress={() => {
                  setScope('cultivo');
                  setScopeId(null);
                }}
              >
                <Text style={[styles.selectText, scope === 'cultivo' && styles.selectTextSelected]}>
                  Cultivo General
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectOption, scope === 'surco' && styles.selectOptionSelected]}
                onPress={() => {
                  setScope('surco');
                  setScopeId(null);
                }}
              >
                <Text style={[styles.selectText, scope === 'surco' && styles.selectTextSelected]}>
                  Surco Individual
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>
              {scope === 'cultivo' ? 'Cultivo' : 'Surco'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scopeSelector}>
              {scope === 'cultivo' && cultivos.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.scopeOption, scopeId === c.id && styles.scopeOptionSelected]}
                  onPress={() => setScopeId(c.id)}
                >
                  <Text style={[styles.scopeText, scopeId === c.id && styles.scopeTextSelected]}>
                    {c.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
              {scope === 'surco' && surcos.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.scopeOption, scopeId === s.id && styles.scopeOptionSelected]}
                  onPress={() => setScopeId(s.id)}
                >
                  <Text style={[styles.scopeText, scopeId === s.id && styles.scopeTextSelected]}>
                    {s.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Filtro de Tiempo</Text>
            <View style={styles.selectContainer}>
              {[
                { id: 'day', label: 'Día Actual' },
                { id: 'date', label: 'Fecha Específica' },
                { id: 'month', label: 'Mes Completo' }
              ].map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.selectOption, timeFilter === option.id && styles.selectOptionSelected]}
                  onPress={() => setTimeFilter(option.id)}
                >
                  <Text style={[styles.selectText, timeFilter === option.id && styles.selectTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {(timeFilter === 'date' || timeFilter === 'month') && (
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>
                {timeFilter === 'date' ? 'Fecha' : 'Mes y Año'}
              </Text>
              <TouchableOpacity style={styles.dateInput}>
                <Text style={styles.dateText}>
                  {selectedDate || 'Seleccionar fecha'}
                </Text>
                <Ionicons name="calendar" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.generateButton, loading && styles.buttonDisabled]}
            onPress={generateReport}
            disabled={loading || !scopeId}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="bar-chart" size={18} color="#fff" />
                <Text style={styles.generateButtonText}>Generar Reporte</Text>
              </>
            )}
          </TouchableOpacity>

          {reportData && (
            <TouchableOpacity
              style={[styles.downloadButton, downloading && styles.buttonDisabled]}
              onPress={() => Alert.alert('Info', 'Funcionalidad de descarga próximamente')}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="download" size={18} color="#fff" />
                  <Text style={styles.downloadButtonText}>Descargar PDF</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* RESULTADOS */}
      {reportData && (
        <View style={styles.resultsContainer}>
          {/* RESUMEN */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen del Reporte</Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Alcance</Text>
                <Text style={styles.summaryValue}>
                  {reportData.scope === 'cultivo' ? 'Cultivo General' : 'Surco Individual'}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>{scope === 'cultivo' ? 'Cultivo' : 'Surco'}</Text>
                <Text style={styles.summaryValue}>{getScopeName()}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Período</Text>
                <Text style={styles.summaryValue}>
                  {formatDate(reportData.dateRange.start)} - {formatDate(reportData.dateRange.end)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Sensores Analizados</Text>
                <Text style={styles.summaryValue}>{reportData.sensors.length}</Text>
              </View>
            </View>
          </View>

          {/* GRÁFICOS POR SENSOR */}
          <View style={styles.sensorsGrid}>
            {reportData.sensors.map(renderStatisticsCard)}
          </View>
        </View>
      )}

      {!reportData && !loading && (
        <View style={styles.emptyContainer}>
          <Ionicons name="filter" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>Configura los filtros y genera un reporte</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterRow: {
    gap: 16,
  },
  filterItem: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  selectContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  selectOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  selectText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectTextSelected: {
    color: '#fff',
  },
  scopeSelector: {
    marginTop: 8,
  },
  scopeOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  scopeOptionSelected: {
    backgroundColor: '#10B981',
  },
  scopeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  scopeTextSelected: {
    color: '#fff',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resultsContainer: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: width * 0.4,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sensorsGrid: {
    gap: 16,
  },
  sensorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sensorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    minWidth: width * 0.4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  alertsContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  alertsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  alertText: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 4,
  },
  chartPlaceholder: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chartText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default ReportesSensoresScreen;