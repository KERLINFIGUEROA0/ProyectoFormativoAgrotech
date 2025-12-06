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
  Image,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useNavigation } from '@react-navigation/native';
import { getCultivos, createCultivo, updateCultivo, deleteCultivo, getTiposCultivo, getLotes, exportarExcelCultivo, exportarExcelGeneral, generarPdfTrazabilidad, finalizarCultivo, registrarCosecha, getSublotesPorLote } from '../config/api';
import { downloadAndShareFile } from '../utils/downloadUtils';

const CultivoScreen = () => {
  const navigation = useNavigation();
  const [cultivos, setCultivos] = useState([]);
  const [filteredCultivos, setFilteredCultivos] = useState([]);
  const [tiposCultivo, setTiposCultivo] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [allSublotes, setAllSublotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para tabs
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'lista', title: 'Lista' },
    { key: 'mapa', title: 'Mapa' },
  ]);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [subloteEstadoFilter, setSubloteEstadoFilter] = useState('todos');

  // Estados para modales
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCultivo, setEditingCultivo] = useState(null);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [showCosechaModal, setShowCosechaModal] = useState(false);
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);
  const [cultivoAFinalizar, setCultivoAFinalizar] = useState(null);
  const [cultivoCosecha, setCultivoCosecha] = useState(null);
  const [selectedCultivoUbicacion, setSelectedCultivoUbicacion] = useState(null);

  // Estados para formularios
  const [formData, setFormData] = useState({
    nombre: '',
    cantidad: '',
    descripcion: '',
    tipoCultivoId: '',
    loteId: '',
    Estado: 'Activo',
    Fecha_Plantado: '',
  });

  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [fechaCosecha, setFechaCosecha] = useState(new Date().toISOString().split('T')[0]);
  const [cantidadCosecha, setCantidadCosecha] = useState('');
  const [esCosechaFinal, setEsCosechaFinal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Filtrado
  useEffect(() => {
    let filtered = cultivos;

    if (searchTerm) {
      filtered = filtered.filter(cultivo =>
        (cultivo.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cultivo.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cultivo.tipoCultivo?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (estadoFilter !== 'todos') {
      filtered = filtered.filter(cultivo => cultivo.Estado === estadoFilter);
    }

    // Filtrar por estado de sublotes
    if (subloteEstadoFilter !== 'todos') {
      filtered = filtered.filter(cultivo => {
        // Buscar si el cultivo tiene sublotes con el estado filtrado
        const sublotesDelCultivo = allSublotes.filter(s => s.cultivo?.id === cultivo.id);
        return sublotesDelCultivo.some(s => s.estado === subloteEstadoFilter);
      });
    }

    setFilteredCultivos(filtered);
  }, [cultivos, searchTerm, estadoFilter, subloteEstadoFilter, allSublotes]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cultivosRes, tiposRes, lotesRes] = await Promise.all([
        getCultivos(),
        getTiposCultivo(),
        getLotes(),
      ]);
      setCultivos(cultivosRes.data || []);
      setTiposCultivo(tiposRes.data || []);
      setLotes(lotesRes.data || []);

      // Obtener todos los sublotes de todos los lotes
      const fetchedLotes = lotesRes.data || [];
      const allSublotesPromises = fetchedLotes.map(async (lote) => {
        try {
          const sublotesRes = await getSublotesPorLote(lote.id);
          return sublotesRes.data?.data || [];
        } catch (error) {
          console.error(`Error obteniendo sublotes del lote ${lote.id}:`, error);
          return [];
        }
      });

      const allSublotesArrays = await Promise.all(allSublotesPromises);
      const flattenedSublotes = allSublotesArrays.flat();
      setAllSublotes(flattenedSublotes);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Estadísticas
  const stats = {
    total: cultivos.length,
    activos: cultivos.filter(c => c.Estado === 'Activo').length,
    tipos: new Set(cultivos.map(c => c.tipoCultivo?.id)).size,
    totalPlantas: cultivos.reduce((sum, c) => sum + (c.cantidad || 0), 0)
  };

  // Función para mapear estados
  const getEstadoDisplay = (estado) => {
    switch (estado) {
      case 'Activo':
        return 'En crecimiento';
      case 'En Cosecha':
        return 'En cosecha';
      case 'Finalizado':
        return 'Finalizado';
      default:
        return estado;
    }
  };

  // Funciones para finalizar cultivo
  const handleClickFinalizar = (cultivo) => {
    setCultivoAFinalizar(cultivo);
    setFechaFin(new Date().toISOString().split('T')[0]);
    setShowFinalizarModal(true);
  };

  const handleConfirmarFinalizar = async () => {
    if (!cultivoAFinalizar) return;

    try {
      await finalizarCultivo(cultivoAFinalizar.id, fechaFin);
      Alert.alert('Éxito', `Cultivo "${cultivoAFinalizar.nombre}" finalizado correctamente. Los terrenos han sido liberados.`);
      setShowFinalizarModal(false);
      setCultivoAFinalizar(null);
      await loadData();
    } catch (error) {
      console.error('Error al finalizar cultivo:', error);
      Alert.alert('Error', error.response?.data?.message || "Error al finalizar el cultivo.");
    }
  };

  // Funciones para registrar cosecha
  const handleClickCosecha = (cultivo) => {
    setCultivoCosecha(cultivo);
    setFechaCosecha(new Date().toISOString().split('T')[0]);
    setCantidadCosecha('');
    setEsCosechaFinal(false);
    setShowCosechaModal(true);
  };

  const handleConfirmarCosecha = async () => {
    if (!cultivoCosecha) return;

    const cantidad = parseFloat(cantidadCosecha);
    if (isNaN(cantidad) || cantidad < 0) {
      Alert.alert('Error', "La cantidad debe ser un número válido mayor o igual a cero.");
      return;
    }

    try {
      await registrarCosecha(cultivoCosecha.id, fechaCosecha, cantidad, esCosechaFinal);
      Alert.alert('Éxito',
        esCosechaFinal
          ? `Cosecha final registrada. Cultivo terminado y terrenos liberados.`
          : `Cosecha parcial registrada. El cultivo continúa activo.`
      );
      setShowCosechaModal(false);
      setCultivoCosecha(null);
      await loadData();
    } catch (error) {
      console.error('Error al registrar cosecha:', error);
      Alert.alert('Error', error.response?.data?.message || "Error al registrar la cosecha.");
    }
  };

  const handleSubmit = async () => {
    try {
      const cultivoData = {
        ...formData,
        cantidad: parseInt(formData.cantidad),
        tipoCultivoId: parseInt(formData.tipoCultivoId),
        loteId: parseInt(formData.loteId),
      };

      if (editingCultivo) {
        await updateCultivo(editingCultivo.id, cultivoData);
        Alert.alert('Éxito', 'Cultivo actualizado correctamente');
      } else {
        await createCultivo(cultivoData);
        Alert.alert('Éxito', 'Cultivo creado correctamente');
      }
      setModalVisible(false);
      resetForm();
      loadData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Error al guardar cultivo');
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este cultivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCultivo(id);
              Alert.alert('Éxito', 'Cultivo eliminado correctamente');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el cultivo');
            }
          },
        },
      ]
    );
  };

  const handleDescargarExcelCultivo = async (cultivo) => {
    try {
      Alert.alert('Descargando...', 'Generando reporte Excel...');
      const blob = await exportarExcelCultivo(cultivo.id);
      const filename = `cultivo-${cultivo.id}-reporte.xlsx`;
      await downloadAndShareFile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      Alert.alert('Éxito', 'Reporte Excel descargado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo descargar el reporte Excel');
      console.error(error);
    }
  };

  const handleDescargarExcelGeneral = async () => {
    try {
      Alert.alert('Descargando...', 'Generando reporte Excel general...');
      const blob = await exportarExcelGeneral();
      const filename = `cultivos-reporte-general.xlsx`;
      await downloadAndShareFile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      Alert.alert('Éxito', 'Reporte Excel general descargado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo descargar el reporte Excel general');
      console.error(error);
    }
  };

  const handleDescargarPdfTrazabilidad = async (cultivo) => {
    try {
      Alert.alert('Descargando...', 'Generando PDF de trazabilidad...');
      const blob = await generarPdfTrazabilidad(cultivo.id);
      const filename = `cultivo-${cultivo.id}-trazabilidad.pdf`;
      await downloadAndShareFile(blob, filename, 'application/pdf');
      Alert.alert('Éxito', 'PDF de trazabilidad descargado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo descargar el PDF de trazabilidad');
      console.error(error);
    }
  };

  // Handler para abrir el modal de ubicación
  const handleVerUbicacion = (cultivo) => {
    setSelectedCultivoUbicacion(cultivo);
    setShowUbicacionModal(true);
  };

  const openModal = (cultivo = null) => {
    if (cultivo) {
      setEditingCultivo(cultivo);
      setFormData({
        nombre: cultivo.nombre || '',
        cantidad: cultivo.cantidad?.toString() || '',
        descripcion: cultivo.descripcion || '',
        tipoCultivoId: cultivo.tipoCultivo?.id?.toString() || '',
        loteId: cultivo.lote?.id?.toString() || '',
        Estado: cultivo.Estado || 'Activo',
        Fecha_Plantado: cultivo.Fecha_Plantado || '',
      });
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingCultivo(null);
    setFormData({
      nombre: '',
      cantidad: '',
      descripcion: '',
      tipoCultivoId: '',
      loteId: '',
      Estado: 'Activo',
      Fecha_Plantado: '',
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

  // Vista de Lista
  const ListaScene = () => (
    <View style={styles.scene}>
      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cultivo..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <Picker
          selectedValue={estadoFilter}
          onValueChange={(value) => setEstadoFilter(value)}
          style={styles.filterPicker}
        >
          <Picker.Item label="Todos los estados" value="todos" />
          <Picker.Item label="En crecimiento" value="Activo" />
          <Picker.Item label="En cosecha" value="En Cosecha" />
          <Picker.Item label="Finalizados" value="Finalizado" />
        </Picker>
        <Picker
          selectedValue={subloteEstadoFilter}
          onValueChange={(value) => setSubloteEstadoFilter(value)}
          style={styles.filterPicker}
        >
          <Picker.Item label="Todos los sublotes" value="todos" />
          <Picker.Item label="Disponible" value="Disponible" />
          <Picker.Item label="En cultivación" value="En cultivación" />
          <Picker.Item label="En mantenimiento" value="En mantenimiento" />
        </Picker>
      </View>

      {/* Lista de cultivos */}
      {filteredCultivos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No se encontraron cultivos</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCultivos}
          renderItem={renderCultivoCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );

  // Vista de Mapa (placeholder por ahora)
  const MapaScene = () => (
    <View style={styles.scene}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>Vista de mapa próximamente</Text>
        <Text style={styles.mapPlaceholderSubtext}>Aquí se mostrará el mapa con los cultivos</Text>
      </View>
    </View>
  );

  // Render de tarjeta de cultivo
  const renderCultivoCard = ({ item }) => (
    <View style={styles.cultivoCard}>
      {/* Imagen */}
      <View style={styles.cultivoImageContainer}>
        {item.img ? (
          <Image
            source={{ uri: `http://localhost:3000/uploads/${item.img}` }}
            style={styles.cultivoImage}
          />
        ) : (
          <View style={styles.cultivoImagePlaceholder}>
            <Text style={styles.cultivoImagePlaceholderText}>🌱</Text>
          </View>
        )}
        <View style={[styles.statusBadge, getStatusBadgeStyle(item.Estado)]}>
          <Text style={styles.statusBadgeText}>{getEstadoDisplay(item.Estado)}</Text>
        </View>
      </View>

      {/* Contenido */}
      <View style={styles.cultivoContent}>
        <Text style={styles.cultivoName}>{item.nombre}</Text>
        <Text style={styles.cultivoType}>{item.tipoCultivo?.nombre}</Text>

        <View style={styles.cultivoDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Plantas:</Text>
            <Text style={styles.detailValue}>{item.cantidad}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Sembrado:</Text>
            <Text style={styles.detailValue}>
              {new Date(item.Fecha_Plantado).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>
      </View>

      {/* Acciones */}
      <View style={styles.cultivoActions}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => navigation.navigate('Producciones', { cultivoId: item.id })}
          >
            <Text style={styles.actionButtonText}>Producción</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => handleDescargarPdfTrazabilidad(item)}
          >
            <Text style={styles.actionButtonText}>Trazabilidad</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.smallActionButton, styles.excelButton]}
            onPress={() => handleDescargarExcelCultivo(item)}
          >
            <Text style={styles.smallActionText}>Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallActionButton, styles.pdfButton]}
            onPress={() => handleDescargarPdfTrazabilidad(item)}
          >
            <Text style={styles.smallActionText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallActionButton, styles.locationButton]}
            onPress={() => handleVerUbicacion(item)}
          >
            <Text style={styles.smallActionText}>Ubicación</Text>
          </TouchableOpacity>
          {item.Estado !== 'Finalizado' && (
            <TouchableOpacity
              style={[styles.smallActionButton, styles.finalizarButton]}
              onPress={() => handleClickFinalizar(item)}
            >
              <Text style={styles.smallActionText}>Finalizar</Text>
            </TouchableOpacity>
          )}
          {item.Estado !== 'Finalizado' && (
            <TouchableOpacity
              style={[styles.smallActionButton, styles.cosechaButton]}
              onPress={() => handleClickCosecha(item)}
            >
              <Text style={styles.smallActionText}>Cosecha</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.smallActionButton, styles.editButton]}
            onPress={() => openModal(item)}
          >
            <Text style={styles.smallActionText}>Editar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const getStatusBadgeStyle = (estado) => {
    switch (estado) {
      case 'Activo':
        return styles.statusSuccess;
      case 'En Cosecha':
        return styles.statusWarning;
      case 'Finalizado':
        return styles.statusDefault;
      default:
        return styles.statusPrimary;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con título y botones */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Gestión de Cultivos</Text>
          <Text style={styles.subtitle}>Administra tu producción agrícola</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openModal()}
          >
            <Text style={styles.addButtonText}>Nuevo Cultivo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={handleDescargarExcelGeneral}
          >
            <Text style={styles.reportButtonText}>Reporte General</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Estadísticas */}
      <View style={styles.statsContainer}>
        <CompactStat icon="🌱" title="Total Cultivos" value={stats.total} color="success" />
        <CompactStat icon="✅" title="En crecimiento" value={stats.activos} color="primary" />
        <CompactStat icon="🌿" title="Variedades" value={stats.tipos} color="warning" />
        <CompactStat icon="⏰" title="Total Plantas" value={stats.totalPlantas.toLocaleString('es-CO')} color="danger" />
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

      {/* Modal de Formulario */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCultivo ? 'Editar Cultivo' : 'Nuevo Cultivo'}
            </Text>

            <ScrollView style={styles.formScroll}>
              <TextInput
                style={styles.input}
                placeholder="Nombre del cultivo"
                value={formData.nombre}
                onChangeText={(value) => setFormData({...formData, nombre: value})}
              />

              <TextInput
                style={styles.input}
                placeholder="Cantidad de plantas"
                value={formData.cantidad}
                onChangeText={(value) => setFormData({...formData, cantidad: value})}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="Descripción"
                value={formData.descripcion}
                onChangeText={(value) => setFormData({...formData, descripcion: value})}
                multiline
                numberOfLines={3}
              />

              <Picker
                selectedValue={formData.tipoCultivoId}
                onValueChange={(value) => setFormData({...formData, tipoCultivoId: value})}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar Tipo de Cultivo" value="" />
                {tiposCultivo.map((tipo) => (
                  <Picker.Item key={tipo.id} label={tipo.nombre} value={tipo.id.toString()} />
                ))}
              </Picker>

              <Picker
                selectedValue={formData.loteId}
                onValueChange={(value) => setFormData({...formData, loteId: value})}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar Lote" value="" />
                {lotes.map((lote) => (
                  <Picker.Item key={lote.id} label={lote.nombre} value={lote.id.toString()} />
                ))}
              </Picker>

              <Picker
                selectedValue={formData.Estado}
                onValueChange={(value) => setFormData({...formData, Estado: value})}
                style={styles.picker}
              >
                <Picker.Item label="Activo" value="Activo" />
                <Picker.Item label="En Cosecha" value="En Cosecha" />
              </Picker>

              <TextInput
                style={styles.input}
                placeholder="Fecha Plantado (YYYY-MM-DD)"
                value={formData.Fecha_Plantado}
                onChangeText={(value) => setFormData({...formData, Fecha_Plantado: value})}
              />
            </ScrollView>

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
                  {editingCultivo ? 'Actualizar' : 'Crear'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Finalizar Cultivo */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFinalizarModal}
        onRequestClose={() => setShowFinalizarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Finalizar Cultivo</Text>
            <Text style={styles.modalSubtitle}>Cosecha terminada - Liberar terrenos</Text>

            <Text style={styles.modalText}>
              Vas a finalizar el cultivo "{cultivoAFinalizar?.nombre}".
              Esto liberará automáticamente los lotes asociados para que puedan ser reutilizados.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Fecha de Finalización"
              value={fechaFin}
              onChangeText={setFechaFin}
            />

            <Text style={styles.modalNote}>
              Los terrenos quedarán disponibles para nuevos cultivos después de la finalización.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowFinalizarModal(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.successButton]}
                onPress={handleConfirmarFinalizar}
              >
                <Text style={styles.buttonText}>Confirmar y Liberar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Registrar Cosecha */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCosechaModal}
        onRequestClose={() => setShowCosechaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registrar Cosecha</Text>
            <Text style={styles.modalSubtitle}>Cultivo: {cultivoCosecha?.nombre}</Text>

            <TextInput
              style={styles.input}
              placeholder="Fecha de Cosecha"
              value={fechaCosecha}
              onChangeText={setFechaCosecha}
            />

            <TextInput
              style={styles.input}
              placeholder="Cantidad Cosechada"
              value={cantidadCosecha}
              onChangeText={setCantidadCosecha}
              keyboardType="numeric"
            />

            <View style={styles.finalCheckContainer}>
              <Text style={styles.finalCheckTitle}>¿Finalizar ciclo del cultivo?</Text>
              <Text style={styles.finalCheckText}>
                {esCosechaFinal
                  ? "⚠️ El cultivo se cerrará y los terrenos quedarán libres"
                  : "El cultivo continuará activo en el lote"
                }
              </Text>
              <TouchableOpacity
                style={[styles.switch, esCosechaFinal && styles.switchActive]}
                onPress={() => setEsCosechaFinal(!esCosechaFinal)}
              >
                <View style={[styles.switchKnob, esCosechaFinal && styles.switchKnobActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowCosechaModal(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.successButton]}
                onPress={handleConfirmarCosecha}
              >
                <Text style={styles.buttonText}>Registrar Cosecha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Ubicación de Cultivo */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showUbicacionModal}
        onRequestClose={() => setShowUbicacionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ubicación del Cultivo</Text>
            <Text style={styles.modalSubtitle}>
              {selectedCultivoUbicacion?.nombre}
            </Text>

            <Text style={styles.modalText}>
              Esta funcionalidad mostrará el mapa con la ubicación exacta del cultivo.
              Actualmente en desarrollo.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowUbicacionModal(false)}
              >
                <Text style={styles.buttonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCultivo ? 'Editar Cultivo' : 'Crear Cultivo'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre del cultivo"
              value={formData.nombre}
              onChangeText={(value) => setFormData({...formData, nombre: value})}
            />

            <TextInput
              style={styles.input}
              placeholder="Cantidad"
              value={formData.cantidad}
              onChangeText={(value) => setFormData({...formData, cantidad: value})}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Descripción"
              value={formData.descripcion}
              onChangeText={(value) => setFormData({...formData, descripcion: value})}
              multiline
            />

            <Picker
              selectedValue={formData.tipoCultivoId}
              onValueChange={(value) => setFormData({...formData, tipoCultivoId: value})}
              style={styles.picker}
            >
              <Picker.Item label="Seleccionar Tipo de Cultivo" value="" />
              {tiposCultivo.map((tipo) => (
                <Picker.Item key={tipo.id} label={tipo.nombre} value={tipo.id.toString()} />
              ))}
            </Picker>

            <Picker
              selectedValue={formData.loteId}
              onValueChange={(value) => setFormData({...formData, loteId: value})}
              style={styles.picker}
            >
              <Picker.Item label="Seleccionar Lote" value="" />
              {lotes.map((lote) => (
                <Picker.Item key={lote.id} label={lote.nombre} value={lote.id.toString()} />
              ))}
            </Picker>

            <Picker
              selectedValue={formData.Estado}
              onValueChange={(value) => setFormData({...formData, Estado: value})}
              style={styles.picker}
            >
              <Picker.Item label="Activo" value="Activo" />
              <Picker.Item label="Inactivo" value="Inactivo" />
              <Picker.Item label="Finalizado" value="Finalizado" />
            </Picker>

            <TextInput
              style={styles.input}
              placeholder="Fecha Plantado (YYYY-MM-DD)"
              value={formData.Fecha_Plantado}
              onChangeText={(value) => setFormData({...formData, Fecha_Plantado: value})}
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
                  {editingCultivo ? 'Actualizar' : 'Crear'}
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
    marginRight: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reportButton: {
    backgroundColor: '#059669',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  reportButtonText: {
    color: 'white',
    fontSize: 12,
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
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  filterPicker: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
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
  cultivoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cultivoImageContainer: {
    height: 120,
    position: 'relative',
  },
  cultivoImage: {
    width: '100%',
    height: '100%',
  },
  cultivoImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  cultivoImagePlaceholderText: {
    fontSize: 32,
    color: '#9ca3af',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
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
  statusDefault: {
    backgroundColor: '#f3f4f6',
  },
  statusPrimary: {
    backgroundColor: '#dbeafe',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cultivoContent: {
    padding: 16,
  },
  cultivoName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  cultivoType: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  cultivoDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  cultivoActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: '#10b981',
  },
  secondaryButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  smallActionButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 2,
    minWidth: 60,
  },
  excelButton: {
    backgroundColor: '#16a34a',
  },
  pdfButton: {
    backgroundColor: '#dc2626',
  },
  finalizarButton: {
    backgroundColor: '#f59e0b',
  },
  cosechaButton: {
    backgroundColor: '#10b981',
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  locationButton: {
    backgroundColor: '#8b5cf6',
  },
  smallActionText: {
    color: 'white',
    fontSize: 10,
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
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  formScroll: {
    maxHeight: 400,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalNote: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  finalCheckContainer: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  finalCheckTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  finalCheckText: {
    fontSize: 12,
    color: '#78350f',
    marginBottom: 12,
  },
  switch: {
    width: 50,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  switchActive: {
    backgroundColor: '#f59e0b',
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    marginLeft: 2,
  },
  switchKnobActive: {
    marginLeft: 28,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  successButton: {
    backgroundColor: '#059669',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CultivoScreen;