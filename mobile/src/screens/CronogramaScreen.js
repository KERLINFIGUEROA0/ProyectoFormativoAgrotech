import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SectionList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { MaterialIcons } from '@expo/vector-icons';

const CronogramaScreen = () => {
  const navigation = useNavigation();
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('Todos');

  // Mover hooks antes de useMemo
  const mostrarNotificacionesPendientes = useCallback(() => {
    const actividadesPendientesUsuario = actividades.filter(act =>
      act.estado === 'pendiente'
    );
    if (actividadesPendientesUsuario.length > 0) {
      Alert.alert(
        'Actividades Pendientes',
        `Tienes ${actividadesPendientesUsuario.length} actividad(es) pendiente(s) por completar.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Sin Pendientes', 'No tienes actividades pendientes.');
    }
  }, [actividades]);

  const exportarPDF = useCallback(async () => {
    Alert.alert('Función no implementada', 'La exportación a PDF estará disponible próximamente.');
  }, []);

  const StatCard = ({ title, value, icon, colorClass }) => (
    <View className={`bg-white p-4 rounded-xl shadow-sm border flex-row items-center ${colorClass} flex-1 mx-1`}>
      <View className="p-3 rounded-full bg-opacity-10 mr-4">
        {icon}
      </View>
      <View>
        <Text className="text-gray-500 text-sm">{title}</Text>
        <Text className="font-bold text-2xl">{value}</Text>
      </View>
    </View>
  );

  const stats = useMemo(() => {
    return {
      pendientes: actividades.filter((a) => a.estado === 'pendiente').length,
      enProceso: actividades.filter((a) => a.estado === 'en proceso').length,
      completadas: actividades.filter((a) => a.estado === 'completado').length,
    };
  }, [actividades]);

  const cargarDatos = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/actividades/listar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActividades(response.data || []);
    } catch (error) {
      console.error('Error cargando actividades:', error);
      Alert.alert('Error', 'No se pudieron cargar las actividades');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const filteredActividades = useMemo(() => {
    let filtered = actividades;
    if (filtroEstado !== 'Todos') {
      filtered = actividades.filter((a) => a.estado === filtroEstado);
    }

    // Agrupar por fecha
    const grouped = filtered.reduce((acc, actividad) => {
      const date = new Date(actividad.fecha).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(actividad);
      return acc;
    }, {});

    // Convertir a formato de SectionList
    return Object.keys(grouped)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        title: date,
        data: grouped[date].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()),
      }));
  }, [actividades, filtroEstado]);

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'completado':
        return '#10B981';
      case 'en proceso':
        return '#F59E0B';
      case 'pendiente':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case 'completado':
        return 'Completado';
      case 'en proceso':
        return 'En Proceso';
      case 'pendiente':
        return 'Pendiente';
      default:
        return estado;
    }
  };

  const getActivityIcon = (actividad) => {
    const titulo = actividad.titulo?.toLowerCase() || '';
    if (titulo.includes('riego') || titulo.includes('agua')) {
      return 'water-drop';
    }
    if (titulo.includes('fertiliz')) {
      return 'grass';
    }
    if (titulo.includes('plagas') || titulo.includes('control')) {
      return 'bug-report';
    }
    return 'assignment';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Mañana';
    } else {
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const ActividadItem = ({ actividad }) => {
    const estadoColor = getEstadoColor(actividad.estado);
    const estadoTexto = getEstadoTexto(actividad.estado);
    const icon = getActivityIcon(actividad);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('Tareas')}
        className="bg-white p-4 rounded-lg shadow-sm mb-2 border-l-4 mx-4"
        style={{ borderLeftColor: estadoColor }}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-row items-center flex-1">
            <MaterialIcons name={icon} size={20} color={estadoColor} />
            <View className="ml-3 flex-1">
              <Text className="font-medium text-gray-800" numberOfLines={2}>
                {actividad.titulo}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                {actividad.cultivo?.nombre || 'Sin cultivo'}
              </Text>
              {actividad.descripcion && (
                <Text className="text-sm text-gray-500 mt-1" numberOfLines={1}>
                  {actividad.descripcion}
                </Text>
              )}
            </View>
          </View>
          <View className="items-end">
            <Text
              className="px-2 py-1 rounded-full text-xs font-medium text-white mb-1"
              style={{ backgroundColor: estadoColor }}
            >
              {estadoTexto}
            </Text>
            <Text className="text-xs text-gray-500">
              {formatTime(actividad.fecha)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title, data } }) => (
    <View className="bg-gray-100 px-4 py-3">
      <Text className="text-lg font-semibold text-gray-800">
        {formatDate(title)}
      </Text>
      <Text className="text-sm text-gray-600">
        {data.length} actividad{data.length !== 1 ? 'es' : ''}
      </Text>
    </View>
  );

  const FilterButton = ({ title, value, active }) => (
    <TouchableOpacity
      onPress={() => setFiltroEstado(value)}
      className={`px-4 py-2 rounded-full mr-2 ${active ? 'bg-green-600' : 'bg-gray-200'}`}
    >
      <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-700'}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="mt-2 text-gray-500">Cargando cronograma...</Text>
      </View>
    );
  }


  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white p-6 shadow-sm">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-2xl font-bold text-gray-800">Cronograma</Text>
            <Text className="text-gray-600 mt-1">Vista calendario de actividades</Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={mostrarNotificacionesPendientes}
              className="bg-blue-500 p-2 rounded-lg"
            >
              <MaterialIcons name="notifications" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={exportarPDF}
              className="bg-red-500 p-2 rounded-lg"
            >
              <MaterialIcons name="picture-as-pdf" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View className="p-6">
        <View className="flex-row justify-between">
          <StatCard
            title="Pendientes"
            value={stats.pendientes}
            icon={<MaterialIcons name="schedule" size={24} color="#6B7280" />}
            colorClass="bg-blue-50 border-blue-200"
          />
          <StatCard
            title="En Proceso"
            value={stats.enProceso}
            icon={<MaterialIcons name="hourglass-top" size={24} color="#F59E0B" />}
            colorClass="bg-yellow-50 border-yellow-200"
          />
          <StatCard
            title="Completadas"
            value={stats.completadas}
            icon={<MaterialIcons name="check-circle" size={24} color="#10B981" />}
            colorClass="bg-green-50 border-green-200"
          />
        </View>
      </View>

      {/* Filters */}
      <View className="px-6 pb-4">
        <Text className="text-lg font-semibold text-gray-800 mb-2">Lista de Actividades</Text>
        <View className="bg-white p-4 rounded-xl shadow-sm">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <FilterButton title="Todos" value="Todos" active={filtroEstado === 'Todos'} />
            <FilterButton title="Pendientes" value="pendiente" active={filtroEstado === 'pendiente'} />
            <FilterButton title="En Proceso" value="en proceso" active={filtroEstado === 'en proceso'} />
            <FilterButton title="Completadas" value="completado" active={filtroEstado === 'completado'} />
          </ScrollView>
        </View>
      </View>

      {/* Calendar View */}
      {filteredActividades.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <MaterialIcons name="calendar-today" size={64} color="#D1D5DB" />
          <Text className="text-gray-500 text-center mt-4 text-lg">
            No hay actividades programadas
          </Text>
          <Text className="text-gray-400 text-center mt-2">
            Las actividades aparecerán aquí cuando sean programadas
          </Text>
        </View>
      ) : (
        <SectionList
          sections={filteredActividades}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <ActividadItem actividad={item} />}
          renderSectionHeader={renderSectionHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
};

export default CronogramaScreen;