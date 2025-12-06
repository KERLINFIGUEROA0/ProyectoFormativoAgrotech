import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { getLotes, createLote, updateLote, updateLoteEstado, getEstadisticasLotes } from '../config/api';

const LoteScreen = () => {
  const [lotes, setLotes] = useState([]);
  const [filteredLotes, setFilteredLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLote, setEditingLote] = useState(null);
  const [selectedLote, setSelectedLote] = useState(null);

  // Estados para tabs
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'lista', title: 'Lista' },
    { key: 'mapa', title: 'Mapa' },
  ]);

  // Estados para filtros y paginación
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    enPreparacion: 0,
    parcialmenteOcupado: 0,
    enCultivo: 0,
    enMantenimiento: 0
  });

  const [formData, setFormData] = useState({
    nombre: '',
    area: '',
    estado: 'Activo',
    coordenadas: null,
  });

  useEffect(() => {
    loadLotes();
  }, []);

  // Filtrado
  useEffect(() => {
    let filtered = lotes;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(lote => lote.estado === filterStatus);
    }

    setFilteredLotes(filtered);
    setCurrentPage(1); // Reset page when filter changes
  }, [lotes, filterStatus]);

  const loadLotes = async () => {
    try {
      setLoading(true);
      const [lotesResponse, statsResponse] = await Promise.all([
        getLotes(),
        getEstadisticasLotes()
      ]);
      setLotes(lotesResponse.data || []);
      setStats(statsResponse.data || {
        total: 0,
        enPreparacion: 0,
        parcialmenteOcupado: 0,
        enCultivo: 0,
        enMantenimiento: 0
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los lotes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const loteData = {
        ...formData,
        area: parseFloat(formData.area),
        coordenadas: formData.coordenadas ? {
          type: 'point',
          coordinates: {
            lat: parseFloat(formData.coordenadas.lat),
            lng: parseFloat(formData.coordenadas.lng),
          },
        } : undefined,
      };

      let updatedLote;
      if (editingLote) {
        updatedLote = await updateLote(editingLote.id, loteData);
        Alert.alert('Éxito', 'Lote actualizado correctamente');
      } else {
        updatedLote = await createLote(loteData);
        Alert.alert('Éxito', 'Lote creado correctamente');
      }
      setModalVisible(false);
      resetForm();
      await loadLotes();
      // Seleccionar el lote recién creado/actualizado en el mapa
      setSelectedLote(updatedLote.data);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al guardar lote');
    }
  };

  const handleViewLocation = (lote) => {
    setSelectedLote(lote);
    Alert.alert('Ubicación', `Mostrando ubicación del ${lote.nombre}`);
  };

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLotes = filteredLotes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLotes.length / itemsPerPage);

  const handleUpdateEstado = async (id, nuevoEstado) => {
    try {
      await updateLoteEstado(id, { estado: nuevoEstado });
      Alert.alert('Éxito', 'Estado del lote actualizado correctamente');
      loadLotes();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado del lote');
    }
  };

  const openModal = (lote = null) => {
    if (lote) {
      setEditingLote(lote);
      setFormData({
        nombre: lote.nombre || '',
        area: lote.area?.toString() || '',
        estado: lote.estado || 'Activo',
        coordenadas: lote.coordenadas ? {
          lat: lote.coordenadas.coordinates?.lat?.toString() || '',
          lng: lote.coordenadas.coordinates?.lng?.toString() || '',
        } : null,
      });
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingLote(null);
    setFormData({
      nombre: '',
      area: '',
      estado: 'Activo',
      coordenadas: null,
    });
  };

  // Componente para estadísticas compactas
  const CompactStat = ({ icon, title, value, color }) => {
    const colorStyles = {
      primary: { backgroundColor: '#DBEAFE', textColor: '#1E40AF' },
      danger: { backgroundColor: '#FEE2E2', textColor: '#DC2626' },
      success: { backgroundColor: '#DCFCE7', textColor: '#16A34A' },
      warning: { backgroundColor: '#FEF3C7', textColor: '#D97706' },
    };

    return (
      <View style={[styles.statCard, { backgroundColor: colorStyles[color].backgroundColor }]}>
        <View style={styles.statIcon}>
          <Text style={{ color: colorStyles[color].textColor, fontSize: 20 }}>{icon}</Text>
        </View>
        <View>
          <Text style={[styles.statTitle, { color: colorStyles[color].textColor }]}>{title}</Text>
          <Text style={[styles.statValue, { color: colorStyles[color].textColor }]}>{value}</Text>
        </View>
      </View>
    );
  };

  const renderLote = ({ item }) => (
    <View style={styles.tableRow}>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>{item.nombre}</Text>
      </View>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>{item.area || 'N/A'} m²</Text>
      </View>
      <View style={styles.tableCell}>
        <View style={[styles.statusBadge, getStatusBadgeStyle(item.estado)]}>
          <Text style={styles.statusBadgeText}>{item.estado}</Text>
        </View>
      </View>
      <View style={styles.tableCell}>
        <TouchableOpacity
          style={[styles.button, styles.locationButton]}
          onPress={() => handleViewLocation(item)}
        >
          <Text style={styles.buttonText}>Ver</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tableCell}>
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => openModal(item)}
        >
          <Text style={styles.buttonText}>Editar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStatusBadgeStyle = (estado) => {
    switch (estado) {
      case 'En preparación':
        return styles.statusWarning;
      case 'Parcialmente ocupado':
        return styles.statusPrimary;
      case 'En cultivación':
        return styles.statusSuccess;
      case 'En mantenimiento':
        return styles.statusDanger;
      default:
        return styles.statusDefault;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  // Vista de Lista
  const ListaScene = () => (
    <View style={styles.scene}>
      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <Picker
          selectedValue={filterStatus}
          onValueChange={(value) => setFilterStatus(value)}
          style={styles.filterPicker}
        >
          <Picker.Item label="Todos los estados" value="all" />
          <Picker.Item label="En preparación" value="En preparación" />
          <Picker.Item label="Parcialmente ocupado" value="Parcialmente ocupado" />
          <Picker.Item label="En cultivación" value="En cultivación" />
          <Picker.Item label="En mantenimiento" value="En mantenimiento" />
        </Picker>
      </View>

      {/* Tabla de lotes */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Nombre</Text>
          <Text style={styles.tableHeaderText}>Área</Text>
          <Text style={styles.tableHeaderText}>Estado</Text>
          <Text style={styles.tableHeaderText}>Ubicación</Text>
          <Text style={styles.tableHeaderText}>Acciones</Text>
        </View>
        <FlatList
          data={currentLotes}
          renderItem={renderLote}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.tableBody}
        />
      </View>

      {/* Paginación */}
      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
            onPress={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <Text style={styles.pageButtonText}>Anterior</Text>
          </TouchableOpacity>
          <Text style={styles.pageInfo}>
            Página {currentPage} de {totalPages}
          </Text>
          <TouchableOpacity
            style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
            onPress={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <Text style={styles.pageButtonText}>Siguiente</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Vista de Mapa (placeholder por ahora)
  const MapaScene = () => (
    <View style={styles.scene}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>Vista de mapa próximamente</Text>
        <Text style={styles.mapPlaceholderSubtext}>Aquí se mostrará el mapa con los lotes</Text>
        {selectedLote && (
          <Text style={styles.selectedLoteText}>
            Lote seleccionado: {selectedLote.nombre}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header con título y botones */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Gestión de Lotes</Text>
          <Text style={styles.subtitle}>Administra tus terrenos agrícolas</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openModal()}
          >
            <Text style={styles.addButtonText}>Nuevo Lote</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Estadísticas */}
      <View style={styles.statsContainer}>
        <CompactStat icon="🏠" title="Total Lotes" value={stats.total} color="success" />
        <CompactStat icon="⚙️" title="En preparación" value={stats.enPreparacion} color="warning" />
        <CompactStat icon="🌱" title="En cultivación" value={stats.enCultivo} color="primary" />
        <CompactStat icon="🔧" title="En mantenimiento" value={stats.enMantenimiento} color="danger" />
      </View>

      {/* Tab View */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={SceneMap({
          lista: ListaScene,
          mapa: MapaScene,
        })}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={styles.tabIndicator}
            style={styles.tabBar}
            labelStyle={styles.tabLabel}
          />
        )}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingLote ? 'Editar Lote' : 'Crear Lote'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre del lote"
              value={formData.nombre}
              onChangeText={(value) => setFormData({...formData, nombre: value})}
            />

            <TextInput
              style={styles.input}
              placeholder="Área (m²)"
              value={formData.area}
              onChangeText={(value) => setFormData({...formData, area: value})}
              keyboardType="numeric"
            />

            <Picker
              selectedValue={formData.estado}
              onValueChange={(value) => setFormData({...formData, estado: value})}
              style={styles.picker}
            >
              <Picker.Item label="Activo" value="Activo" />
              <Picker.Item label="Inactivo" value="Inactivo" />
              <Picker.Item label="En preparación" value="En preparación" />
            </Picker>

            <Text style={styles.sectionTitle}>Coordenadas (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Latitud"
              value={formData.coordenadas?.lat || ''}
              onChangeText={(value) => setFormData({
                ...formData,
                coordenadas: { ...formData.coordenadas, lat: value }
              })}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Longitud"
              value={formData.coordenadas?.lng || ''}
              onChangeText={(value) => setFormData({
                ...formData,
                coordenadas: { ...formData.coordenadas, lng: value }
              })}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.buttonText}>
                  {editingLote ? 'Actualizar' : 'Crear'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  addButton: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabBar: {
    backgroundColor: 'white',
  },
  tabIndicator: {
    backgroundColor: '#10b981',
  },
  tabLabel: {
    fontWeight: 'bold',
    color: '#374151',
  },
  scene: {
    flex: 1,
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterPicker: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  tableContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
  tableBody: {
    paddingBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusSuccess: {
    backgroundColor: '#dcfce7',
  },
  statusWarning: {
    backgroundColor: '#fef3c7',
  },
  statusPrimary: {
    backgroundColor: '#dbeafe',
  },
  statusDanger: {
    backgroundColor: '#fee2e2',
  },
  statusDefault: {
    backgroundColor: '#f3f4f6',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  button: {
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
    minWidth: 50,
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  locationButton: {
    backgroundColor: '#8b5cf6',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  pageButton: {
    backgroundColor: '#10b981',
    padding: 8,
    borderRadius: 4,
  },
  pageButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  pageButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pageInfo: {
    fontSize: 14,
    color: '#374151',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  selectedLoteText: {
    fontSize: 16,
    color: '#10b981',
    marginTop: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 12,
    borderRadius: 4,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#28a745',
    flex: 1,
    marginLeft: 8,
  },
});

export default LoteScreen;