import React, { useState, useEffect, useMemo } from 'react';
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
  Image,
  Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api, { getMateriales, createMaterial, updateMaterial, deleteMaterial, desactivarMaterial, reactivarMaterial } from '../config/api';

const MaterialesScreen = () => {
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('Todas');
  const [filterUbicacion, setFilterUbicacion] = useState('Todas');
  const [filterEstadoStock, setFilterEstadoStock] = useState('Todos');
  const [filterProveedor, setFilterProveedor] = useState('Todos');
  const [filterEstadoMaterial, setFilterEstadoMaterial] = useState('Todos');
  const [showFilters, setShowFilters] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipoCategoria: 'Herramienta',
    tipoMaterial: 'Manual',
    tipoEmpaque: 'Unidad',
    cantidad: '',
    precio: '',
    ubicacion: '',
    proveedor: '',
    pesoPorUnidad: '',
    medidasDeContenido: 'Kilogramo',
  });

  useEffect(() => {
    fetchMateriales();
  }, []);

  const fetchMateriales = async () => {
    try {
      setLoading(true);
      const response = await getMateriales();
      setMateriales(response.data || []);
    } catch (error) {
      console.error('Error al cargar materiales:', error);
      Alert.alert('Error', 'No se pudieron cargar los materiales');
    } finally {
      setLoading(false);
    }
  };

  // Función para mostrar cantidad amigable (Paquetes + Peso Total)
  const renderCantidadAmigable = (cantidadTotal, pesoPorUnidad, tipoEmpaque) => {
    // Caso 1: Herramientas o items sin peso definido
    if (!pesoPorUnidad || pesoPorUnidad <= 0) {
      return `${cantidadTotal || 0} ${tipoEmpaque}`;
    }

    // Caso 2: Consumibles (Abonos, Químicos)
    const cantidad = cantidadTotal || 0;
    const paquetesEstimados = cantidad / pesoPorUnidad;

    // Calculamos el peso total en KG
    const totalEnKg = cantidad / 1000;

    // Formateamos para quitar decimales feos si es exacto
    const paquetesVisual = Number.isInteger(paquetesEstimados)
        ? paquetesEstimados
        : paquetesEstimados.toFixed(1);

    const totalVisual = Number.isInteger(totalEnKg)
        ? totalEnKg
        : totalEnKg.toFixed(2);

    return `${paquetesVisual} ${tipoEmpaque}s\nTotal: ${totalVisual} kg`;
  };

  const getStatusInfo = (cantidad, pesoPorUnidad) => {
    const cantidadReal = cantidad || 0;
    let cantidadParaEvaluar = cantidadReal;

    // Si tiene peso por unidad, convertimos el total de gramos a "Paquetes" para evaluar la alerta
    if (pesoPorUnidad && pesoPorUnidad > 0) {
      cantidadParaEvaluar = cantidadReal / pesoPorUnidad;
    }

    // Evaluamos si quedan menos de 10 PAQUETES (o 10 unidades sueltas)
    if (cantidadParaEvaluar <= 5) return { text: 'Crítico', bg: '#dc3545', textColor: '#fff' };
    if (cantidadParaEvaluar <= 15) return { text: 'Stock Bajo', bg: '#ffc107', textColor: '#000' };
    return { text: 'Normal', bg: '#28a745', textColor: '#fff' };
  };

  const formatarContenido = (peso, tipoMedida) => {
    const pesoNumerico = Number(peso);
    if (!pesoNumerico || pesoNumerico <= 0) return null;

    const esLiquido = tipoMedida === 'Litro' || tipoMedida === 'Mililitro';

    if (pesoNumerico < 1) {
      const valorPequeño = Number((pesoNumerico * 1000).toFixed(3));
      return esLiquido ? `${valorPequeño} ml` : `${valorPequeño} g`;
    }

    const valorGrande = Number(pesoNumerico.toFixed(3));
    return esLiquido ? `${valorGrande} L` : `${valorGrande} kg`;
  };

  // Memo para contar items críticos
  const itemsCriticos = useMemo(() => {
    return materiales.filter(mat => mat.estado && mat.cantidad <= 10);
  }, [materiales]);

  const materialesFiltrados = useMemo(() => {
    let filtrados = [...materiales].filter(mat => {
      const busquedaLower = searchTerm.toLowerCase();
      const coincideBusqueda = busquedaLower === '' ||
        mat.nombre.toLowerCase().includes(busquedaLower) ||
        (mat.descripcion && mat.descripcion.toLowerCase().includes(busquedaLower));

      const coincideCategoria = filterCategoria === 'Todas' || mat.tipoCategoria === filterCategoria;
      const coincideUbicacion = filterUbicacion === 'Todas' || mat.ubicacion === filterUbicacion;
      const coincideProveedor = filterProveedor === 'Todos' || mat.proveedor === filterProveedor;

      const estadoStock = getStatusInfo(mat.cantidad, mat.pesoPorUnidad).text;
      const coincideEstadoStock = filterEstadoStock === 'Todos' || estadoStock === filterEstadoStock;

      const coincideEstadoMaterial = filterEstadoMaterial === 'Todos' ||
        (filterEstadoMaterial === 'Activo' && mat.estado) ||
        (filterEstadoMaterial === 'Inactivo' && !mat.estado);

      return coincideBusqueda && coincideCategoria && coincideUbicacion && coincideProveedor && coincideEstadoStock && coincideEstadoMaterial;
    });

    return filtrados;
  }, [materiales, searchTerm, filterCategoria, filterUbicacion, filterEstadoStock, filterProveedor, filterEstadoMaterial]);

  const tiposCategoriaUnicos = useMemo(() => [...new Set(materiales.map(m => m.tipoCategoria).filter(Boolean))], [materiales]);
  const ubicacionesUnicas = useMemo(() => [...new Set(materiales.map(m => m.ubicacion).filter(Boolean))], [materiales]);
  const proveedoresUnicos = useMemo(() => [...new Set(materiales.map(m => m.proveedor).filter(Boolean))], [materiales]);

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        cantidad: parseFloat(formData.cantidad) || 0,
        precio: parseFloat(formData.precio) || 0,
        pesoPorUnidad: formData.pesoPorUnidad ? parseFloat(formData.pesoPorUnidad) : null,
      };

      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, data);
        Alert.alert('Éxito', 'Material actualizado correctamente');
      } else {
        await createMaterial(data);
        Alert.alert('Éxito', 'Material creado correctamente');
      }

      setModalVisible(false);
      resetForm();
      fetchMateriales();
    } catch (error) {
      console.error('Error al guardar material:', error);
      Alert.alert('Error', 'No se pudo guardar el material');
    }
  };

  const handleToggleEstado = async (material) => {
    const action = material.estado ? 'Desactivando...' : 'Activando...';
    Alert.alert(
      'Confirmar cambio',
      `¿Estás seguro de que quieres ${material.estado ? 'desactivar' : 'activar'} este material?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              if (material.estado) {
                await desactivarMaterial(material.id);
                Alert.alert('Éxito', 'Material desactivado correctamente');
              } else {
                await reactivarMaterial(material.id);
                Alert.alert('Éxito', 'Material activado correctamente');
              }
              fetchMateriales();
            } catch (error) {
              console.error('Error al cambiar estado del material:', error);
              Alert.alert('Error', 'No se pudo cambiar el estado del material');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este material?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/materiales/${id}`);
              Alert.alert('Éxito', 'Material eliminado correctamente');
              fetchMateriales();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el material');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      tipoCategoria: 'Herramienta',
      tipoMaterial: 'Manual',
      tipoEmpaque: 'Unidad',
      cantidad: '',
      precio: '',
      ubicacion: '',
      proveedor: '',
      pesoPorUnidad: '',
      medidasDeContenido: 'Kilogramo',
    });
    setEditingMaterial(null);
  };

  const openModal = (material = null) => {
    if (material) {
      setEditingMaterial(material);
      setFormData({
        nombre: material.nombre,
        descripcion: material.descripcion || '',
        tipoCategoria: material.tipoCategoria,
        tipoMaterial: material.tipoMaterial,
        tipoEmpaque: material.tipoEmpaque,
        cantidad: material.cantidad.toString(),
        precio: material.precio.toString(),
        ubicacion: material.ubicacion || '',
        proveedor: material.proveedor || '',
        pesoPorUnidad: material.pesoPorUnidad ? material.pesoPorUnidad.toString() : '',
        medidasDeContenido: material.medidasDeContenido,
      });
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const renderMaterial = ({ item }) => {
    const status = getStatusInfo(item.cantidad, item.pesoPorUnidad);
    const textoContenido = formatarContenido(item.pesoPorUnidad, item.medidasDeContenido);

    return (
      <View style={[styles.materialCard, !item.estado && styles.materialInactive]}>
        <View style={styles.materialHeader}>
          <Image
            style={[styles.materialImage, !item.estado && styles.materialImageInactive]}
            source={item.img ? { uri: `http://localhost:3000/uploads/materiales-pic/${item.img}` } : null}
            defaultSource={null}
          />
          <View style={styles.materialMainInfo}>
            <TouchableOpacity style={styles.materialNameContainer}>
              <Text style={[styles.materialNombre, !item.estado && styles.materialTextInactive]}>{item.nombre}</Text>
              <Text style={styles.materialCode}>CÓDIGO: MAT-{String(item.id).padStart(3, '0')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.materialDetails}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.tipoCategoria}</Text>
            <Text style={styles.materialTypeText}>{item.tipoMaterial}</Text>
          </View>

          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Cantidad:</Text>
            <Text style={styles.quantityText}>
              {renderCantidadAmigable(item.cantidad, item.pesoPorUnidad, item.tipoEmpaque)}
            </Text>
            {textoContenido && (
              <Text style={styles.packageInfo}>(Pres. {textoContenido})</Text>
            )}
          </View>

          <Text style={styles.materialUbicacion}>Ubicación: {item.ubicacion || 'No especificada'}</Text>
          <Text style={styles.materialPrecio}>Valor Unit.: ${Number(item.precio).toLocaleString('es-CO')}</Text>

          <View style={styles.stockContainer}>
            <View style={[styles.stockBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.stockText, { color: status.textColor }]}>{status.text}</Text>
            </View>
          </View>
        </View>

        <View style={styles.materialFooter}>
          <View style={styles.statusContainer}>
            <Text style={styles.statusLabel}>Estado:</Text>
            <Switch
              value={item.estado}
              onValueChange={() => handleToggleEstado(item)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={item.estado ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>

          <View style={styles.materialActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => openModal(item)}
            >
              <Text style={styles.actionButtonText}>Editar</Text>
            </TouchableOpacity>

            {item.estado && item.cantidad <= 10 && (
              <TouchableOpacity style={[styles.actionButton, styles.alertButton]}>
                <Text style={styles.actionButtonText}>⚠️</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Cargando materiales...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Inventario</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Text style={styles.addButtonText}>+ Añadir Producto</Text>
        </TouchableOpacity>
      </View>

      {/* Banner de alerta de stock crítico */}
      {itemsCriticos.length > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Stock Crítico</Text>
            <Text style={styles.alertMessage}>
              Tienes {itemsCriticos.length} material(es) que necesitan reabastecimiento urgente.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.alertButton}
            onPress={() => setFilterEstadoStock(filterEstadoStock === 'Crítico' ? 'Todos' : 'Crítico')}
          >
            <Text style={styles.alertButtonText}>
              {filterEstadoStock === 'Crítico' ? 'Ver Todos' : 'Ver Críticos'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar productos..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        <TouchableOpacity
          style={styles.filtersToggle}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filtersToggleText}>Filtros Avanzados</Text>
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.advancedFilters}>
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Categoría:</Text>
              <Picker
                selectedValue={filterCategoria}
                onValueChange={setFilterCategoria}
                style={styles.picker}
              >
                <Picker.Item label="Todas" value="Todas" />
                {tiposCategoriaUnicos.map(cat => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Ubicación:</Text>
              <Picker
                selectedValue={filterUbicacion}
                onValueChange={setFilterUbicacion}
                style={styles.picker}
              >
                <Picker.Item label="Todas" value="Todas" />
                {ubicacionesUnicas.map(ubi => (
                  <Picker.Item key={ubi} label={ubi} value={ubi} />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Proveedor:</Text>
              <Picker
                selectedValue={filterProveedor}
                onValueChange={setFilterProveedor}
                style={styles.picker}
              >
                <Picker.Item label="Todos" value="Todos" />
                {proveedoresUnicos.map(prov => (
                  <Picker.Item key={prov} label={prov} value={prov} />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Estado de Stock:</Text>
              <Picker
                selectedValue={filterEstadoStock}
                onValueChange={setFilterEstadoStock}
                style={styles.picker}
              >
                <Picker.Item label="Todos" value="Todos" />
                <Picker.Item label="Normal" value="Normal" />
                <Picker.Item label="Stock Bajo" value="Stock Bajo" />
                <Picker.Item label="Crítico" value="Crítico" />
              </Picker>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Estado del Material:</Text>
              <Picker
                selectedValue={filterEstadoMaterial}
                onValueChange={setFilterEstadoMaterial}
                style={styles.picker}
              >
                <Picker.Item label="Todos" value="Todos" />
                <Picker.Item label="Activo" value="Activo" />
                <Picker.Item label="Inactivo" value="Inactivo" />
              </Picker>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={materialesFiltrados}
        renderItem={renderMaterial}
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
            {editingMaterial ? 'Editar Material' : 'Nuevo Material'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Nombre"
            value={formData.nombre}
            onChangeText={(text) => setFormData({...formData, nombre: text})}
          />

          <TextInput
            style={styles.input}
            placeholder="Descripción"
            value={formData.descripcion}
            onChangeText={(text) => setFormData({...formData, descripcion: text})}
            multiline
            numberOfLines={2}
          />

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Tipo de categoría:</Text>
            <Picker
              selectedValue={formData.tipoCategoria}
              onValueChange={(value) => setFormData({...formData, tipoCategoria: value})}
              style={styles.picker}
            >
              <Picker.Item label="Herramienta" value="Herramienta" />
              <Picker.Item label="Químico" value="Químico" />
              <Picker.Item label="Semilla" value="Semilla" />
              <Picker.Item label="Fertilizante" value="Fertilizante" />
            </Picker>
          </View>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Tipo de material:</Text>
            <Picker
              selectedValue={formData.tipoMaterial}
              onValueChange={(value) => setFormData({...formData, tipoMaterial: value})}
              style={styles.picker}
            >
              <Picker.Item label="Manual" value="Manual" />
              <Picker.Item label="Eléctrico" value="Eléctrico" />
              <Picker.Item label="Consumible" value="Consumible" />
            </Picker>
          </View>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Tipo de empaque:</Text>
            <Picker
              selectedValue={formData.tipoEmpaque}
              onValueChange={(value) => setFormData({...formData, tipoEmpaque: value})}
              style={styles.picker}
            >
              <Picker.Item label="Unidad" value="Unidad" />
              <Picker.Item label="Paquete" value="Paquete" />
              <Picker.Item label="Caja" value="Caja" />
              <Picker.Item label="Bulto" value="Bulto" />
            </Picker>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Cantidad"
            value={formData.cantidad}
            onChangeText={(text) => setFormData({...formData, cantidad: text})}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Precio"
            value={formData.precio}
            onChangeText={(text) => setFormData({...formData, precio: text})}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Ubicación"
            value={formData.ubicacion}
            onChangeText={(text) => setFormData({...formData, ubicacion: text})}
          />

          <TextInput
            style={styles.input}
            placeholder="Proveedor"
            value={formData.proveedor}
            onChangeText={(text) => setFormData({...formData, proveedor: text})}
          />

          <TextInput
            style={styles.input}
            placeholder="Peso por unidad (opcional)"
            value={formData.pesoPorUnidad}
            onChangeText={(text) => setFormData({...formData, pesoPorUnidad: text})}
            keyboardType="numeric"
          />

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Medidas de contenido:</Text>
            <Picker
              selectedValue={formData.medidasDeContenido}
              onValueChange={(value) => setFormData({...formData, medidasDeContenido: value})}
              style={styles.picker}
            >
              <Picker.Item label="Kilogramo" value="Kilogramo" />
              <Picker.Item label="Gramo" value="Gramo" />
              <Picker.Item label="Litro" value="Litro" />
              <Picker.Item label="Mililitro" value="Mililitro" />
            </Picker>
          </View>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee',
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
    padding: 15,
    marginBottom: 20,
    borderRadius: 8,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 5,
  },
  alertMessage: {
    fontSize: 14,
    color: '#dc3545',
  },
  alertButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filtersContainer: {
    marginBottom: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  filtersToggle: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  filtersToggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  advancedFilters: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickerContainer: {
    marginBottom: 15,
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
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  materialCard: {
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
  materialInactive: {
    backgroundColor: '#f8f9fa',
    opacity: 0.7,
  },
  materialHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  materialImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 15,
  },
  materialImageInactive: {
    opacity: 0.5,
  },
  materialMainInfo: {
    flex: 1,
  },
  materialNameContainer: {
    marginBottom: 5,
  },
  materialNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  materialTextInactive: {
    color: '#999',
  },
  materialCode: {
    fontSize: 12,
    color: '#666',
  },
  materialDetails: {
    marginBottom: 10,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    textAlign: 'center',
  },
  materialTypeText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  quantityContainer: {
    marginBottom: 5,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  quantityText: {
    fontSize: 16,
    color: '#333',
    marginTop: 2,
  },
  packageInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  materialUbicacion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  materialPrecio: {
    fontSize: 14,
    color: '#666',
  },
  stockContainer: {
    marginTop: 10,
  },
  stockBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  stockText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  materialFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
    color: '#333',
  },
  materialActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    borderRadius: 5,
    marginHorizontal: 2,
    alignItems: 'center',
    minWidth: 60,
  },
  editButton: {
    backgroundColor: '#007bff',
  },
  alertButton: {
    backgroundColor: '#ffc107',
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
});

export default MaterialesScreen;