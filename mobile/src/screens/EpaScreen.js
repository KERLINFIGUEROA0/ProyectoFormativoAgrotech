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
  Image,
  TextInput as RNTextInput,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fitosanitarioApi } from '../config/fitosanitarioApi';
import { MaterialIcons as Icon } from '@expo/vector-icons';

const EpaScreen = () => {
  const [epas, setEpas] = useState([]);
  const [filteredEpas, setFilteredEpas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modales
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Estados para formularios
  const [editingEpa, setEditingEpa] = useState(null);
  const [selectedEpa, setSelectedEpa] = useState(null);
  const [deletingEpa, setDeletingEpa] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipoEnfermedad: '',
    fechaEncuentro: new Date(),
    complicaciones: '',
  });

  const [showFechaPicker, setShowFechaPicker] = useState(false);

  const tiposEnfermedad = [
    'Enfermedad',
    'Plaga',
    'Arvense'
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fitosanitarioApi.listarEpas();
      setEpas(data || []);
    } catch (error) {
      console.error('Error fetching EPAs:', error);
      Alert.alert('Error', 'Error al cargar los EPAs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Filtrar EPAs basado en búsqueda y tipo
    let filtered = epas;

    if (searchQuery) {
      filtered = filtered.filter(epa =>
        epa.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        epa.descripcion?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType !== 'Todos') {
      filtered = filtered.filter(epa => epa.tipoEnfermedad === filterType);
    }

    setFilteredEpas(filtered);
    setCurrentPage(1);
  }, [searchQuery, filterType, epas]);

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEpas = filteredEpas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEpas.length / itemsPerPage);

  const handleSave = async () => {
    if (!formData.nombre.trim() || !formData.descripcion.trim() || !formData.tipoEnfermedad) {
      Alert.alert('Error', 'Por favor complete todos los campos requeridos.');
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        fechaEncuentro: formData.fechaEncuentro.toISOString().split('T')[0],
      };

      if (editingEpa) {
        await fitosanitarioApi.actualizarEpa(editingEpa.id, dataToSend);
        Alert.alert('Éxito', 'EPA actualizado correctamente.');
      } else {
        await fitosanitarioApi.crearEpa(dataToSend);
        Alert.alert('Éxito', 'EPA creado correctamente.');
      }

      fetchData();
      setFormModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Error saving EPA:', error);
      Alert.alert('Error', 'Error al guardar el EPA.');
    }
  };

  const handleDelete = async (epa) => {
    try {
      await fitosanitarioApi.eliminarEpa(epa.id);
      Alert.alert('Éxito', 'EPA eliminado correctamente.');
      fetchData();
    } catch (error) {
      console.error('Error deleting EPA:', error);
      Alert.alert('Error', 'No se pudo eliminar el EPA.');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      tipoEnfermedad: '',
      fechaEncuentro: new Date(),
      complicaciones: '',
    });
    setEditingEpa(null);
  };

  const openFormModal = (epa = null) => {
    if (epa) {
      setEditingEpa(epa);
      setFormData({
        nombre: epa.nombre || '',
        descripcion: epa.descripcion || '',
        tipoEnfermedad: epa.tipoEnfermedad || '',
        fechaEncuentro: epa.fechaEncuentro ? new Date(epa.fechaEncuentro) : new Date(),
        complicaciones: epa.complicaciones || '',
      });
    } else {
      resetForm();
    }
    setFormModalVisible(true);
  };

  const openDetailModal = (epa) => {
    Alert.alert(
      epa.nombre,
      `Tipo: ${epa.tipoEnfermedad}\n\nDescripción: ${epa.descripcion || 'No registrada'}\n\nTratamiento: ${epa.complicaciones || 'No registrado'}\n\nRegistrado: ${new Date(epa.fechaEncuentro || Date.now()).toLocaleDateString()}`,
      [{ text: 'Cerrar' }]
    );
  };

  const openDeleteModal = (epa) => {
    Alert.alert(
      'Eliminar EPA',
      `¿Estás seguro de que quieres eliminar "${epa.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => handleDelete(epa),
        },
      ]
    );
  };

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case 'Enfermedad': return '#EF4444';
      case 'Plaga': return '#F59E0B';
      case 'Arvense': return '#10B981';
      default: return '#6B7280';
    }
  };

  const renderEpa = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.nombre}</Text>
        <View style={[styles.typeChip, { backgroundColor: getTipoColor(item.tipoEnfermedad) }]}>
          <Text style={styles.typeChipText}>{item.tipoEnfermedad}</Text>
        </View>
      </View>

      <Text style={styles.descripcion} numberOfLines={2}>
        {item.descripcion || 'Sin descripción'}
      </Text>

      <Text style={styles.fecha}>
        Registrado: {new Date(item.fechaEncuentro || Date.now()).toLocaleDateString()}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => openDetailModal(item)}
        >
          <Icon name="visibility" size={20} color="white" />
          <Text style={styles.actionButtonText}>Ver</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openFormModal(item)}
        >
          <Icon name="edit" size={20} color="white" />
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => openDeleteModal(item)}
        >
          <Icon name="delete" size={20} color="white" />
          <Text style={styles.actionButtonText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
          onPress={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <Icon name="chevron-left" size={24} color={currentPage === 1 ? '#ccc' : '#333'} />
        </TouchableOpacity>

        <Text style={styles.pageInfo}>
          {currentPage} de {totalPages}
        </Text>

        <TouchableOpacity
          style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
          onPress={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <Icon name="chevron-right" size={24} color={currentPage === totalPages ? '#ccc' : '#333'} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Cargando EPAs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Fitosanitario</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openFormModal()}>
          <Icon name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Nuevo EPA</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <RNTextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o descripción..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Tipo:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={filterType}
              onValueChange={setFilterType}
              style={styles.picker}
            >
              <Picker.Item label="Todos" value="Todos" />
              {tiposEnfermedad.map((tipo) => (
                <Picker.Item key={tipo} label={tipo} value={tipo} />
              ))}
            </Picker>
          </View>
        </View>

        <Text style={styles.resultsText}>
          {filteredEpas.length} resultado{filteredEpas.length !== 1 ? 's' : ''} encontrado{filteredEpas.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={currentEpas}
        renderItem={renderEpa}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={renderPagination}
      />

      {/* Modal de Formulario */}
      <Modal
        visible={formModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFormModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalTitle}>
                {editingEpa ? 'Actualizar EPA' : 'Registrar Nuevo EPA'}
              </Text>

              <RNTextInput
                style={styles.input}
                placeholder="Nombre del EPA *"
                value={formData.nombre}
                onChangeText={(text) => setFormData({ ...formData, nombre: text })}
              />

              <RNTextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descripción *"
                value={formData.descripcion}
                onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.pickerLabel}>Tipo de Enfermedad *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.tipoEnfermedad}
                  onValueChange={(value) => setFormData({ ...formData, tipoEnfermedad: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Seleccionar tipo..." value="" />
                  {tiposEnfermedad.map((tipo) => (
                    <Picker.Item key={tipo} label={tipo} value={tipo} />
                  ))}
                </Picker>
              </View>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowFechaPicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  Fecha de Encuentro: {formData.fechaEncuentro.toLocaleDateString()}
                </Text>
              </TouchableOpacity>

              <RNTextInput
                style={[styles.input, styles.textArea]}
                placeholder="Complicaciones/Tratamiento (Opcional)"
                value={formData.complicaciones}
                onChangeText={(text) => setFormData({ ...formData, complicaciones: text })}
                multiline
                numberOfLines={2}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => setFormModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSave}
                >
                  <Text style={styles.buttonText}>{editingEpa ? 'Actualizar' : 'Crear'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {showFechaPicker && (
        <DateTimePicker
          value={formData.fechaEncuentro}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowFechaPicker(false);
            if (selectedDate) {
              setFormData({ ...formData, fechaEncuentro: selectedDate });
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
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
  filters: {
    marginBottom: 16,
  },
  searchbar: {
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 12,
    width: 50,
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
  },
  picker: {
    height: 50,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
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
    flex: 1,
  },
  typeChip: {
    height: 28,
  },
  descripcion: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
  fecha: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    flex: 1,
    marginHorizontal: 2,
  },
  viewButton: {
    backgroundColor: '#3B82F6',
  },
  editButton: {
    backgroundColor: '#10B981',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#10B981',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  detailModalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '90%',
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  dateButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
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
  epaImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  epaName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  detailTypeChip: {
    alignSelf: 'center',
    marginBottom: 20,
    height: 32,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  detailDate: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
  },
  deleteModalContainer: {
    backgroundColor: 'white',
    margin: 40,
    borderRadius: 8,
  },
  deleteModalContent: {
    padding: 24,
    alignItems: 'center',
  },
  warningIcon: {
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  deleteText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  deleteItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    width: '100%',
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  deleteConfirmButton: {
    flex: 1,
    marginLeft: 8,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  pageButton: {
    padding: 8,
    marginHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  pageButtonDisabled: {
    backgroundColor: '#e5e5e5',
  },
  pageInfo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  typeChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  typeChipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  dateButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
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
});

export default EpaScreen;