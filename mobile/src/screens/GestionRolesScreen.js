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
import { getRoles, createRole, updateRole, deleteRole, getUsuarios } from '../config/api';
import { Ionicons } from '@expo/vector-icons';

const GestionRolesScreen = () => {
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  });

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [roles, searchTerm]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const [rolesRes, usuariosRes] = await Promise.all([
        getRoles(),
        getUsuarios(),
      ]);

      // Add user count to each role
      const rolesWithCounts = (rolesRes || []).map(role => {
        const usersInRole = usuariosRes.data?.filter(user => user.tipoUsuario?.id === role.id) || [];
        return {
          ...role,
          usuariosAsignados: usersInRole.length,
        };
      });

      // Filter out admin role
      const filteredRoles = rolesWithCounts.filter(role => role.nombre.toLowerCase() !== 'admin');

      setRoles(filteredRoles);
      setFilteredRoles(filteredRoles);
    } catch (error) {
      console.error('Error loading roles:', error);
      Alert.alert('Error', 'No se pudieron cargar los roles');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...roles];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(role =>
        role.nombre.toLowerCase().includes(term) ||
        (role.descripcion && role.descripcion.toLowerCase().includes(term))
      );
    }

    setFilteredRoles(filtered);
  };

  const handleCreate = () => {
    setEditingRole(null);
    setFormData({
      nombre: '',
      descripcion: '',
    });
    setModalVisible(true);
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      nombre: role.nombre,
      descripcion: role.descripcion || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre del rol es obligatorio');
      return;
    }

    try {
      if (editingRole) {
        await updateRole(editingRole.id, formData);
        Alert.alert('Éxito', 'Rol actualizado correctamente');
      } else {
        await createRole(formData);
        Alert.alert('Éxito', 'Rol creado correctamente');
      }

      setModalVisible(false);
      loadRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      Alert.alert('Error', 'No se pudo guardar el rol');
    }
  };

  const handleDeletePress = (role) => {
    // Check if it's a default role
    const defaultRoles = ['aprendiz', 'pasante', 'invitado', 'instructor'];
    if (defaultRoles.includes(role.nombre.toLowerCase())) {
      Alert.alert('Error', 'No se puede eliminar este rol predeterminado del sistema');
      return;
    }

    // Check if role has users
    if (role.usuariosAsignados > 0) {
      Alert.alert('Error', 'No se puede eliminar el rol porque tiene usuarios asociados');
      return;
    }

    setRoleToDelete(role);
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;

    try {
      await deleteRole(roleToDelete.id);
      Alert.alert('Éxito', 'Rol eliminado correctamente');
      setDeleteModalVisible(false);
      setRoleToDelete(null);
      loadRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      Alert.alert('Error', 'No se pudo eliminar el rol');
      setDeleteModalVisible(false);
      setRoleToDelete(null);
    }
  };

  const renderRoleItem = ({ item }) => {
    const isDefaultRole = ['aprendiz', 'pasante', 'invitado', 'instructor'].includes(item.nombre.toLowerCase());
    const canDelete = !isDefaultRole && item.usuariosAsignados === 0;

    return (
      <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200">
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Ionicons name="shield" size={16} color="#3B82F6" />
              </View>
              <Text className="text-lg font-semibold text-gray-800">{item.nombre}</Text>
            </View>

            <Text className="text-sm text-gray-600 ml-11">
              {item.descripcion || 'Sin descripción'}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center mt-3">
          <View className="flex-row items-center">
            <Ionicons name="people" size={16} color="#666" />
            <Text className="text-sm text-gray-600 ml-2">
              {item.usuariosAsignados || 0} usuario{(item.usuariosAsignados !== 1) ? 's' : ''}
            </Text>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => handleEdit(item)}
              className="bg-blue-500 px-3 py-2 rounded-lg"
            >
              <Ionicons name="pencil" size={16} color="white" />
            </TouchableOpacity>

            {canDelete && (
              <TouchableOpacity
                onPress={() => handleDeletePress(item)}
                className="bg-red-500 px-3 py-2 rounded-lg"
              >
                <Ionicons name="trash" size={16} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text className="mt-2 text-gray-600">Cargando roles...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 shadow-sm">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-gray-800">Gestión de Roles</Text>
          <TouchableOpacity
            onPress={handleCreate}
            className="bg-green-500 px-4 py-2 rounded-lg flex-row items-center"
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-medium ml-2">Nuevo Rol</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <TextInput
          placeholder="Buscar roles..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
        />
      </View>

      {/* Role List */}
      <FlatList
        data={filteredRoles}
        renderItem={renderRoleItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-8">
            <Text className="text-gray-500 text-center">No se encontraron roles</Text>
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
                {editingRole ? 'Editar Rol' : 'Nuevo Rol'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="space-y-4">
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Nombre del Rol</Text>
                  <TextInput
                    placeholder="Ej: Administrador, Instructor, Aprendiz"
                    value={formData.nombre}
                    onChangeText={(value) => setFormData({...formData, nombre: value})}
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Descripción</Text>
                  <TextInput
                    placeholder="Describa las responsabilidades del rol"
                    value={formData.descripcion}
                    onChangeText={(value) => setFormData({...formData, descripcion: value})}
                    multiline
                    numberOfLines={3}
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                    style={{ textAlignVertical: 'top' }}
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
                    {editingRole ? 'Actualizar' : 'Crear'}
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
              <Text className="text-lg font-bold text-gray-800 text-center">¿Eliminar rol?</Text>
            </View>

            {roleToDelete && (
              <View className="bg-gray-50 rounded-lg p-3 mb-6">
                <Text className="font-medium text-gray-900 text-center">{roleToDelete.nombre}</Text>
                <Text className="text-xs text-gray-500 text-center mt-1">Rol del sistema</Text>
              </View>
            )}

            <Text className="text-sm text-gray-600 text-center mb-6">
              Esta acción no se puede deshacer. Se eliminará permanentemente el rol.
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

export default GestionRolesScreen;