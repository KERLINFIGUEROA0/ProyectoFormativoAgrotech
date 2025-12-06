import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, COMMON_STYLES } from '../constants/theme';

const LoginScreen = () => {
  const { login } = useAuth();
  const navigation = useNavigation();
  const [formulario, setFormulario] = useState({
    identificacion: '',
    password: '',
  });
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async () => {
    if (!formulario.identificacion.trim() || !formulario.password.trim()) {
      Alert.alert('Error', 'Debe llenar todos los campos');
      return;
    }

    setCargando(true);
    const minLoadingTime = 2000;
    const startTime = Date.now();

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        identificacion: formulario.identificacion,
        password: formulario.password,
      });

      const { access_token, user } = response.data;

      // Check if user is inactive
      if (user && user.estado === false) {
        throw new Error('Usuario inactivo. Por favor, contacte al administrador.');
      }

      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }

      await login(access_token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await AsyncStorage.setItem('modulos', JSON.stringify(response.data.modulos));

      navigation.replace('Home');
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }

      let mensaje = 'Credenciales incorrectas';
      if (error.response?.data?.message) {
        mensaje = error.response.data.message;
      } else if (error.message) {
        mensaje = error.message;
      }

      if (mensaje.includes('inactivo')) {
        Alert.alert('Usuario Inactivo', mensaje);
      } else {
        Alert.alert('Error', mensaje);
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ImageBackground
        source={require('../../assets/bg-login.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Agrotech</Text>
            <Text style={styles.subtitle}>Iniciar sesión</Text>

            <TextInput
              style={COMMON_STYLES.input}
              placeholder="Documento"
              value={formulario.identificacion}
              onChangeText={(value) =>
                setFormulario({ ...formulario, identificacion: value })
              }
              keyboardType="numeric"
              placeholderTextColor={COLORS.gray[400]}
              autoCapitalize="none"
              returnKeyType="next"
            />

            <TextInput
              style={COMMON_STYLES.input}
              placeholder="Contraseña"
              value={formulario.password}
              onChangeText={(value) =>
                setFormulario({ ...formulario, password: value })
              }
              secureTextEntry
              placeholderTextColor={COLORS.gray[400]}
              returnKeyType="done"
              onSubmitEditing={manejarLogin}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPasswordContainer}
            >
              <Text style={styles.forgotPasswordText}>
                ¿Olvidaste tu contraseña?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, cargando && styles.buttonDisabled]}
              onPress={manejarLogin}
              disabled={cargando}
            >
              <Text style={styles.buttonText}>
                {cargando ? 'Cargando...' : 'Ingresar'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    padding: SPACING.xl,
    paddingBottom: 100, // Extra padding for keyboard
    minHeight: '100%',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING['3xl'],
    ...SHADOWS.lg,
    marginTop: 100, // Push card down from top
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize['4xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primaryDark,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING['3xl'],
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray[400],
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-start',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  forgotPasswordText: {
    color: COLORS.gray[500],
    fontSize: TYPOGRAPHY.fontSize.sm,
    textDecorationLine: 'underline',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});

export default LoginScreen;
