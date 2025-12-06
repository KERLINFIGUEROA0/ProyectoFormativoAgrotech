import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { TextInput } from 'react-native';
import api from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

export default function FinanzasTransaccionesScreen() {
  const [transacciones, setTransacciones] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: { id: null, tipo: '' } });
  const [cultivos, setCultivos] = useState([]);
  const [selectedCultivoId, setSelectedCultivoId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const transRes = await obtenerTransacciones();
      setTransacciones(transRes.data || []);
    } catch (error) {
      Alert.alert("Error", "Error al cargar las transacciones.");
      console.error("Error al cargar transacciones:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    cargarCultivos();
  }, []);

  const obtenerTransacciones = async () => {
    const token = await AsyncStorage.getItem('token');
    const [ventasRes, gastosRes] = await Promise.all([
      api.get("/ventas", {
        headers: { Authorization: `Bearer ${token}` }
      }),
      api.get("/gastos-produccion", {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    const ingresos = (ventasRes.data?.data || []).map((v) => ({
      ...v,
      id: v.id,
      tipo: 'ingreso',
      cantidad: v.cantidad || 1,
      unidad: v.unidadMedida || 'Unid',
      precioUnitario: v.precioUnitario || v.monto,
    }));

    const egresos = (gastosRes.data?.data || []).map((g) => ({
      ...g,
      id: `gasto-${g.id}`,
      tipo: 'egreso',
      cantidad: g.cantidad !== null ? Number(g.cantidad) : 1,
      unidad: g.unidad || '-',
      precioUnitario: g.precioUnitario !== null ? Number(g.precioUnitario) : g.monto,
    }));

    const allTransacciones = [...ingresos, ...egresos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return { data: allTransacciones };
  };

  const cargarCultivos = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.get('/cultivos/listar', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setCultivos(response.data.data || []);
      }
    } catch (error) {
      console.error('Error al cargar cultivos:', error);
      Alert.alert("Error", "Error al cargar los cultivos");
    }
  };

  const handleDelete = (id, tipo) => {
    setDeleteModal({ isOpen: true, item: { id, tipo } });
  };

  const confirmDelete = async () => {
    if (!deleteModal.item) return;
    const { id, tipo } = deleteModal.item;
    try {
      await eliminarTransaccion(id);
      Alert.alert("Éxito", `${tipo === 'ingreso' ? 'Venta' : 'Gasto'} eliminada con éxito.`);
      fetchData();
    } catch (error) {
      Alert.alert("Error", `Error al eliminar la ${tipo === 'ingreso' ? 'venta' : 'gasto'}.`);
      console.error('Error al eliminar:', error);
    } finally {
      setDeleteModal({ isOpen: false, item: { id: null, tipo: '' } });
    }
  };

  const eliminarTransaccion = async (id) => {
    const token = await AsyncStorage.getItem('token');
    const isEgreso = typeof id === 'string' && id.startsWith('gasto-');
    const actualId = isEgreso ? id.replace('gasto-', '') : id;

    if (isEgreso) {
      await api.delete(`/gastos-produccion/${actualId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } else {
      await api.delete(`/ventas/${actualId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  };

  const filteredTransacciones = transacciones.filter(t =>
    t && t.descripcion && t.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderTransactionItem = ({ item, index }) => (
    <View style={[styles.tableRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
      <Text style={[styles.tableCell, { flex: 1 }]}>
        {new Date(item.fecha).toLocaleDateString('es-ES')}
      </Text>
      <View style={[styles.tableCell, { flex: 1, flexDirection: 'row', alignItems: 'center' }]}>
        <View style={[
          styles.typeBadge,
          item.tipo === 'ingreso' ? styles.incomeBadge : styles.expenseBadge
        ]}>
          <Text style={[
            styles.typeIcon,
            item.tipo === 'ingreso' ? styles.incomeIcon : styles.expenseIcon
          ]}>
            {item.tipo === 'ingreso' ? '↑' : '↓'}
          </Text>
          <Text style={[
            styles.typeText,
            item.tipo === 'ingreso' ? styles.incomeText : styles.expenseText
          ]}>
            {item.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
          </Text>
        </View>
      </View>
      <Text style={[styles.tableCell, { flex: 2, fontWeight: '500' }]} numberOfLines={1}>
        {item.descripcion}
      </Text>
      <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'right' }]}>
        {item.cantidad}
      </Text>
      <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'center', color: '#6B7280' }]}>
        {item.unidad || '-'}
      </Text>
      <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: '#6B7280' }]}>
        {currencyFormatter.format(item.precioUnitario || 0)}
      </Text>
      <Text style={[
        styles.tableCell,
        {
          flex: 1,
          textAlign: 'right',
          fontWeight: 'bold',
          color: item.tipo === 'egreso' ? '#EF4444' : '#10B981'
        }
      ]}>
        {item.tipo === 'egreso' ? '-' : ''}{currencyFormatter.format(item.monto)}
      </Text>
      <View style={[styles.tableCell, { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}>
        {item.rutaFacturaPdf && (
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.downloadIcon}>📄</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id, item.tipo)}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Cargando transacciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Transacciones</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (selectedCultivoId) {
                Alert.alert("Info", "Exportar Excel por cultivo próximamente");
              } else {
                Alert.alert("Error", "Por favor seleccione un cultivo primero");
              }
            }}
          >
            <Text style={styles.actionButtonText}>📊 Excel por Cultivo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert("Info", "Exportar Excel general próximamente")}
          >
            <Text style={styles.actionButtonText}>📊 Excel General</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setIsModalOpen(true)}
          >
            <Text style={styles.actionButtonText}>➕ Nueva Venta</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filters}>
        <TextInput
          placeholder="Seleccionar Cultivo (ID)"
          style={styles.cultivoSelect}
          value={selectedCultivoId ? selectedCultivoId.toString() : ''}
          onChangeText={(text) => setSelectedCultivoId(text ? Number(text) : null)}
          keyboardType="numeric"
        />

        <TextInput
          placeholder="Buscar por descripción..."
          style={styles.searchInput}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <FlatList
        data={filteredTransacciones}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTransactionItem}
        ListHeaderComponent={() => (
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Fecha</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Tipo</Text>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Descripción</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'right' }]}>Cant.</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'center' }]}>Unidad</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Precio Unit.</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Valor Total</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Acciones</Text>
          </View>
        )}
        stickyHeaderIndices={[0]}
        style={styles.tableContainer}
      />

      {/* Modal de confirmación de eliminación */}
      <Modal
        visible={deleteModal.isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModal({ isOpen: false, item: { id: null, tipo: '' } })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar Eliminación</Text>
            <Text style={styles.modalText}>
              ¿Estás seguro de que quieres eliminar esta {deleteModal.item?.tipo === 'ingreso' ? 'venta' : 'gasto'}?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteModal({ isOpen: false, item: { id: null, tipo: '' } })}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteConfirmButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal del formulario - Placeholder por ahora */}
      <Modal
        visible={isModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContent}>
            <Text style={styles.modalTitle}>Nueva Transacción</Text>
            <Text style={styles.formPlaceholder}>Formulario próximamente</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalOpen(false)}
            >
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  filters: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  cultivoSelect: {
    flex: 1,
    maxWidth: 256,
  },
  searchInput: {
    flex: 1,
    maxWidth: 288,
  },
  tableContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  evenRow: {
    backgroundColor: '#FFFFFF',
  },
  oddRow: {
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    fontSize: 14,
    color: '#374151',
    paddingVertical: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  incomeBadge: {
    backgroundColor: '#D1FAE5',
  },
  expenseBadge: {
    backgroundColor: '#FEE2E2',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  incomeText: {
    color: '#065F46',
  },
  expenseText: {
    color: '#991B1B',
  },
  actionButton: {
    padding: 4,
    borderRadius: 4,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  formModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 600,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  formPlaceholder: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 40,
  },
  actionButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  downloadIcon: {
    fontSize: 16,
    color: '#3B82F6',
  },
  deleteIcon: {
    fontSize: 16,
  },
  modalButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteConfirmButton: {
    backgroundColor: '#EF4444',
    marginLeft: 8,
  },
  deleteConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  typeIcon: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  incomeIcon: {
    color: '#10B981',
  },
  expenseIcon: {
    color: '#EF4444',
  },
});