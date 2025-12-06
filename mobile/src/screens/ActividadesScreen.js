import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../config/api';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const ActividadesScreen = () => {
  const navigation = useNavigation();
  const [actividadesRecientes, setActividadesRecientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarActividades = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.get('/actividades', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Ordenar por fecha y tomar las últimas 3
      const sorted = (response.data || [])
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, 3);

      setActividadesRecientes(sorted);
    } catch (error) {
      console.error('Error cargando actividades:', error);
      Alert.alert('Error', 'No se pudieron cargar las actividades recientes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarActividades();
  }, [cargarActividades]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarActividades();
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

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'completado':
        return '#10B981'; // green
      case 'en proceso':
        return '#F59E0B'; // yellow
      case 'pendiente':
        return '#6B7280'; // gray
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

  const getTimeElapsed = (date) => {
    const diff = new Date().getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) return 'Hace un momento';
    if (hours < 24) return `Hace ${hours} horas`;
    return new Date(date).toLocaleDateString('es-ES');
  };

  const RecentActivityItem = ({ actividad }) => {
    const icon = getActivityIcon(actividad);
    const estadoColor = getEstadoColor(actividad.estado);
    const estadoTexto = getEstadoTexto(actividad.estado);

    let statusText = '';
    let statusColor = estadoColor;

    if (actividad.estado === 'completado') {
      try {
        const asignados = actividad.asignados ? JSON.parse(actividad.asignados) : [];
        if (asignados.length > 0) {
          statusText = 'Completado';
        } else {
          statusText = `Completado por ${actividad.usuario?.nombre || 'N/A'}`;
        }
      } catch {
        statusText = `Completado por ${actividad.usuario?.nombre || 'N/A'}`;
      }
      statusColor = '#10B981';
    } else if (actividad.estado === 'pendiente') {
      statusText = 'Pendiente';
      statusColor = '#6B7280';
    } else {
      statusText = `Asignado a ${actividad.usuario?.nombre || 'N/A'}`;
      statusColor = '#6B7280';
    }

    const timeInfo = actividad.estado === 'completado' || actividad.estado === 'en proceso'
      ? getTimeElapsed(actividad.fecha)
      : 'Programado para mañana';

    return (
      <View className="flex-row justify-between items-start py-3 border-b border-gray-200">
        <View className="flex-row items-center flex-1">
          <MaterialIcons name={icon} size={20} color={estadoColor} />
          <View className="ml-3 flex-1">
            <Text className="font-medium text-gray-800" numberOfLines={1}>
              {actividad.titulo}
            </Text>
            <Text style={{ color: statusColor }} className="text-sm">
              {statusText}
            </Text>
          </View>
        </View>
        <Text className="text-sm text-gray-500 ml-2" numberOfLines={1}>
          {timeInfo}
        </Text>
      </View>
    );
  };

  const QuickAccessCard = ({ title, description, icon, colorClass, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`bg-white p-4 rounded-xl shadow-md border-t-4 ${colorClass} flex-col justify-between h-32 mb-4`}
    >
      <View className="flex-row justify-between items-start">
        <View className={`p-2 rounded-full ${colorClass.replace('border-t-4', '').replace('border-', 'bg-')} bg-opacity-10`}>
          {icon}
        </View>
        <MaterialIcons name="arrow-forward" size={16} color="#9CA3AF" />
      </View>
      <View className="mt-2">
        <Text className="text-base font-semibold text-gray-800">{title}</Text>
        <Text className="text-xs text-gray-500 mt-1">{description}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="mt-2 text-gray-500">Cargando actividades...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View className="bg-green-600 p-6 rounded-b-3xl shadow-lg">
        <Text className="text-2xl font-bold text-white">¡Bienvenido!</Text>
        <Text className="text-lg text-white mt-1">
          Administra eficientemente todas las actividades agrícolas
        </Text>
      </View>

      {/* Quick Access */}
      <View className="p-6">
        <Text className="text-xl font-semibold text-gray-800 mb-4">Accesos Rápidos</Text>
        <View className="flex-row justify-between">
          <View className="flex-1 mr-2">
            <QuickAccessCard
              title="Gestión de Actividades"
              description="Consulta y administra todas las actividades"
              icon={<MaterialIcons name="assignment" size={24} color="#F59E0B" />}
              colorClass="border-orange-500"
              onPress={() => navigation.navigate('tareas')}
            />
          </View>
          <View className="flex-1 ml-2">
            <QuickAccessCard
              title="Cronograma"
              description="Vista calendario de actividades"
              icon={<MaterialIcons name="calendar-today" size={24} color="#3B82F6" />}
              colorClass="border-blue-500"
              onPress={() => navigation.navigate('cronograma')}
            />
          </View>
        </View>
        <View className="mt-4">
          <QuickAccessCard
            title="Mis Pagos"
            description="Historial de pagos por actividades"
            icon={<MaterialIcons name="attach-money" size={24} color="#10B981" />}
            colorClass="border-green-500"
            onPress={() => navigation.navigate('pagos-pasante')}
          />
        </View>
      </View>

      {/* Recent Activities */}
      <View className="px-6 pb-6">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-semibold text-gray-800">Actividades Recientes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('tareas')}>
            <Text className="text-green-600 font-medium">Ver todas</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white p-4 rounded-xl shadow-md">
          {actividadesRecientes.length === 0 ? (
            <Text className="text-center text-gray-500 py-8">
              No hay actividades recientes para mostrar.
            </Text>
          ) : (
            actividadesRecientes.map((act) => (
              <RecentActivityItem key={act.id} actividad={act} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default ActividadesScreen;