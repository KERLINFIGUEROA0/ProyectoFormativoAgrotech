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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from '../config/api';

const MovimientosScreen = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (selectedMaterial) {
      cargarMovimientosPorMaterial();
    } else {
      cargarMovimientos();
    }
  }, [selectedMaterial]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [movimientosResponse, materialesResponse] = await Promise.all([
        api.get('/inventario/movimientos/historial'),
        api.get('/materiales')
      ]);

      if (movimientosResponse.data.success) {
        setMovimientos(movimientosResponse.data.data);
      }
      if (materialesResponse.data.success) {
        setMateriales(materialesResponse.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const cargarMovimientos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inventario/movimientos/historial');
      if (response.data.success) {
        setMovimientos(response.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  };

  const cargarMovimientosPorMaterial = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/inventario/movimientos/historial/${selectedMaterial}`);
      if (response.data.success) {
        setMovimientos(response.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Error al cargar los movimientos');
    } finally {
      setLoading(false);
    }
  };

  const movimientosFiltrados = movimientos
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)) // Ordenar por fecha descendente
    .filter(movimiento => {
      const matchesSearch = searchTerm === '' ||
        movimiento.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movimiento.material?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movimiento.usuario?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTipo = selectedTipo === '' || movimiento.tipo === selectedTipo;

      return matchesSearch && matchesTipo;
    });

  const getTipoIcon = (tipo) => {
    return tipo === 'egreso' ? '📤' : '📥';
  };

  const getTipoLabel = (tipo) => {
    return tipo === 'egreso' ? 'Salida' : 'Entrada';
  };

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMovimiento = ({ item }) => {
    return (
      <View style={styles.movimientoCard}>
        <View style={styles.movimientoHeader}>
          <Text style={styles.tipoIcon}>{getTipoIcon(item.tipo)}</Text>
          <View style={styles.movimientoInfo}>
            <Text style={styles.materialNombre}>
              {item.material?.nombre || 'N/A'}
            </Text>
            <Text style={styles.tipoLabel}>
              {getTipoLabel(item.tipo)}
            </Text>
          </View>
        </View>

        <View style={styles.movimientoDetails}>
          <Text style={styles.cantidad}>
            Cantidad: {item.cantidad}
          </Text>
          <Text style={styles.descripcion}>
            {item.descripcion || 'Sin descripción'}
          </Text>
          <Text style={styles.usuario}>
            Usuario: {item.usuario ? `${item.usuario.nombre} ${item.usuario.apellidos}` : 'Sistema'}
          </Text>
          <Text style={styles.fecha}>
            Fecha: {formatFecha(item.fecha)}
          </Text>
          {item.referencia && (
            <Text style={styles.referencia}>
              Referencia: {item.referencia}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text>Cargando movimientos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Movimientos de Inventario</Text>

      {/* Estadísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📥</Text>
          <Text style={styles.statNumber}>
            {[...new Set(movimientos.filter(m => m.tipo === 'ingreso').map(m => m.material?.id).filter(id => id))].length}
          </Text>
          <Text style={styles.statLabel}>Productos con Entrada</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📤</Text>
          <Text style={styles.statNumber}>
            {[...new Set(movimientos.filter(m => m.tipo === 'egreso').map(m => m.material?.id).filter(id => id))].length}
          </Text>
          <Text style={styles.statLabel}>Productos con Salida</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📊</Text>
          <Text style={styles.statNumber}>
            {movimientos.length}
          </Text>
          <Text style={styles.statLabel}>Total Movimientos</Text>
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por descripción, material o usuario..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Tipo:</Text>
          <Picker
            selectedValue={selectedTipo}
            onValueChange={setSelectedTipo}
            style={styles.picker}
          >
            <Picker.Item label="Todos los tipos" value="" />
            <Picker.Item label="Entrada" value="ingreso" />
            <Picker.Item label="Salida" value="egreso" />
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Material:</Text>
          <Picker
            selectedValue={selectedMaterial}
            onValueChange={setSelectedMaterial}
            style={styles.picker}
          >
            <Picker.Item label="Todos los materiales" value="" />
            {materiales.map((material) => (
              <Picker.Item key={material.id} label={material.nombre} value={material.id.toString()} />
            ))}
          </Picker>
        </View>
      </View>

      <FlatList
        data={movimientosFiltrados}
        renderItem={renderMovimiento}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No se encontraron movimientos</Text>
        }
      />
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
  list: {
    flex: 1,
  },
  movimientoCard: {
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
  movimientoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipoIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  movimientoInfo: {
    flex: 1,
  },
  materialNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tipoLabel: {
    fontSize: 14,
    color: '#666',
  },
  movimientoDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  cantidad: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 5,
  },
  descripcion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  usuario: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  fecha: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  referencia: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 50,
  },
});

export default MovimientosScreen;