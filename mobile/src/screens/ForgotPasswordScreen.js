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
import { API_BASE_URL } from '../config/api';
import { useNavigation } from '@react-navigation/native';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const [identificacion, setIdentificacion] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarSolicitud = async () => {
    if (!identificacion.trim()) {
      Alert.alert('Error', 'Por favor, ingresa tu número de identificación.');
      return;
    }

    setCargando(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/recuperacion/solicitar`, {
        identificacion: identificacion.trim(),
      });

      Alert.alert(
        'Solicitud enviada',
        'Revisa tu correo electrónico para las instrucciones de recuperación.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      let mensajeError = 'Error al solicitar la recuperación';
      if (error.response?.data?.message) {
        mensajeError = error.response.data.message;
      }
      Alert.alert('Error', mensajeError);
    } finally {
      setCargando(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/bg-login.jpg')}
      style={styles.container}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Background overlay */}
          <View style={styles.backgroundOverlay} />

          <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <View style={styles.header}>
                <Text style={styles.appTitle}>Agrotech</Text>
                <View style={styles.iconContainer}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
                <Text style={styles.title}>Restablecer Contraseña</Text>
              </View>

              <Text style={styles.description}>
                Ingresa tu número de identificación para enviarte un enlace de recuperación.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Número de identificación"
                value={identificacion}
                onChangeText={setIdentificacion}
                keyboardType="numeric"
                placeholderTextColor="#888"
              />

              <TouchableOpacity
                style={[styles.button, cargando && styles.buttonDisabled]}
                onPress={manejarSolicitud}
                disabled={cargando}
              >
                <Text style={styles.buttonText}>
                  {cargando ? 'Enviando...' : 'Enviar Enlace'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backButtonText}>Volver al inicio de sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bottom gradient */}
        <View style={styles.bottomGradient} />
      </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e8f5e8',
  },
  cardBody: {
    padding: 32,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2d5a27',
    marginBottom: 16,
  },
  iconContainer: {
    marginBottom: 16,
  },
  lockIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 24,
  },
  button: {
    width: '100%',
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});

export default ForgotPasswordScreen;