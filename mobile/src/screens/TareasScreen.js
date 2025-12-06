import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const TareasScreen = () => {
  const navigation = useNavigation();
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [modalVisible, setModalVisible] = useState(false);
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);

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

  const stats = useMemo(() => {
    return {
      pendientes: actividades.filter((a) => a.estado === 'pendiente').length,
      enProceso: actividades.filter((a) => a.estado === 'en proceso').length,
      completadas: actividades.filter((a) => a.estado === 'completado').length,
    };
  }, [actividades]);

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

  const filteredActividades = useMemo(() => {
    if (filtroEstado === 'Todos') return actividades;
    return actividades.filter((a) => a.estado === filtroEstado);
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
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const ActividadCard = ({ actividad }) => {
    const estadoColor = getEstadoColor(actividad.estado);
    const estadoTexto = getEstadoTexto(actividad.estado);
    const icon = getActivityIcon(actividad);

    return (
      <TouchableOpacity
        onPress={() => {
          setActividadSeleccionada(actividad);
          setModalVisible(true);
        }}
        className="bg-white p-4 rounded-xl shadow-md mb-4 border-l-4"
        style={{ borderLeftColor: estadoColor }}
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-row items-center flex-1">
            <MaterialIcons name={icon} size={24} color={estadoColor} />
            <View className="ml-3 flex-1">
              <Text className="font-semibold text-gray-800" numberOfLines={2}>
                {actividad.titulo}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                {actividad.cultivo?.nombre || 'Sin cultivo'}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text
              className="px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: estadoColor }}
            >
              {estadoTexto}
            </Text>
            <Text className="text-xs text-gray-500 mt-1">
              {formatDate(actividad.fecha)}
            </Text>
          </View>
        </View>

        {actividad.descripcion && (
          <Text className="text-sm text-gray-600 mt-2" numberOfLines={2}>
            {actividad.descripcion}
          </Text>
        )}

        <View className="flex-row justify-between items-center mt-3">
          <Text className="text-xs text-gray-500">
            {actividad.horas ? `${actividad.horas}h` : 'Sin horas'}
          </Text>
          {actividad.tarifaHora && (
            <Text className="text-xs text-gray-500">
              ${actividad.tarifaHora}/h
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const StatCard = ({ title, value, icon, colorClass }) => (
    <View className={`bg-white p-4 rounded-xl shadow-sm border flex-row items-center ${colorClass} flex-1 mx-1`}>
      <View className={`p-3 rounded-full bg-opacity-10 mr-4`}>
        {icon}
      </View>
      <View>
        <Text className="text-gray-500 text-sm">{title}</Text>
        <Text className="font-bold text-2xl">{value}</Text>
      </View>
    </View>
  );

  const ModalDetalles = ({ actividad, visible, onClose }) => {
    if (!actividad) return null;

    const estadoColor = getEstadoColor(actividad.estado);
    const estadoTexto = getEstadoTexto(actividad.estado);

    // Lógica de aprendices asignados
    const aprendicesAsignados = (() => {
      if (!actividad) return [];
      try {
        if (actividad.asignados) {
          const nombres = JSON.parse(actividad.asignados);
          return nombres.map((nombre, index) => ({
            id: index + 1,
            nombre: nombre.split(' ')[0] || 'Usuario',
            apellidos: nombre.split(' ').slice(1).join(' ') || '',
          }));
        }
      } catch {
        // Si falla el parseo, usar respuestas como fallback
      }
      return actividad.respuestas?.map(r => r.usuario) || [];
    })();

    // Lógica de costo y pago
    const costoManoDeObra = (actividad.horas || 0) * (actividad.tarifaHora || 0);
    const estadoPago = actividad.estado === 'completado' ? 'Pagado' : 'Pendiente de Pago';
    const colorEstadoPago = actividad.estado === 'completado' ? '#10B981' : '#F59E0B';

    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-5/6">
            <View className="p-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800 flex-1" numberOfLines={2}>
                  {actividad.titulo}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <MaterialIcons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View className="mb-4">
                <Text
                  className="px-3 py-1 rounded-full text-sm font-medium text-white self-start"
                  style={{ backgroundColor: estadoColor }}
                >
                  {estadoTexto}
                </Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="space-y-4">
                  {/* Información Básica */}
                  <View className="bg-gray-50 p-4 rounded-lg border">
                    <Text className="font-semibold text-gray-700 mb-3">Información Básica</Text>
                    <View className="space-y-2">
                      <View className="flex-row items-center">
                        <MaterialIcons name="assignment" size={16} color="#3B82F6" />
                        <Text className="ml-2 text-gray-700">Actividad: {actividad.titulo}</Text>
                      </View>
                      <View className="flex-row items-center">
                        <MaterialIcons name="location-on" size={16} color="#3B82F6" />
                        <Text className="ml-2 text-gray-700">
                          Cultivo/Lote: {actividad.cultivo?.nombre || 'No especificado'}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <MaterialIcons name="calendar-today" size={16} color="#3B82F6" />
                        <Text className="ml-2 text-gray-700">
                          Fecha Programada: {formatDate(actividad.fecha)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Aprendices Asignados */}
                  <View className="bg-gray-50 p-4 rounded-lg border">
                    <View className="flex-row items-center mb-3">
                      <MaterialIcons name="people" size={18} color="#6B7280" />
                      <Text className="font-semibold text-gray-700 ml-2">Aprendices Asignados</Text>
                    </View>
                    {aprendicesAsignados.length > 0 ? (
                      <View className="space-y-1">
                        {aprendicesAsignados.map((user) => (
                          <Text key={user.id} className="text-sm text-gray-700 ml-6">
                            • {user.nombre} {user.apellidos}
                          </Text>
                        ))}
                      </View>
                    ) : (
                      <Text className="text-gray-500 text-sm ml-6">No asignado</Text>
                    )}
                  </View>

                  {/* Materiales Utilizados */}
                  <View className="bg-gray-50 p-4 rounded-lg border">
                    <View className="flex-row items-center mb-3">
                      <MaterialIcons name="inventory" size={18} color="#6B7280" />
                      <Text className="font-semibold text-gray-700 ml-2">Materiales Utilizados</Text>
                    </View>
                    {actividad.actividadMaterial && actividad.actividadMaterial.length > 0 ? (
                      <View className="space-y-1">
                        {actividad.actividadMaterial.map((item, index) => (
                          <Text key={index} className="text-sm text-gray-700 ml-6">
                            • {item.material.nombre}: {item.cantidadUsada} unidades
                          </Text>
                        ))}
                      </View>
                    ) : (
                      <Text className="text-gray-500 text-sm ml-6">No se registraron materiales.</Text>
                    )}
                  </View>

                  {/* Costo Mano de Obra */}
                  <View className="bg-gray-50 p-4 rounded-lg border">
                    <View className="flex-row items-center mb-3">
                      <MaterialIcons name="attach-money" size={18} color="#6B7280" />
                      <Text className="font-semibold text-gray-700 ml-2">Costo Mano de Obra</Text>
                    </View>
                    {costoManoDeObra > 0 ? (
                      <View className="space-y-2 ml-6">
                        <Text className="text-sm text-gray-700">Horas: {actividad.horas}</Text>
                        <Text className="text-sm text-gray-700">
                          Tarifa: ${new Intl.NumberFormat('es-CO').format(actividad.tarifaHora || 0)} / hora
                        </Text>
                        <Text className="text-sm font-medium text-gray-800">
                          Total: ${new Intl.NumberFormat('es-CO').format(costoManoDeObra)}
                        </Text>
                        <Text className={`text-sm font-medium`} style={{ color: colorEstadoPago }}>
                          Estado de Pago: {estadoPago}
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-gray-500 text-sm ml-6">
                        No se registraron costos de mano de obra.
                      </Text>
                    )}
                  </View>

                  {/* Descripción Completa */}
                  <View className="bg-gray-50 p-4 rounded-lg border">
                    <Text className="font-semibold text-gray-700 mb-2">Descripción Completa</Text>
                    <Text className="text-gray-600 text-sm">
                      {actividad.descripcion || 'No hay descripción detallada.'}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="mt-2 text-gray-500">Cargando actividades...</Text>
      </View>
    );
  }


  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="bg-white p-6 shadow-sm">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold text-gray-800">Gestión de Actividades</Text>
              <Text className="text-gray-600 mt-1">Administra todas las tareas agrícolas</Text>
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

        {/* Filter */}
        <View className="px-6 pb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-2">Lista de Actividades</Text>
          <View className="bg-white p-4 rounded-xl shadow-sm">
            <Picker
              selectedValue={filtroEstado}
              onValueChange={(itemValue) => setFiltroEstado(itemValue)}
              className="w-full"
            >
              <Picker.Item label="Todos los estados" value="Todos" />
              <Picker.Item label="Pendiente" value="pendiente" />
              <Picker.Item label="En Proceso" value="en proceso" />
              <Picker.Item label="Completado" value="completado" />
            </Picker>
          </View>
        </View>

        {/* Activities List */}
        <View className="px-6 pb-6">
          {filteredActividades.length === 0 ? (
            <View className="bg-white p-8 rounded-xl shadow-sm items-center">
              <MaterialIcons name="assignment" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 text-center mt-4">
                No hay actividades con el filtro seleccionado.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredActividades}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => <ActividadCard actividad={item} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>

      <ModalDetalles
        actividad={actividadSeleccionada}
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setActividadSeleccionada(null);
        }}
      />
    </View>
  );
};

export default TareasScreen;