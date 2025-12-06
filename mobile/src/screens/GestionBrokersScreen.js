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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../config/api';

const GestionBrokersScreen = () => {
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBroker, setEditingBroker] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingBroker, setDeletingBroker] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    protocolo: 'mqtt',
    host: '',
    puerto: '1883',
    usuario: '',
    contrasena: '',
    estado: 'Inactivo',
  });

  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    try {
      const response = await api.get('/mqtt-config/listar');
      setBrokers(response.data || []);
    } catch (error) {
      console.error('Error fetching brokers:', error);
      Alert.alert('Error', 'No se pudieron cargar los brokers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.nombre || !formData.host || !formData.puerto) {
      Alert.alert('Error', 'Por favor complete todos los campos requeridos');
      return;
    }

    try {
      await api.post('/mqtt-config/crear', formData);
      Alert.alert('Éxito', 'Broker creado correctamente');
      setModalVisible(false);
      resetForm();
      fetchBrokers();
    } catch (error) {
      console.error('Error creating broker:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al crear broker');
    }
  };

  const handleUpdate = async () => {
    if (!formData.nombre || !formData.host || !formData.puerto) {
      Alert.alert('Error', 'Por favor complete todos los campos requeridos');
      return;
    }

    try {
      await api.put(`/mqtt-config/actualizar/${editingBroker.id}`, formData);
      Alert.alert('Éxito', 'Broker actualizado correctamente');
      setModalVisible(false);
      resetForm();
      fetchBrokers();
    } catch (error) {
      console.error('Error updating broker:', error);
      Alert.alert('Error', error.response?.data?.message || 'Error al actualizar broker');
    }
  };

  const handleDelete = (broker) => {
    setDeletingBroker(broker);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!deletingBroker) return;

    try {
      await api.delete(`/mqtt-config/eliminar/${deletingBroker.id}`);
      Alert.alert('Éxito', 'Broker eliminado correctamente');
      setDeleteModalVisible(false);
      setDeletingBroker(null);
      fetchBrokers();
    } catch (error) {
      console.error('Error deleting broker:', error);
      Alert.alert('Error', 'Error al eliminar broker');
    }
  };

  const handleToggleEstado = async (broker) => {
    const nuevoEstado = broker.estado === 'Activo' ? 'Inactivo' : 'Activo';
    try {
      await api.patch(`/mqtt-config/actualizar/${broker.id}/estado`, {
        estado: nuevoEstado
      });
      Alert.alert('Éxito', `Estado del broker actualizado a ${nuevoEstado}`);
      fetchBrokers();
    } catch (error) {
      console.error('Error updating broker status:', error);
      Alert.alert('Error', 'Error al actualizar estado del broker');
    }
  };

  const openCreateModal = () => {
    setEditingBroker(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (broker) => {
    setEditingBroker(broker);
    setFormData({
      nombre: broker.nombre,
      protocolo: broker.protocolo,
      host: broker.host,
      puerto: broker.puerto.toString(),
      usuario: broker.usuario || '',
      contrasena: broker.contrasena || '',
      estado: broker.estado,
    });
    setModalVisible(true);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      protocolo: 'mqtt',
      host: '',
      puerto: '1883',
      usuario: '',
      contrasena: '',
      estado: 'Inactivo',
    });
  };

  const renderBrokerCard = ({ item }) => {
    const isActive = item.estado === 'Activo';

    return (
      <View style={styles.brokerCard}>
        <View style={styles.cardHeader}>
          <View style={styles.brokerInfo}>
            <View style={[styles.statusDot, { backgroundColor: isActive ? '#10B981' : '#F59E0B' }]} />
            <View style={styles.brokerDetails}>
              <Text style={styles.brokerName}>{item.nombre}</Text>
              <Text style={styles.brokerUrl}>
                {item.protocolo}://{item.host}:{item.puerto}
              </Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isActive ? '#F59E0B' : '#10B981' }]}
              onPress={() => handleToggleEstado(item)}
            >
              <Ionicons
                name={isActive ? 'pause' : 'play'}
                size={16}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => openEditModal(item)}
            >
              <Ionicons name="pencil" size={16} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.statusText}>
            Estado: <Text style={{ color: isActive ? '#10B981' : '#F59E0B', fontWeight: 'bold' }}>
              {item.estado}
            </Text>
          </Text>
          {item.usuario && (
            <Text style={styles.authText}>
              Autenticado: Sí
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Cargando brokers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configuración de Brokers</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Nuevo Broker</Text>
        </TouchableOpacity>
      </View>

      {/* LISTA DE BROKERS */}
      <FlatList
        data={brokers}
        renderItem={renderBrokerCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="server" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No hay brokers configurados</Text>
            <Text style={styles.emptySubtext}>Crea uno nuevo para comenzar</Text>
          </View>
        }
      />

      {/* MODAL DE CREAR/EDITAR */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingBroker ? 'Editar Broker' : 'Crear Broker'}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre del broker"
                value={formData.nombre}
                onChangeText={(text) => setFormData({ ...formData, nombre: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Protocolo</Text>
              <View style={styles.protocolSelector}>
                {['mqtt', 'mqtts', 'ws', 'wss'].map(protocol => (
                  <TouchableOpacity
                    key={protocol}
                    style={[
                      styles.protocolOption,
                      formData.protocolo === protocol && styles.protocolOptionSelected
                    ]}
                    onPress={() => setFormData({ ...formData, protocolo: protocol })}
                  >
                    <Text style={[
                      styles.protocolText,
                      formData.protocolo === protocol && styles.protocolTextSelected
                    ]}>
                      {protocol.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Host *</Text>
              <TextInput
                style={styles.input}
                placeholder="ejemplo.com o 192.168.1.100"
                value={formData.host}
                onChangeText={(text) => setFormData({ ...formData, host: text })}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Puerto *</Text>
              <TextInput
                style={styles.input}
                placeholder="1883"
                value={formData.puerto}
                onChangeText={(text) => setFormData({ ...formData, puerto: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Usuario (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Usuario"
                value={formData.usuario}
                onChangeText={(text) => setFormData({ ...formData, usuario: text })}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                value={formData.contrasena}
                onChangeText={(text) => setFormData({ ...formData, contrasena: text })}
                secureTextEntry
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={editingBroker ? handleUpdate : handleCreate}
              >
                <Text style={styles.saveButtonText}>
                  {editingBroker ? 'Actualizar' : 'Crear'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteIcon}>
              <Ionicons name="warning" size={32} color="#EF4444" />
            </View>
            <Text style={styles.deleteTitle}>¿Eliminar broker?</Text>
            <Text style={styles.deleteMessage}>
              ¿Está seguro de eliminar el broker "{deletingBroker?.nombre}"?
              Esta acción no se puede deshacer.
            </Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.deleteCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteConfirmText}>Eliminar</Text>
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
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  listContainer: {
    padding: 16,
  },
  brokerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  brokerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  brokerDetails: {
    flex: 1,
  },
  brokerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  brokerUrl: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
  },
  authText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  protocolSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  protocolOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  protocolOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  protocolText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  protocolTextSelected: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '100%',
  },
  deleteIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  deleteCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default GestionBrokersScreen;