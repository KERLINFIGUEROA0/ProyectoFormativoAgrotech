import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRoute } from '@react-navigation/native';
import api from '../config/api';
import { exportarExcelGeneral, exportarExcelProducciones, exportarPdfProducciones } from '../config/cultivosApi';
import { downloadExcel, downloadPDF } from '../utils/downloadUtils';

const ProduccionesScreen = () => {
  const route = useRoute();
  const { cultivoId } = route.params || {};
  const [producciones, setProducciones] = useState([]);
  const [filteredProducciones, setFilteredProducciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduccion, setEditingProduccion] = useState(null);
  const [formData, setFormData] = useState({
    cantidad: '',
    fecha: '',
    estado: 'Cosechado',
    cultivoId: cultivoId ? cultivoId.toString() : '',
  });

  useEffect(() => {
    fetchProducciones();
  }, []);

  useEffect(() => {
    filterProducciones();
  }, [producciones, searchTerm, filterEstado]);

  const fetchProducciones = async () => {
    try {
      setLoading(true);
      const response = await api.get('/producciones');
      setProducciones(response.data.data || response.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las producciones');
    } finally {
      setLoading(false);
    }
  };

  const filterProducciones = () => {
    let filtered = producciones;

    if (cultivoId) {
      filtered = filtered.filter(produccion => produccion.cultivo?.id === parseInt(cultivoId));
    }

    if (searchTerm) {
      filtered = filtered.filter(produccion =>
        produccion.cultivo?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterEstado !== 'Todos') {
      filtered = filtered.filter(produccion => produccion.estado === filterEstado);
    }

    setFilteredProducciones(filtered);
  };

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        cantidad: parseFloat(formData.cantidad) || 0,
        cultivoId: parseInt(formData.cultivoId) || undefined,
      };

      if (editingProduccion) {
        await api.put(`/producciones/${editingProduccion.id}`, data);
        Alert.alert('Éxito', 'Producción actualizada correctamente');
      } else {
        await api.post('/producciones', data);
        Alert.alert('Éxito', 'Producción creada correctamente');
      }

      setModalVisible(false);
      resetForm();
      fetchProducciones();
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la producción');
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar esta producción?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/producciones/${id}`);
              Alert.alert('Éxito', 'Producción eliminada correctamente');
              fetchProducciones();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la producción');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      cantidad: '',
      fecha: '',
      estado: 'Cosechado',
      cultivoId: '',
    });
    setEditingProduccion(null);
  };

  // Funciones para descargar reportes
  const handleDescargarExcelGeneral = async () => {
    try {
      Alert.alert('Generando reporte...', 'Espere mientras se genera el reporte Excel general.');
      const blob = await exportarExcelGeneral();
      await downloadExcel(blob, 'producciones-reporte-general.xlsx');
      Alert.alert('Éxito', 'Reporte Excel general descargado correctamente');
    } catch (error) {
      console.error('Error al descargar Excel general:', error);
      Alert.alert('Error', 'No se pudo descargar el reporte Excel general');
    }
  };

  const handleDescargarExcelProducciones = async () => {
    try {
      Alert.alert('Generando reporte...', 'Espere mientras se genera el reporte Excel de producciones.');
      const blob = await exportarExcelProducciones();
      await downloadExcel(blob, 'producciones-reporte.xlsx');
      Alert.alert('Éxito', 'Reporte Excel de producciones descargado correctamente');
    } catch (error) {
      console.error('Error al descargar Excel de producciones:', error);
      Alert.alert('Error', 'No se pudo descargar el reporte Excel de producciones');
    }
  };

  const handleDescargarPdfProducciones = async () => {
    try {
      Alert.alert('Generando reporte...', 'Espere mientras se genera el reporte PDF de producciones.');
      const blob = await exportarPdfProducciones();
      await downloadPDF(blob, 'producciones-reporte.pdf');
      Alert.alert('Éxito', 'Reporte PDF de producciones descargado correctamente');
    } catch (error) {
      console.error('Error al descargar PDF de producciones:', error);
      Alert.alert('Error', 'No se pudo descargar el reporte PDF de producciones');
    }
  };

  const openModal = (produccion = null) => {
    if (produccion) {
      setEditingProduccion(produccion);
      setFormData({
        cantidad: produccion.cantidad.toString(),
        fecha: produccion.fecha ? new Date(produccion.fecha).toISOString().split('T')[0] : '',
        estado: produccion.estado,
        cultivoId: produccion.cultivo?.id.toString() || '',
      });
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const renderProduccion = ({ item }) => (
    <View style={styles.produccionCard}>
      <View style={styles.produccionInfo}>
        <Text style={styles.produccionCultivo}>
          Cultivo: {item.cultivo?.nombre || 'Sin cultivo'}
        </Text>
        <Text style={styles.produccionCantidad}>
          Cantidad: {item.cantidad} kg
        </Text>
        <Text style={styles.produccionEstado}>Estado: {item.estado}</Text>
        <Text style={styles.produccionFecha}>
          Fecha: {item.fecha ? new Date(item.fecha).toLocaleDateString() : 'Sin fecha'}
        </Text>
        {item.cantidadOriginal && (
          <Text style={styles.produccionOriginal}>
            Original: {item.cantidadOriginal} kg
          </Text>
        )}
      </View>
      <View style={styles.produccionActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openModal(item)}
        >
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.actionButtonText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Cargando producciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {cultivoId ? 'Producciones del Cultivo' : 'Gestión de Producciones'}
      </Text>

      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por cultivo..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Estado:</Text>
          <Picker
            selectedValue={filterEstado}
            onValueChange={setFilterEstado}
            style={styles.picker}
          >
            <Picker.Item label="Todos" value="Todos" />
            <Picker.Item label="Cosechado" value="Cosechado" />
            <Picker.Item label="Vendido" value="Vendido" />
            <Picker.Item label="Parcialmente Vendido" value="Parcialmente Vendido" />
          </Picker>
        </View>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
        <Text style={styles.addButtonText}>+ Nueva Producción</Text>
      </TouchableOpacity>

      {/* Botones de reportes */}
      <View style={styles.reportsContainer}>
        <Text style={styles.reportsTitle}>Reportes</Text>
        <View style={styles.reportsButtons}>
          <TouchableOpacity
            style={[styles.reportButton, styles.excelButton]}
            onPress={handleDescargarExcelGeneral}
          >
            <Text style={styles.reportButtonText}>Excel General</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reportButton, styles.excelButton]}
            onPress={handleDescargarExcelProducciones}
          >
            <Text style={styles.reportButtonText}>Excel Producciones</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reportButton, styles.pdfButton]}
            onPress={handleDescargarPdfProducciones}
          >
            <Text style={styles.reportButtonText}>PDF Producciones</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredProducciones}
        renderItem={renderProduccion}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>
            {editingProduccion ? 'Editar Producción' : 'Nueva Producción'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Cantidad (kg)"
            value={formData.cantidad}
            onChangeText={(text) => setFormData({...formData, cantidad: text})}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Fecha (YYYY-MM-DD)"
            value={formData.fecha}
            onChangeText={(text) => setFormData({...formData, fecha: text})}
          />

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Estado:</Text>
            <Picker
              selectedValue={formData.estado}
              onValueChange={(value) => setFormData({...formData, estado: value})}
              style={styles.picker}
            >
              <Picker.Item label="Cosechado" value="Cosechado" />
              <Picker.Item label="Vendido" value="Vendido" />
              <Picker.Item label="Parcialmente Vendido" value="Parcialmente Vendido" />
            </Picker>
          </View>

          <TextInput
            style={styles.input}
            placeholder="ID del cultivo"
            value={formData.cultivoId}
            onChangeText={(text) => setFormData({...formData, cultivoId: text})}
            keyboardType="numeric"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.modalButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  filtersContainer: {
    marginBottom: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    marginBottom: 10,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  addButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  produccionCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  produccionInfo: {
    marginBottom: 10,
  },
  produccionCultivo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  produccionCantidad: {
    fontSize: 14,
    color: '#666',
  },
  produccionEstado: {
    fontSize: 14,
    color: '#666',
  },
  produccionFecha: {
    fontSize: 14,
    color: '#666',
  },
  produccionOriginal: {
    fontSize: 12,
    color: '#999',
  },
  produccionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    padding: 8,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007bff',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reportsContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  reportsButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  reportButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  excelButton: {
    backgroundColor: '#28a745',
  },
  pdfButton: {
    backgroundColor: '#dc3545',
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ProduccionesScreen;