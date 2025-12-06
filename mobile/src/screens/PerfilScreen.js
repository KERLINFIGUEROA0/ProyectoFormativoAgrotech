import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import api from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, COMMON_STYLES } from '../constants/theme';

const PerfilScreen = () => {
  const { logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState({
    tipoIdentificacion: '',
    identificacion: '',
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    rolNombre: '',
    ficha: null,
  });
  const [tempProfile, setTempProfile] = useState(profile);
  const [profileImage, setProfileImage] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    actual: '',
    nueva: '',
    confirmar: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/usuarios/perfil');
      const data = response.data.data;
      const profileData = {
        tipoIdentificacion: data.tipoIdentificacion || 'Cédula de Ciudadanía',
        identificacion: data.identificacion || '',
        nombres: data.nombres || '',
        apellidos: data.apellidos || '',
        correo: data.correo || '',
        telefono: data.telefono || '',
        rolNombre: data.rolNombre || 'Usuario',
        ficha: data.ficha || null,
      };
      setProfile(profileData);
      setTempProfile(profileData);
      loadProfileImage();
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'No se pudo cargar la información del perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfileImage = async () => {
    try {
      const response = await api.get('/usuarios/fotoperfil', {
        responseType: 'blob',
      });
      const imageUrl = URL.createObjectURL(response.data);
      setProfileImage(imageUrl);
    } catch (error) {
      // No hay foto de perfil, usar imagen por defecto
      setProfileImage(null);
    }
  };

  const handleEdit = () => {
    setTempProfile(profile);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempProfile(profile);
    setIsEditing(false);
  };

  const handleSave = async () => {
    // Validaciones
    const errors = [];
    const idDigits = tempProfile.identificacion.replace(/\D+/g, '');
    if (idDigits.length < 6 || idDigits.length > 10) {
      errors.push('El número de identificación debe tener entre 6 y 10 dígitos.');
    }

    const telDigits = tempProfile.telefono.replace(/\D+/g, '');
    if (telDigits.length !== 10) {
      errors.push('El número de teléfono debe tener exactamente 10 dígitos.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tempProfile.correo)) {
      errors.push('El correo electrónico no es válido.');
    }

    if (errors.length > 0) {
      Alert.alert('Errores de validación', errors.join('\n'));
      return;
    }

    try {
      setIsLoading(true);
      const updateData = {
        tipoIdentificacion: tempProfile.tipoIdentificacion,
        identificacion: parseInt(tempProfile.identificacion),
        nombres: tempProfile.nombres,
        apellidos: tempProfile.apellidos,
        correo: tempProfile.correo,
        telefono: tempProfile.telefono,
      };

      await api.put('/usuarios/editarperfil', updateData);
      setProfile(tempProfile);
      setIsEditing(false);
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para seleccionar una imagen');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadProfileImage(result.assets[0]);
    }
  };

  const uploadProfileImage = async (imageAsset) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: imageAsset.uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });

      await api.post('/usuarios/fotoperfil', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Éxito', 'Foto de perfil actualizada correctamente');
      loadProfileImage();
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'No se pudo subir la foto de perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.nueva !== passwordData.confirmar) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (passwordData.nueva.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setIsLoading(true);
      await api.post('/usuarios/cambiarpassword', {
        actual: passwordData.actual,
        nueva: passwordData.nueva,
      });

      Alert.alert('Éxito', 'Contraseña cambiada correctamente');
      setShowPasswordModal(false);
      setPasswordData({ actual: '', nueva: '', confirmar: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'No se pudo cambiar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            // Navigation is handled automatically by AuthContext
          },
        },
      ]
    );
  };

  if (isLoading && !profile.identificacion) {
    return (
      <View style={COMMON_STYLES.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={COMMON_STYLES.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={COMMON_STYLES.container}>
      <View style={COMMON_STYLES.header}>
        <Text style={COMMON_STYLES.headerTitle}>Mi Perfil</Text>
        <Text style={COMMON_STYLES.headerSubtitle}>
          ¡Hola {profile.nombres || 'Usuario'}! Gestiona tu información personal
        </Text>
      </View>

      <View style={COMMON_STYLES.card}>
        <View style={styles.avatarContainer}>
          <Image
            source={
              profileImage
                ? { uri: profileImage }
                : { uri: 'https://via.placeholder.com/100x100/' + COLORS.primary.slice(1) + '/FFFFFF?text=U' }
            }
            style={styles.avatar}
          />
          <TouchableOpacity style={[COMMON_STYLES.button, COMMON_STYLES.primaryButton, styles.editAvatarButton]} onPress={pickImage}>
            <Text style={COMMON_STYLES.buttonText}>📷</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>
          {profile.nombres} {profile.apellidos}
        </Text>
        <Text style={styles.userEmail}>{profile.correo}</Text>
        <View style={[COMMON_STYLES.statusBadge, COMMON_STYLES.statusInfo]}>
          <Text style={COMMON_STYLES.statusBadgeText}>{profile.rolNombre}</Text>
        </View>
      </View>

      <View style={COMMON_STYLES.card}>
        <View style={styles.sectionHeader}>
          <Text style={COMMON_STYLES.modalTitle}>Información Personal</Text>
          {!isEditing && (
            <TouchableOpacity style={[COMMON_STYLES.button, COMMON_STYLES.primaryButton]} onPress={handleEdit}>
              <Text style={COMMON_STYLES.buttonText}>Editar</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Tipo de Identificación</Text>
          {isEditing ? (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={tempProfile.tipoIdentificacion}
                onValueChange={(value) =>
                  setTempProfile({ ...tempProfile, tipoIdentificacion: value })
                }
                style={styles.picker}
              >
                <Picker.Item label="Cédula de Ciudadanía" value="Cédula de Ciudadanía" />
                <Picker.Item label="Tarjeta de Identidad" value="Tarjeta de Identidad" />
              </Picker>
            </View>
          ) : (
            <Text style={styles.value}>{profile.tipoIdentificacion}</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Número de Identificación</Text>
          {isEditing ? (
            <TextInput
              style={COMMON_STYLES.input}
              value={tempProfile.identificacion}
              onChangeText={(value) =>
                setTempProfile({ ...tempProfile, identificacion: value })
              }
              keyboardType="numeric"
              placeholder="Número de identificación"
            />
          ) : (
            <Text style={styles.value}>{profile.identificacion}</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nombres</Text>
          {isEditing ? (
            <TextInput
              style={COMMON_STYLES.input}
              value={tempProfile.nombres}
              onChangeText={(value) =>
                setTempProfile({ ...tempProfile, nombres: value })
              }
              placeholder="Nombres"
            />
          ) : (
            <Text style={styles.value}>{profile.nombres}</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Apellidos</Text>
          {isEditing ? (
            <TextInput
              style={COMMON_STYLES.input}
              value={tempProfile.apellidos}
              onChangeText={(value) =>
                setTempProfile({ ...tempProfile, apellidos: value })
              }
              placeholder="Apellidos"
            />
          ) : (
            <Text style={styles.value}>{profile.apellidos}</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Correo Electrónico</Text>
          {isEditing ? (
            <TextInput
              style={COMMON_STYLES.input}
              value={tempProfile.correo}
              onChangeText={(value) =>
                setTempProfile({ ...tempProfile, correo: value })
              }
              keyboardType="email-address"
              placeholder="Correo electrónico"
            />
          ) : (
            <Text style={styles.value}>{profile.correo}</Text>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Número de Teléfono</Text>
          {isEditing ? (
            <TextInput
              style={COMMON_STYLES.input}
              value={tempProfile.telefono}
              onChangeText={(value) =>
                setTempProfile({ ...tempProfile, telefono: value })
              }
              keyboardType="phone-pad"
              placeholder="Número de teléfono"
            />
          ) : (
            <Text style={styles.value}>{profile.telefono}</Text>
          )}
        </View>

        {profile.ficha && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Ficha</Text>
            <Text style={styles.value}>{profile.ficha.nombre} ({profile.ficha.id_ficha})</Text>
          </View>
        )}

        {isEditing && (
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={[COMMON_STYLES.button, COMMON_STYLES.dangerButton]} onPress={handleCancel}>
              <Text style={COMMON_STYLES.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[COMMON_STYLES.button, COMMON_STYLES.successButton]} onPress={handleSave}>
              <Text style={COMMON_STYLES.buttonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={COMMON_STYLES.card}>
        <Text style={COMMON_STYLES.modalTitle}>Seguridad</Text>
        <TouchableOpacity
          style={[COMMON_STYLES.button, COMMON_STYLES.warningButton]}
          onPress={() => setShowPasswordModal(true)}
        >
          <Text style={COMMON_STYLES.buttonText}>Cambiar Contraseña</Text>
        </TouchableOpacity>
      </View>

      {/* Modal para cambiar contraseña */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={COMMON_STYLES.modalOverlay}>
          <View style={COMMON_STYLES.modalContent}>
            <Text style={COMMON_STYLES.modalTitle}>Cambiar Contraseña</Text>

            <TextInput
              style={COMMON_STYLES.input}
              placeholder="Contraseña actual"
              secureTextEntry
              value={passwordData.actual}
              onChangeText={(value) =>
                setPasswordData({ ...passwordData, actual: value })
              }
            />

            <TextInput
              style={COMMON_STYLES.input}
              placeholder="Nueva contraseña"
              secureTextEntry
              value={passwordData.nueva}
              onChangeText={(value) =>
                setPasswordData({ ...passwordData, nueva: value })
              }
            />

            <TextInput
              style={COMMON_STYLES.input}
              placeholder="Confirmar nueva contraseña"
              secureTextEntry
              value={passwordData.confirmar}
              onChangeText={(value) =>
                setPasswordData({ ...passwordData, confirmar: value })
              }
            />

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity
                style={[COMMON_STYLES.button, COMMON_STYLES.dangerButton]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={COMMON_STYLES.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[COMMON_STYLES.button, COMMON_STYLES.primaryButton]}
                onPress={handleChangePassword}
              >
                <Text style={COMMON_STYLES.buttonText}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: BORDER_RADIUS.full,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  userEmail: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  value: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.gray[50],
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
  },
  picker: {
    height: 50,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
  },
  modalButtonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default PerfilScreen;