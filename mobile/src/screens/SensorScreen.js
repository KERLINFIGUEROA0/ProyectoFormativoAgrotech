import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const SensorScreen = () => {
  const [sensores, setSensores] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [sublotes, setSublotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSensor, setEditingSensor] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    loteId: '',
    subloteId: '',
    fecha_instalacion: '',
    valor_minimo_alerta: '',
    valor_maximo_alerta: '',
    estado: 'Activo',
    topic: '',
    frecuencia_escaneo: '60',
  });

  useEffect(() => {
    fetchSensores();
    fetchLotes();
    fetchSublotes();
  }, []);

  const fetchSensores = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/sensores/listar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSensores(response.data.data || []);
    } catch (error) {
      console.error('Error fetching sensores:', error);
      Alert.alert('Error', 'No se pudieron cargar los sensores');
    } finally {
      setLoading(false);
    }
  };

  const fetchLotes = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/lotes/listar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLotes(response.data.data || []);
    } catch (error) {
      console.error('Error fetching lotes:', error);
    }
  };

  const fetchSublotes = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/sublotes/listar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSublotes(response.data.data || []);
    } catch (error) {
      console.error('Error fetching sublotes:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.nombre || !formData.loteId || !formData.fecha_instalacion ||
        !formData.valor_minimo_alerta || !formData.valor_maximo_alerta || !formData.topic) {
      Alert.alert('Error', 'Por favor complete todos los campos requeridos');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      const dataToSend = {
        ...formData,
        loteId: parseInt(formData.loteId),
        subloteId: formData.subloteId ? parseInt(formData.subloteId) : undefined,
        valor_minimo_alerta: parseFloat(formData.valor_minimo_alerta),
        valor_maximo_alerta: parseFloat(formData.valor_maximo_alerta),
        frecuencia_escaneo: parseInt(formData.frecuencia_escaneo),
      };

      await axios.post(`${API_BASE_URL}/sensores/crear`, dataToSend, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('Éxito', 'Sensor creado correctamente');
      setModalVisible(false);
      resetForm();
      fetchSensores();
    } catch (error) {
      console.error('Error creating sensor:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al crear sensor');
    }
  };

  const handleUpdate = async () => {
    if (!formData.nombre || !formData.loteId || !formData.fecha_instalacion ||
        !formData.valor_minimo_alerta || !formData.valor_maximo_alerta || !formData.topic) {
      Alert.alert('Error', 'Por favor complete todos los campos requeridos');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access_token');
      const dataToSend = {
        ...formData,
        loteId: parseInt(formData.loteId),
        subloteId: formData.subloteId ? parseInt(formData.subloteId) : undefined,
        valor_minimo_alerta: parseFloat(formData.valor_minimo_alerta),
        valor_maximo_alerta: parseFloat(formData.valor_maximo_alerta),
        frecuencia_escaneo: parseInt(formData.frecuencia_escaneo),
      };

      await axios.put(`${API_BASE_URL}/sensores/actualizar/${editingSensor.id}`, dataToSend, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('Éxito', 'Sensor actualizado correctamente');
      setModalVisible(false);
      resetForm();
      fetchSensores();
    } catch (error) {
      console.error('Error updating sensor:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al actualizar sensor');
    }
  };

  const handleDelete = async (sensor) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Está seguro de eliminar el sensor "${sensor.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              await axios.delete(`${API_BASE_URL}/sensores/eliminar/${sensor.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Éxito', 'Sensor eliminado correctamente');
              fetchSensores();
            } catch (error) {
              console.error('Error deleting sensor:', error);
              Alert.alert('Error', 'Error al eliminar sensor');
            }
          },
        },
      ]
    );
  };

  const handleStatusChange = async (sensor, newStatus) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      await axios.patch(`${API_BASE_URL}/sensores/actualizar/${sensor.id}/estado`, {
        estado: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert('Éxito', `Estado del sensor actualizado a ${newStatus}`);
      fetchSensores();
    } catch (error) {
      console.error('Error updating sensor status:', error);
      Alert.alert('Error', 'Error al actualizar estado del sensor');
    }
  };

  const openCreateModal = () => {
    setEditingSensor(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (sensor) => {
    setEditingSensor(sensor);
    setFormData({
      nombre: sensor.nombre,
      loteId: sensor.lote?.id?.toString() || '',
      subloteId: sensor.sublote?.id?.toString() || '',
      fecha_instalacion: sensor.fecha_instalacion ? new Date(sensor.fecha_instalacion).toISOString().split('T')[0] : '',
      valor_minimo_alerta: sensor.valor_minimo_alerta?.toString() || '',
      valor_maximo_alerta: sensor.valor_maximo_alerta?.toString() || '',
      estado: sensor.estado || 'Activo',
      topic: sensor.topic || '',
      frecuencia_escaneo: sensor.frecuencia_escaneo?.toString() || '60',
    });
    setModalVisible(true);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      loteId: '',
      subloteId: '',
      fecha_instalacion: '',
      valor_minimo_alerta: '',
      valor_maximo_alerta: '',
      estado: 'Activo',
      topic: '',
      frecuencia_escaneo: '60',
    });
  };

  const renderSensor = ({ item }) => (
    <View style={styles.sensorCard}>
      <View style={styles.sensorHeader}>
        <Text style={styles.sensorName}>{item.nombre}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado) }]}>
          <Text style={styles.statusText}>{item.estado}</Text>
        </View>
      </View>
      <Text style={styles.sensorDetail}>Lote: {item.lote?.nombre || 'N/A'}</Text>
      <Text style={styles.sensorDetail}>Sublote: {item.sublote?.nombre || 'N/A'}</Text>
      <Text style={styles.sensorDetail}>Tópico: {item.topic || 'N/A'}</Text>
      <Text style={styles.sensorDetail}>Mín: {item.valor_minimo_alerta} | Máx: {item.valor_maximo_alerta}</Text>
      <Text style={styles.sensorDetail}>Frecuencia: {item.frecuencia_escaneo}s</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
          <Text style={styles.buttonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
          <Text style={styles.buttonText}>Eliminar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statusButton}
          onPress={() => {
            const newStatus = item.estado === 'Activo' ? 'Inactivo' : 'Activo';
            handleStatusChange(item, newStatus);
          }}
        >
          <Text style={styles.buttonText}>
            {item.estado === 'Activo' ? 'Desactivar' : 'Activar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'Activo': return '#4CAF50';
      case 'Inactivo': return '#F44336';
      case 'Mantenimiento': return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sensores</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Text style={styles.addButtonText}>+ Agregar Sensor</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Cargando...</Text>
      ) : (
        <FlatList
          data={sensores}
          renderItem={renderSensor}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <Modal visible={modalVisible} animationType="slide">
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {editingSensor ? 'Editar Sensor' : 'Crear Sensor'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Nombre"
            value={formData.nombre}
            onChangeText={(text) => setFormData({ ...formData, nombre: text })}
          />

          <TextInput
            style={styles.input}
            placeholder="Fecha de Instalación (YYYY-MM-DD)"
            value={formData.fecha_instalacion}
            onChangeText={(text) => setFormData({ ...formData, fecha_instalacion: text })}
          />

          <TextInput
            style={styles.input}
            placeholder="Valor Mínimo de Alerta"
            value={formData.valor_minimo_alerta}
            onChangeText={(text) => setFormData({ ...formData, valor_minimo_alerta: text })}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Valor Máximo de Alerta"
            value={formData.valor_maximo_alerta}
            onChangeText={(text) => setFormData({ ...formData, valor_maximo_alerta: text })}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Tópico MQTT"
            value={formData.topic}
            onChangeText={(text) => setFormData({ ...formData, topic: text })}
          />

          <TextInput
            style={styles.input}
            placeholder="Frecuencia de Escaneo (segundos)"
            value={formData.frecuencia_escaneo}
            onChangeText={(text) => setFormData({ ...formData, frecuencia_escaneo: text })}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Lote:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerContainer}>
            {lotes.map((lote) => (
              <TouchableOpacity
                key={lote.id}
                style={[styles.pickerOption, formData.loteId === lote.id.toString() && styles.pickerOptionSelected]}
                onPress={() => setFormData({ ...formData, loteId: lote.id.toString() })}
              >
                <Text style={styles.pickerOptionText}>{lote.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Sublote (opcional):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerContainer}>
            {sublotes.map((sublote) => (
              <TouchableOpacity
                key={sublote.id}
                style={[styles.pickerOption, formData.subloteId === sublote.id.toString() && styles.pickerOptionSelected]}
                onPress={() => setFormData({ ...formData, subloteId: sublote.id.toString() })}
              >
                <Text style={styles.pickerOptionText}>{sublote.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalButtons}>
            <Button title="Cancelar" onPress={() => setModalVisible(false)} />
            <Button
              title={editingSensor ? "Actualizar" : "Crear"}
              onPress={editingSensor ? handleUpdate : handleCreate}
            />
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d5a27',
  },
  addButton: {
    backgroundColor: '#2d5a27',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 18,
    marginTop: 50,
  },
  listContainer: {
    paddingBottom: 20,
  },
  sensorCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sensorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sensorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sensorDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  editButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 2,
  },
  deleteButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 2,
  },
  statusButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 2,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2d5a27',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerOption: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  pickerOptionSelected: {
    backgroundColor: '#2d5a27',
  },
  pickerOptionText: {
    color: '#333',
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
});

export default SensorScreen;