import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario } from '../config/api';
import { getRoles } from '../config/api';
import { getFichas } from '../config/api';
import { Ionicons } from '@expo/vector-icons';

const GestionUsuariosScreen = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRol, setFilterRol] = useState('');
  const [filterFicha, setFilterFicha] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    tipo: 'CC',
    identificacion: '',
    nombre: '',
    apellidos: '',
    correo: '',
    telefono: '',
    rolId: '',
    id_ficha: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [usuarios, searchTerm, filterStatus, filterRol, filterFicha]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usuariosRes, rolesRes, fichasRes] = await Promise.all([
        getUsuarios(),
        getRoles(),
        getFichas(),
      ]);

      setUsuarios(usuariosRes.data || []);
      setRoles(rolesRes || []);
      setFichas(fichasRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...usuarios];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        `${user.nombre} ${user.apellidos || ''}`.toLowerCase().includes(term) ||
        user.identificacion.toString().includes(term) ||
        user.correo.toLowerCase().includes(term) ||
        user.tipoUsuario?.nombre.toLowerCase().includes(term) ||
        user.ficha?.id_ficha?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter(user => user.estado);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(user => !user.estado);
    }

    // Role filter
    if (filterRol) {
      filtered = filtered.filter(user => user.tipoUsuario?.id.toString() === filterRol);
    }

    // Ficha filter
    if (filterFicha) {
      filtered = filtered.filter(user => user.ficha?.id_ficha === filterFicha);
    }

    setFilteredUsuarios(filtered);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      tipo: 'CC',
      identificacion: '',
      nombre: '',
      apellidos: '',
      correo: '',
      telefono: '',
      rolId: '',
      id_ficha: '',
    });
    setModalVisible(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      tipo: user.tipo || 'CC',
      identificacion: user.identificacion.toString(),
      nombre: user.nombre,
      apellidos: user.apellidos || '',
      correo: user.correo,
      telefono: user.telefono,
      rolId: user.tipoUsuario?.id.toString() || '',
      id_ficha: user.ficha?.id_ficha || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const dataToSend = {
        Tipo_Identificacion: formData.tipo,
        identificacion: parseInt(formData.identificacion),
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        correo: formData.correo,
        telefono: formData.telefono,
        tipoUsuario: parseInt(formData.rolId),
        ...(formData.id_ficha && { id_ficha: formData.id_ficha }),
        ...(editingUser ? {} : { password: formData.identificacion }),
      };

      if (editingUser) {
        await updateUsuario(editingUser.id, dataToSend);
        Alert.alert('Éxito', 'Usuario actualizado correctamente');
      } else {
        await createUsuario(dataToSend);
        Alert.alert('Éxito', 'Usuario creado correctamente');
      }

      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Error saving user:', error);
      Alert.alert('Error', 'No se pudo guardar el usuario');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      if (user.estado) {
        await deleteUsuario(user.id);
        Alert.alert('Éxito', 'Usuario desactivado');
      } else {
        // Note: Reactivar functionality might need a separate endpoint
        Alert.alert('Info', 'Funcionalidad de reactivar pendiente');
      }
      loadData();
    } catch (error) {
      console.error('Error toggling status:', error);
      Alert.alert('Error', 'No se pudo cambiar el estado del usuario');
    }
  };

  const renderUserItem = ({ item }) => (
    <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800">
            {item.nombre} {item.apellidos}
          </Text>
          <Text className="text-sm text-gray-600">ID: {item.identificacion}</Text>
          <Text className="text-sm text-gray-600">{item.correo}</Text>
        </View>
        <View className="flex-row items-center">
          <View className={`px-2 py-1 rounded-full ${item.estado ? 'bg-green-100' : 'bg-red-100'}`}>
            <Text className={`text-xs font-medium ${item.estado ? 'text-green-800' : 'text-red-800'}`}>
              {item.estado ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row justify-between items-center mt-3">
        <View className="flex-1">
          <Text className="text-sm text-gray-600">
            Rol: {item.tipoUsuario?.nombre || 'Sin asignar'}
          </Text>
          {item.ficha && (
            <Text className="text-sm text-gray-600">
              Ficha: {item.ficha.id_ficha}
            </Text>
          )}
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            className="bg-blue-500 px-3 py-2 rounded-lg"
          >
            <Ionicons name="pencil" size={16} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleToggleStatus(item)}
            className={`px-3 py-2 rounded-lg ${item.estado ? 'bg-red-500' : 'bg-green-500'}`}
          >
            <Ionicons
              name={item.estado ? "close" : "checkmark"}
              size={16}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text className="mt-2 text-gray-600">Cargando usuarios...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 shadow-sm">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-gray-800">Gestión de Usuarios</Text>
          <TouchableOpacity
            onPress={handleCreate}
            className="bg-green-500 px-4 py-2 rounded-lg flex-row items-center"
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-medium ml-2">Nuevo</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View className="space-y-3">
          <TextInput
            placeholder="Buscar por nombre, ID, correo..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          />

          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1">Estado</Text>
              <View className="border border-gray-300 rounded-lg bg-white">
                <Picker
                  selectedValue={filterStatus}
                  onValueChange={setFilterStatus}
                >
                  <Picker.Item label="Todos" value="all" />
                  <Picker.Item label="Activos" value="active" />
                  <Picker.Item label="Inactivos" value="inactive" />
                </Picker>
              </View>
            </View>

            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-1">Rol</Text>
              <View className="border border-gray-300 rounded-lg bg-white">
                <Picker
                  selectedValue={filterRol}
                  onValueChange={setFilterRol}
                >
                  <Picker.Item label="Todos" value="" />
                  {roles.map(rol => (
                    <Picker.Item key={rol.id} label={rol.nombre} value={rol.id.toString()} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Ficha</Text>
            <View className="border border-gray-300 rounded-lg bg-white">
              <Picker
                selectedValue={filterFicha}
                onValueChange={setFilterFicha}
              >
                <Picker.Item label="Todas" value="" />
                {fichas.map(ficha => (
                  <Picker.Item key={ficha.id} label={ficha.nombre} value={ficha.id_ficha} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </View>

      {/* User List */}
      <FlatList
        data={filteredUsuarios}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-8">
            <Text className="text-gray-500 text-center">No se encontraron usuarios</Text>
          </View>
        }
      />

      {/* Modal for Create/Edit */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black bg-opacity-50">
          <View className="bg-white rounded-t-3xl p-6 max-h-4/5">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-800">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="space-y-4">
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Tipo ID</Text>
                  <View className="border border-gray-300 rounded-lg bg-white">
                    <Picker
                      selectedValue={formData.tipo}
                      onValueChange={(value) => setFormData({...formData, tipo: value})}
                    >
                      <Picker.Item label="Cédula de Ciudadanía" value="CC" />
                      <Picker.Item label="Tarjeta de Identidad" value="TI" />
                    </Picker>
                  </View>
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Identificación</Text>
                  <TextInput
                    placeholder="Número de identificación"
                    value={formData.identificacion}
                    onChangeText={(value) => setFormData({...formData, identificacion: value})}
                    keyboardType="numeric"
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Nombre</Text>
                  <TextInput
                    placeholder="Nombre"
                    value={formData.nombre}
                    onChangeText={(value) => setFormData({...formData, nombre: value})}
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Apellidos</Text>
                  <TextInput
                    placeholder="Apellidos"
                    value={formData.apellidos}
                    onChangeText={(value) => setFormData({...formData, apellidos: value})}
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Correo</Text>
                  <TextInput
                    placeholder="correo@ejemplo.com"
                    value={formData.correo}
                    onChangeText={(value) => setFormData({...formData, correo: value})}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Teléfono</Text>
                  <TextInput
                    placeholder="Número de teléfono"
                    value={formData.telefono}
                    onChangeText={(value) => setFormData({...formData, telefono: value})}
                    keyboardType="phone-pad"
                    className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                  />
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Rol</Text>
                  <View className="border border-gray-300 rounded-lg bg-white">
                    <Picker
                      selectedValue={formData.rolId}
                      onValueChange={(value) => setFormData({...formData, rolId: value})}
                    >
                      <Picker.Item label="Seleccionar rol" value="" />
                      {roles.map(rol => (
                        <Picker.Item key={rol.id} label={rol.nombre} value={rol.id.toString()} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Ficha (Opcional)</Text>
                  <View className="border border-gray-300 rounded-lg bg-white">
                    <Picker
                      selectedValue={formData.id_ficha}
                      onValueChange={(value) => setFormData({...formData, id_ficha: value})}
                    >
                      <Picker.Item label="Sin ficha" value="" />
                      {fichas.map(ficha => (
                        <Picker.Item key={ficha.id} label={ficha.nombre} value={ficha.id_ficha} />
                      ))}
                    </Picker>
                  </View>
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
                    {editingUser ? 'Actualizar' : 'Crear'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default GestionUsuariosScreen;