import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { getFichas, createFicha, updateFicha, deleteFicha } from '../config/api';
import { Ionicons } from '@expo/vector-icons';

const GestionFichasScreen = () => {
  const [fichas, setFichas] = useState([]);
  const [filteredFichas, setFilteredFichas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFicha, setEditingFicha] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [fichaToDelete, setFichaToDelete] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    id_ficha: '',
  });

  useEffect(() => {
    loadFichas();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [fichas, searchTerm]);

  const loadFichas = async () => {
    try {
      setLoading(true);
      const response = await getFichas();
      const fichasData = response.data || response;

      // Add user count to each ficha
      const fichasWithCounts = fichasData.map(ficha => ({
        ...ficha,
        usuariosCount: ficha.usuarios?.length || 0,
      }));

      setFichas(fichasWithCounts);
      setFilteredFichas(fichasWithCounts);
    } catch (error) {
      console.error('Error loading fichas:', error);
      Alert.alert('Error', 'No se pudieron cargar las fichas');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...fichas];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ficha =>
        ficha.nombre.toLowerCase().includes(term) ||
        ficha.id_ficha.toLowerCase().includes(term)
      );
    }

    setFilteredFichas(filtered);
  };

  const handleCreate = () => {
    setEditingFicha(null);
    setFormData({
      nombre: '',
      id_ficha: '',
    });
    setModalVisible(true);
  };

  const handleEdit = (ficha) => {
    setEditingFicha(ficha);
    setFormData({
      nombre: ficha.nombre,
      id_ficha: ficha.id_ficha,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim() || !formData.id_ficha.trim()) {
      Alert.alert('Error', 'Nombre y código de ficha son obligatorios');
      return;
    }

    try {
      if (editingFicha) {
        await updateFicha(editingFicha.id, formData);
        Alert.alert('Éxito', 'Ficha actualizada correctamente');
      } else {
        await createFicha(formData);
        Alert.alert('Éxito', 'Ficha creada correctamente');
      }

      setModalVisible(false);
      loadFichas();
    } catch (error) {
      console.error('Error saving ficha:', error);
      Alert.alert('Error', 'No se pudo guardar la ficha');
    }
  };

  const handleDeletePress = (ficha) => {
    setFichaToDelete(ficha);
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fichaToDelete) return;

    try {
      await deleteFicha(fichaToDelete.id);
      Alert.alert('Éxito', 'Ficha eliminada correctamente');
      setDeleteModalVisible(false);
      setFichaToDelete(null);
      loadFichas();
    } catch (error) {
      console.error('Error deleting ficha:', error);
      Alert.alert('Error', 'No se pudo eliminar la ficha');
      setDeleteModalVisible(false);
      setFichaToDelete(null);
    }
  };

  const renderFichaItem = ({ item }) => (
    <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <Ionicons name="document-text" size={16} color="#10B981" />
            </View>
            <Text className="text-lg font-semibold text-gray-800">{item.nombre}</Text>
          </View>
        </View>
      </View>

      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <Text className="text-sm font-medium text-gray-600 mr-2">Código:</Text>
            <View className="bg-blue-100 px-2 py-1 rounded">
              <Text className="text-sm font-medium text-blue-800">{item.id_ficha}</Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <Ionicons name="people" size={14} color="#666" />
            <Text className="text-sm text-gray-600 ml-2">
              {item.usuariosCount || 0} usuario{(item.usuariosCount !== 1) ? 's' : ''}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            className="bg-blue-500 px-3 py-2 rounded-lg"
          >
            <Ionicons name="pencil" size={16} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleDeletePress(item)}
            className="bg-red-500 px-3 py-2 rounded-lg"
          >
            <Ionicons name="trash" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text className="mt-2 text-gray-600">Cargando fichas...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 shadow-sm">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-gray-800">Gestión de Fichas</Text>
          <TouchableOpacity
            onPress={handleCreate}
            className="bg-green-500 px-4 py-2 rounded-lg flex-row items-center"
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-medium ml-2">Nueva Ficha</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TextInput
          placeholder="Buscar por nombre o código de ficha..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
        />
      </View>

      {/* Ficha List */}
      <FlatList
        data={filteredFichas}
        renderItem={renderFichaItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-8">
            <Text className="text-gray-500 text-center">No se encontraron fichas</Text>
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black bg-opacity-50">
          <View className="bg-white rounded-t-3xl p-6 max-h-3/5">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-800">
                {editingFicha ? 'Editar Ficha' : 'Nueva Ficha'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="space-y-4">
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Nombre de la Ficha</Text>
                  <TextInput
                    placeholder="Nombre completo de la ficha"
                    value={formData.nombre}
                    onChangeText={(value) => setFormData({...formData, nombre: value})}
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Código de Ficha</Text>
                  <TextInput
                    placeholder="Código único de la ficha"
                    value={formData.id_ficha}
                    onChangeText={(value) => setFormData({...formData, id_ficha: value})}
                    autoCapitalize="characters"
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  />
                </View>
              </View>

              <View className="flex-row gap-3 mt-6">
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="flex-1 bg-gray-300 px-4 py-3 rounded-lg"
                >
                  <Text className="text-gray-700 font-medium text-center">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  className="flex-1 bg-green-500 px-4 py-3 rounded-lg"
                >
                  <Text className="text-white font-medium text-center">
                    {editingFicha ? 'Actualizar' : 'Crear'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full">
            <View className="items-center mb-4">
              <View className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Ionicons name="warning" size={24} color="#EF4444" />
              </View>
              <Text className="text-lg font-bold text-gray-800 text-center">¿Eliminar ficha?</Text>
            </View>

            {fichaToDelete && (
              <View className="bg-gray-50 rounded-lg p-3 mb-6">
                <Text className="font-medium text-gray-900 text-center">{fichaToDelete.nombre}</Text>
                <Text className="text-xs text-gray-500 text-center mt-1">Código: {fichaToDelete.id_ficha}</Text>
              </View>
            )}

            <Text className="text-sm text-gray-600 text-center mb-6">
              Esta acción no se puede deshacer.
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                className="flex-1 bg-gray-300 px-4 py-3 rounded-lg"
              >
                <Text className="text-gray-700 font-medium text-center">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteConfirm}
                className="flex-1 bg-red-500 px-4 py-3 rounded-lg"
              >
                <Text className="text-white font-medium text-center">Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default GestionFichasScreen;