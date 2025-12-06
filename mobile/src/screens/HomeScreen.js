import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { API_BASE_URL, getSensores, getInformacionSensoresLatest } from '../config/api';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, COMMON_STYLES } from '../constants/theme';
import { useScreenAnimation } from '../constants/animations';
import AnimatedButton from '../components/AnimatedButton';
import Toast from '../components/Toast';
import AnimatedLoader from '../components/AnimatedLoader';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { fadeAnim, slideAnim, animateIn } = useScreenAnimation();
  const [user, setUser] = useState(null);
  const [statsData, setStatsData] = useState({
    cultivosActivos: 0,
    movimientosRecientes: [],
    productosInventario: 0,
    sensoresActivos: 0,
    lotesStats: {
      total: 0,
      enPreparacion: 0,
      parcialmenteOcupado: 0,
      enCultivo: 0,
      enMantenimiento: 0
    }
  });
  const [latestSensors, setLatestSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  useEffect(() => {
    console.log('🏠 HomeScreen: Component mounted');
    const getUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        console.log('👤 User data retrieved:', userData ? 'present' : 'missing');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('❌ Error getting user data:', error);
      }
    };
    getUser();
    loadDashboardData();

    // Polling for sensor data
    const interval = setInterval(fetchSensorData, 2000);
    return () => {
      console.log('🏠 HomeScreen: Component unmounting');
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    console.log('🎨 HomeScreen: Loading changed to:', loading);
    if (!loading) {
      // Animar entrada cuando los datos estén cargados
      console.log('🎬 HomeScreen: Starting animateIn');
      animateIn().start();
    }
  }, [loading]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      console.log('🔍 Loading dashboard data, token:', token ? 'present' : 'missing');
      const headers = { Authorization: `Bearer ${token}` };

      const [
        cultivosRes,
        inventarioRes,
        sensorsRes,
        latestSensorsRes,
        lotesStatsRes
      ] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/cultivos/listar`, { headers }),
        axios.get(`${API_BASE_URL}/materiales`, { headers }),
        getSensores(),
        getInformacionSensoresLatest(),
        axios.get(`${API_BASE_URL}/lotes/estadisticas`, { headers }),
      ]);

      console.log('📊 API Responses:', {
        cultivos: cultivosRes.status,
        inventario: inventarioRes.status,
        sensores: sensorsRes.status,
        latestSensores: latestSensorsRes.status,
        lotesStats: lotesStatsRes.status
      });

      let cultivosActivos = 0;
      if (cultivosRes.status === 'fulfilled') {
        cultivosActivos = cultivosRes.value.data?.data?.length || 0;
      }

      let productosInventario = 0;
      if (inventarioRes.status === 'fulfilled') {
        productosInventario = inventarioRes.value.data?.data?.length || 0;
      }

      let sensoresActivos = 0;
      if (latestSensorsRes.status === 'fulfilled') {
        const sensors = latestSensorsRes.value || [];
        sensoresActivos = sensors.length;
        setLatestSensors(sensors);
      }

      let lotesStats = {
        total: 0,
        enPreparacion: 0,
        parcialmenteOcupado: 0,
        enCultivo: 0,
        enMantenimiento: 0
      };

      if (lotesStatsRes.status === 'fulfilled') {
        const stats = lotesStatsRes.value.data?.data || {};
        lotesStats = {
          total: stats.total || 0,
          enPreparacion: stats.enPreparacion || 0,
          parcialmenteOcupado: stats.parcialmenteOcupado || 0,
          enCultivo: stats.enCultivo || 0,
          enMantenimiento: stats.enMantenimiento || 0
        };
      }

      const finalStats = {
        cultivosActivos,
        movimientosRecientes: [],
        productosInventario,
        sensoresActivos,
        lotesStats,
      };

      console.log('✅ Final stats:', finalStats);
      setStatsData(finalStats);

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setStatsData({
        cultivosActivos: 0,
        movimientosRecientes: [],
        productosInventario: 0,
        sensoresActivos: 0,
        lotesStats: {
          total: 0,
          enPreparacion: 0,
          parcialmenteOcupado: 0,
          enCultivo: 0,
          enMantenimiento: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSensorData = async () => {
    try {
      const sensors = await getInformacionSensoresLatest();
      if (sensors) {
        setLatestSensors(sensors);
      }
    } catch (error) {
      console.error('❌ HomeScreen: Error fetching sensor data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
      setToast({
        visible: true,
        message: 'Datos actualizados',
        type: 'success'
      });
    } catch (error) {
      setToast({
        visible: true,
        message: 'Error al actualizar datos',
        type: 'error'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color, progress }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statContent}>
        <View style={styles.statText}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statSubtitle}>{subtitle}</Text>
        </View>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress}%`, backgroundColor: color }
          ]}
        />
      </View>
    </View>
  );

  // --- ARREGLO 1: Protección contra null/undefined en el nombre ---
  const getSensorIcon = (sensorName) => {
    const name = (sensorName || '').toLowerCase(); // Si es null, usa ''
    
    if (name.includes('temperatura') || name.includes('temp')) {
      return <MaterialIcons name="thermostat" size={24} color={COLORS.danger} />;
    }
    if (name.includes('humedad') || name.includes('hum')) {
      return <MaterialIcons name="opacity" size={24} color={COLORS.secondary} />;
    }
    if (name.includes('ph') || name.includes('acidez')) {
      return <Ionicons name="water-outline" size={24} color={COLORS.success} />;
    }
    if (name.includes('luz') || name.includes('lux')) {
      return <Ionicons name="sunny-outline" size={24} color={COLORS.warning} />;
    }
    return <Ionicons name="hardware-chip-outline" size={24} color={COLORS.gray[500]} />;
  };

  // --- ARREGLO 2: Protección contra null/undefined en el nombre ---
  const getSensorUnit = (sensorName) => {
    const name = (sensorName || '').toLowerCase(); // Si es null, usa ''
    
    if (name.includes('temperatura') || name.includes('temp')) return '°C';
    if (name.includes('humedad') || name.includes('hum')) return '%';
    if (name.includes('ph') || name.includes('acidez')) return '';
    if (name.includes('luz') || name.includes('lux')) return 'lux';
    return '';
  };

  const SensorCard = ({ sensor }) => {
    // Protección extra
    if (!sensor) return null;

    const isOffline = sensor.estado === 'Desconectado';
    const unit = getSensorUnit(sensor.nombre);
    const sensorIcon = getSensorIcon(sensor.nombre);

    return (
      <View style={[COMMON_STYLES.card, isOffline && styles.sensorCardOffline]}>
        <View style={styles.sensorHeader}>
          <View style={[styles.sensorIconContainer, isOffline && styles.sensorIconOffline]}>
            {sensorIcon}
          </View>
          <View style={styles.sensorStatus}>
            <Text style={[styles.sensorName, isOffline && styles.textOffline]}>
              {sensor.nombre || 'Sensor'}
            </Text>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, isOffline ? styles.statusDotOffline : styles.statusDotOnline]} />
              <Text style={[styles.statusText, isOffline && styles.textOffline]}>
                {isOffline ? 'OFFLINE' : 'LIVE'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.sensorValueContainer, isOffline && styles.sensorValueOffline]}>
          <Text style={[styles.sensorValue, isOffline && styles.textOffline]}>
            {isOffline ? '0' : (sensor.valor ?? '--')}{unit}
          </Text>
          <Text style={[styles.sensorLabel, isOffline && styles.textOffline]}>
            {isOffline ? 'Sin señal' : 'Valor actual'}
          </Text>
        </View>

        <Text style={[styles.sensorTime, isOffline && styles.textOffline]}>
          {sensor.fechaRegistro ? new Date(sensor.fechaRegistro).toLocaleTimeString('es-ES') : 'Sin datos'}
        </Text>
      </View>
    );
  };

  console.log('🎨 HomeScreen: Rendering, loading:', loading);

  if (loading) {
    return (
      <AnimatedLoader
        size="large"
        color={COLORS.primary}
        type="pulse"
        text="Cargando dashboard..."
        fullScreen
      />
    );
  }

  // --- ARREGLO 3: Eliminado Try-Catch alrededor del return ---
  return (
    <Animated.View
      style={[
        COMMON_STYLES.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          flex: 1, // Asegura que el contenedor ocupe el espacio
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Welcome Banner */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.welcomeBanner}
        >
          <View style={styles.welcomeContent}>
            <View>
              <Text style={styles.welcomeTitle}>
                ¡Bienvenido{user ? ` ${user.nombres?.split(' ')[0] || 'Usuario'}` : ''}!
              </Text>
              <Text style={styles.welcomeSubtitle}>Sistema de Monitoreo y Gestión Agrícola</Text>
            </View>
            <View style={styles.welcomeDate}>
              <Ionicons name="time-outline" size={20} color={COLORS.gray[100]} />
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Lotes Activos"
            value={statsData.lotesStats.enCultivo}
            subtitle={`de ${statsData.lotesStats.total} total`}
            icon={<Ionicons name="map-outline" size={24} color={COLORS.primary} />}
            color={COLORS.primary}
            progress={(statsData.lotesStats.enCultivo / Math.max(statsData.lotesStats.total, 1)) * 100}
          />

          <StatCard
            title="Cultivos Activos"
            value={statsData.cultivosActivos}
            subtitle="en producción"
            icon={<FontAwesome5 name="leaf" size={20} color={COLORS.secondary} />}
            color={COLORS.secondary}
            progress={Math.min(statsData.cultivosActivos * 10, 100)}
          />

          <StatCard
            title="Productos"
            value={statsData.productosInventario}
            subtitle="en inventario"
            icon={<Ionicons name="cube-outline" size={24} color={COLORS.warning} />}
            color={COLORS.warning}
            progress={Math.min(statsData.productosInventario * 5, 100)}
          />

          <StatCard
            title="Sensores"
            value={statsData.sensoresActivos}
            subtitle="activos"
            icon={<Ionicons name="pulse-outline" size={24} color={COLORS.info} />}
            color={COLORS.info}
            progress={Math.min(statsData.sensoresActivos * 20, 100)}
          />
        </View>

        {/* Sensor Monitoring Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="thermometer-outline" size={16} color="#3b82f6" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Sensores en Tiempo Real</Text>
              <Text style={styles.sectionSubtitle}>Monitoreo automático</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sensorsScroll}>
            {latestSensors.length > 0 ? (
              latestSensors.map((sensor, index) => (
                <SensorCard key={sensor.id || index} sensor={sensor} />
              ))
            ) : (
              <View style={styles.noData}>
                <Ionicons name="hardware-chip-outline" size={32} color="#9ca3af" />
                <Text style={styles.noDataText}>Sin datos de sensores</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Lotes Status Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="bar-chart-outline" size={16} color="#6366f1" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Estado de Lotes</Text>
              <Text style={styles.sectionSubtitle}>Distribución por estado</Text>
            </View>
          </View>
          <View style={styles.lotesGrid}>
            <View style={styles.loteStatus}>
              <View style={styles.loteCircle}>
                <Text style={styles.loteNumber}>{statsData.lotesStats.parcialmenteOcupado}</Text>
              </View>
              <Text style={styles.loteTitle}>Parcialmente Ocupado</Text>
              <Text style={styles.loteSubtitle}>Algunos cultivos</Text>
            </View>

            <View style={styles.loteStatus}>
              <View style={styles.loteCircle}>
                <Text style={styles.loteNumber}>{statsData.lotesStats.enCultivo}</Text>
              </View>
              <Text style={styles.loteTitle}>En Cultivo</Text>
              <Text style={styles.loteSubtitle}>Activos</Text>
            </View>

            <View style={styles.loteStatus}>
              <View style={styles.loteCircle}>
                <Text style={styles.loteNumber}>{statsData.lotesStats.enPreparacion}</Text>
              </View>
              <Text style={styles.loteTitle}>Preparación</Text>
              <Text style={styles.loteSubtitle}>Pendientes</Text>
            </View>

            <View style={styles.loteStatus}>
              <View style={styles.loteCircle}>
                <Text style={styles.loteNumber}>{statsData.lotesStats.enMantenimiento}</Text>
              </View>
              <Text style={styles.loteTitle}>Mantenimiento</Text>
              <Text style={styles.loteSubtitle}>Atención</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Toast Notifications */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  welcomeBanner: {
    margin: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.md,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  welcomeSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.gray[100],
  },
  welcomeDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dateText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.gray[100],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    ...SHADOWS.sm,
    width: (width - 32 - 12) / 2,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  statText: {
    flex: 1,
  },
  statTitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.gray[500],
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  statSubtitle: {
    fontSize: TYPOGRAPHY.fontSize['2xs'],
    color: COLORS.gray[400],
  },
  statIcon: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.gray[200],
    borderRadius: BORDER_RADIUS.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.sm,
  },
  section: {
    margin: SPACING.lg,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionIcon: {
    padding: SPACING.xs,
    backgroundColor: COLORS.gray[100],
    borderRadius: BORDER_RADIUS.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  sensorsScroll: {
    marginHorizontal: -4,
  },
  sensorCardOffline: {
    backgroundColor: COLORS.gray[50],
    borderColor: COLORS.gray[300],
    borderWidth: 1,
  },
  sensorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sensorIconContainer: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS['3xl'],
    backgroundColor: COLORS.gray[100],
  },
  sensorIconOffline: {
    backgroundColor: COLORS.gray[100],
  },
  sensorStatus: {
    flex: 1,
  },
  sensorName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.full,
  },
  statusDotOnline: {
    backgroundColor: COLORS.success,
  },
  statusDotOffline: {
    backgroundColor: COLORS.danger,
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSize['2xs'],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.success,
    textTransform: 'uppercase',
  },
  sensorValueContainer: {
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  sensorValueOffline: {
    backgroundColor: COLORS.gray[50],
    borderColor: COLORS.gray[300],
  },
  sensorValue: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  sensorLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  sensorTime: {
    fontSize: TYPOGRAPHY.fontSize['2xs'],
    color: COLORS.gray[400],
    textAlign: 'center',
  },
  textOffline: {
    color: COLORS.gray[400],
  },
  noData: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['4xl'],
  },
  noDataText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.gray[400],
  },
  lotesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  loteStatus: {
    alignItems: 'center',
    flex: 1,
    minWidth: (width - 32 - 24) / 4,
  },
  loteCircle: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  loteNumber: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  loteTitle: {
    fontSize: TYPOGRAPHY.fontSize['2xs'],
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  loteSubtitle: {
    fontSize: TYPOGRAPHY.fontSize['3xs'],
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
});

export default HomeScreen;