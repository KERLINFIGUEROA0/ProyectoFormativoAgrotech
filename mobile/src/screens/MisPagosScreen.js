import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { MaterialIcons } from '@expo/vector-icons';

const MisPagosScreen = () => {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);

  const cargarPagos = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userString = await AsyncStorage.getItem('userData');
      const user = userString ? JSON.parse(userString) : null;

      if (!user?.identificacion) {
        Alert.alert('Error', 'No se pudo obtener la información del usuario');
        return;
      }

      setUserData(user);

      // Verificar que sea pasante
      if (user.rolNombre?.toLowerCase() !== 'pasante') {
        Alert.alert('Acceso Denegado', 'Esta página solo está disponible para pasantes.');
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/pagos/usuario/${user.identificacion}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPagos(response.data || []);
    } catch (error) {
      console.error('Error cargando pagos:', error);
      Alert.alert('Error', 'No se pudieron cargar los pagos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarPagos();
  }, [cargarPagos]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarPagos();
  };

  const stats = useMemo(() => {
    const totalMonto = pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
    const totalHoras = pagos.reduce((sum, pago) => sum + Number(pago.horasTrabajadas), 0);
    const promedioHora = totalHoras > 0 ? totalMonto / totalHoras : 0;

    return {
      totalPagos: pagos.length,
      totalMonto,
      promedioHora,
      totalHoras,
    };
  }, [pagos]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const StatCard = ({ title, value, icon, colorClass }) => (
    <View className={`bg-white p-3 rounded-xl shadow-sm border flex-row items-center ${colorClass} flex-1 mx-1 mb-4`}>
      <View className="p-2 rounded-full bg-opacity-10 mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-gray-500 text-xs">{title}</Text>
        <Text className="font-bold text-lg" numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );

  const PagoItem = ({ pago }) => (
    <View className="bg-white p-4 rounded-lg shadow-sm mb-3 border border-gray-100">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="font-semibold text-gray-800 text-base mb-1">
            {pago.actividad?.titulo || 'Actividad'}
          </Text>
          <Text className="text-sm text-gray-600 mb-2">
            ID: {pago.actividad?.id || 'N/A'}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-lg font-bold text-green-600">
            {formatCurrency(pago.monto)}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row items-center">
          <MaterialIcons name="access-time" size={16} color="#6B7280" />
          <Text className="ml-1 text-sm text-gray-600">
            {pago.horasTrabajadas}h trabajadas
          </Text>
        </View>
        <View className="flex-row items-center">
          <MaterialIcons name="attach-money" size={16} color="#6B7280" />
          <Text className="ml-1 text-sm text-gray-600">
            {formatCurrency(pago.tarifaHora)}/h
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <MaterialIcons name="calendar-today" size={16} color="#6B7280" />
          <Text className="ml-1 text-sm text-gray-600">
            {formatDate(pago.fechaPago)}
          </Text>
        </View>
      </View>

      {pago.descripcion && (
        <View className="mt-3 pt-3 border-t border-gray-100">
          <Text className="text-sm text-gray-700">{pago.descripcion}</Text>
        </View>
      )}
    </View>
  );

  // Verificar permisos antes de renderizar
  if (userData?.rolNombre?.toLowerCase() !== 'pasante') {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-6">
        <MaterialIcons name="block" size={64} color="#EF4444" />
        <Text className="text-2xl font-bold text-gray-800 mt-4">Acceso Denegado</Text>
        <Text className="text-gray-600 text-center mt-2">
          Esta página solo está disponible para pasantes.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="mt-2 text-gray-500">Cargando pagos...</Text>
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
      <View className="bg-white p-6 shadow-sm">
        <Text className="text-2xl font-bold text-gray-800">Mis Pagos</Text>
        <Text className="text-gray-600 mt-1">Historial de pagos por actividades realizadas</Text>
      </View>

      {/* Stats */}
      <View className="p-6">
        <View className="flex-row flex-wrap justify-between">
          <StatCard
            title="Total Pagos"
            value={stats.totalPagos}
            icon={<MaterialIcons name="receipt" size={24} color="#3B82F6" />}
            colorClass="bg-blue-50 border-blue-200"
          />

          <StatCard
            title="Total Recibido"
            value={formatCurrency(stats.totalMonto)}
            icon={<MaterialIcons name="attach-money" size={24} color="#10B981" />}
            colorClass="bg-green-50 border-green-200"
          />

          <StatCard
            title="Horas Totales"
            value={`${stats.totalHoras}h`}
            icon={<MaterialIcons name="schedule" size={24} color="#8B5CF6" />}
            colorClass="bg-purple-50 border-purple-200"
          />

          <StatCard
            title="Promedio/Hora"
            value={formatCurrency(stats.promedioHora)}
            icon={<MaterialIcons name="trending-up" size={24} color="#F59E0B" />}
            colorClass="bg-orange-50 border-orange-200"
          />
        </View>
      </View>

      {/* Payments List */}
      <View className="px-6 pb-6">
        <Text className="text-lg font-semibold text-gray-800 mb-4">Historial de Pagos</Text>

        {pagos.length === 0 ? (
          <View className="bg-white p-8 rounded-xl shadow-sm items-center">
            <MaterialIcons name="attach-money" size={48} color="#D1D5DB" />
            <Text className="text-gray-500 text-center mt-4 text-lg">
              No hay pagos registrados
            </Text>
            <Text className="text-gray-400 text-center mt-2">
              Cuando completes actividades, aparecerán aquí tus pagos.
            </Text>
          </View>
        ) : (
          <FlatList
            data={pagos}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <PagoItem pago={item} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScrollView>
  );
};

export default MisPagosScreen;