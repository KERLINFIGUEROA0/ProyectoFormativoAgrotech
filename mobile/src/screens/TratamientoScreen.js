import React, { useState, useEffect } from 'react';
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
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fitosanitarioApi } from '../config/fitosanitarioApi';
import { cultivosApi } from '../config/cultivosApi';
import { MaterialIcons as Icon } from '@expo/vector-icons';

const TratamientoScreen = () => {
  const [tratamientos, setTratamientos] = useState([]);
  const [cultivos, setCultivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTratamiento, setEditingTratamiento] = useState(null);
  const [formData, setFormData] = useState({
    descripcion: '',
    tipo: '',
    estado: 'Planificado',
    fechaInicio: new Date(),
    fechaFinal: null,
    cultivoId: null,
  });
  const [showFechaInicioPicker, setShowFechaInicioPicker] = useState(false);
  const [showFechaFinalPicker, setShowFechaFinalPicker] = useState(false);

  const tiposTratamiento = [
    'Fungicida',
    'Insecticida',
    'Herbicida',
    'Fertilizante',
    'Otro'
  ];

  const estadosTratamiento = [
    'Planificado',
    'En Curso',
    'Finalizado'
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tratamientosData, cultivosData] = await Promise.all([
        fitosanitarioApi.listarTratamientos(),
        cultivosApi.listarCultivos()
      ]);
      setTratamientos(Array.isArray(tratamientosData) ? tratamientosData : []);
      setCultivos(cultivosData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!formData.descripcion.trim() || !formData.tipo) {
      Alert.alert('Error', 'Por favor complete todos los campos requeridos.');
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        fechaInicio: formData.fechaInicio.toISOString().split('T')[0],
        fechaFinal: formData.fechaFinal ? formData.fechaFinal.toISOString().split('T')[0] : null,
        cultivoId: formData.cultivoId ? parseInt(formData.cultivoId) : null,
      };

      if (editingTratamiento) {
        await fitosanitarioApi.actualizarTratamiento(editingTratamiento.id, dataToSend);
        Alert.alert('Éxito', 'Tratamiento actualizado correctamente.');
      } else {
        await fitosanitarioApi.crearTratamiento(dataToSend);
        Alert.alert('Éxito', 'Tratamiento creado correctamente.');
      }

      fetchData();
      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Error saving tratamiento:', error);
      Alert.alert('Error', 'Error al guardar el tratamiento.');
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este tratamiento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await fitosanitarioApi.eliminarTratamiento(id);
              Alert.alert('Éxito', 'Tratamiento eliminado correctamente.');
              fetchData();
            } catch (error) {
              console.error('Error deleting tratamiento:', error);
              Alert.alert('Error', 'No se pudo eliminar el tratamiento.');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      descripcion: '',
      tipo: '',
      estado: 'Planificado',
      fechaInicio: new Date(),
      fechaFinal: null,
      cultivoId: null,
    });
    setEditingTratamiento(null);
  };

  const openModal = (tratamiento = null) => {
    if (tratamiento) {
      setEditingTratamiento(tratamiento);
      setFormData({
        descripcion: tratamiento.descripcion || '',
        tipo: tratamiento.tipo || '',
        estado: tratamiento.estado || 'Planificado',
        fechaInicio: tratamiento.fechaInicio ? new Date(tratamiento.fechaInicio) : new Date(),
        fechaFinal: tratamiento.fechaFinal ? new Date(tratamiento.fechaFinal) : null,
        cultivoId: tratamiento.cultivoId ? tratamiento.cultivoId.toString() : null,
      });
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Finalizado': return '#10B981';
      case 'En Curso': return '#F59E0B';
      case 'Planificado': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const renderTratamiento = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>T{String(item.id).padStart(3, '0')}</Text>
        <View style={[styles.statusChip, { backgroundColor: getStatusColor(item.estado) }]}>
          <Text style={styles.statusText}>{item.estado}</Text>
        </View>
      </View>

      <Text style={styles.descripcion}>{item.descripcion}</Text>

      <View style={styles.detailsRow}>
        <Text style={styles.label}>Cultivo:</Text>
        <Text style={styles.value}>{item.cultivo?.nombre || 'General'}</Text>
      </View>

      <View style={styles.detailsRow}>
        <Text style={styles.label}>Tipo:</Text>
        <Text style={styles.value}>{item.tipo}</Text>
      </View>

      <View style={styles.detailsRow}>
        <Text style={styles.label}>Fechas:</Text>
        <Text style={styles.value}>
          {item.fechaInicio ? new Date(item.fechaInicio).toLocaleDateString() : 'N/A'} -
          {item.fechaFinal ? new Date(item.fechaFinal).toLocaleDateString() : 'N/A'}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openModal(item)}
        >
          <Icon name="edit" size={20} color="white" />
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
        >
          <Icon name="delete" size={20} color="white" />
          <Text style={styles.actionButtonText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Cargando tratamientos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Tratamientos</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Icon name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Planificar Tratamiento</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tratamientos}
        renderItem={renderTratamiento}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
        <Icon name="add" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalTitle}>
                {editingTratamiento ? 'Editar Tratamiento' : 'Planificar Tratamiento'}
              </Text>

              <TextInput
                placeholder="Descripción *"
                value={formData.descripcion}
                onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.pickerLabel}>Tipo de Tratamiento *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Seleccionar tipo..." value="" />
                  {tiposTratamiento.map((tipo) => (
                    <Picker.Item key={tipo} label={tipo} value={tipo} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.pickerLabel}>Estado</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.estado}
                  onValueChange={(value) => setFormData({ ...formData, estado: value })}
                  style={styles.picker}
                >
                  {estadosTratamiento.map((estado) => (
                    <Picker.Item key={estado} label={estado} value={estado} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.pickerLabel}>Cultivo (Opcional)</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.cultivoId}
                  onValueChange={(value) => setFormData({ ...formData, cultivoId: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="General (todos los cultivos)" value={null} />
                  {cultivos.map((cultivo) => (
                    <Picker.Item key={cultivo.id} label={cultivo.nombre} value={cultivo.id.toString()} />
                  ))}
                </Picker>
              </View>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowFechaInicioPicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  Fecha Inicio: {formData.fechaInicio.toLocaleDateString()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowFechaFinalPicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  Fecha Final: {formData.fechaFinal ? formData.fechaFinal.toLocaleDateString() : 'No definida'}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSave}
                >
                  <Text style={styles.buttonText}>{editingTratamiento ? 'Actualizar' : 'Crear'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {showFechaInicioPicker && (
        <DateTimePicker
          value={formData.fechaInicio}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowFechaInicioPicker(false);
            if (selectedDate) {
              setFormData({ ...formData, fechaInicio: selectedDate });
            }
          }}
        />
      )}

      {showFechaFinalPicker && (
        <DateTimePicker
          value={formData.fechaFinal || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowFechaFinalPicker(false);
            if (selectedDate) {
              setFormData({ ...formData, fechaFinal: selectedDate });
            }
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusChip: {
    height: 28,
  },
  descripcion: {
    fontSize: 16,
    color: '#555',
    marginBottom: 12,
    lineHeight: 22,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
    width: 80,
  },
  value: {
    color: '#555',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#10B981',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
    width: '90%',
  },
  modalScroll: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  input: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginBottom: 16,
  },
  picker: {
    height: 50,
  },
  dateButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  },
});

export default TratamientoScreen;