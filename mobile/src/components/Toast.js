import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';

// Detectar si estamos en web o móvil
const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.product === 'ReactNative' ? false : true;

// Configuración de driver de animación
const getUseNativeDriver = () => {
  // En web, siempre usar JS-based animations
  if (isWeb) return false;
  // En móvil, usar native driver cuando sea posible
  return true;
};

const Toast = ({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
  position = 'bottom',
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(position === 'bottom' ? 100 : -100)).current;

  useEffect(() => {
    if (visible) {
      // Animación de entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: getUseNativeDriver(),
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: getUseNativeDriver(),
        }),
      ]).start();

      // Auto-hide después de la duración especificada
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: getUseNativeDriver(),
      }),
      Animated.timing(slideAnim, {
        toValue: position === 'bottom' ? 100 : -100,
        duration: 300,
        useNativeDriver: getUseNativeDriver(),
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  const getToastStyle = () => {
    const baseStyle = {
      backgroundColor: COLORS.white,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.lg,
      flexDirection: 'row',
      alignItems: 'center',
      ...SHADOWS.lg,
      borderLeftWidth: 4,
      borderLeftColor: COLORS[type] || COLORS.primary,
    };

    return baseStyle;
  };

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return COLORS.success;
      case 'error':
        return COLORS.danger;
      case 'warning':
        return COLORS.warning;
      case 'info':
      default:
        return COLORS.info;
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        getToastStyle(),
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        position === 'top' ? styles.toastTop : styles.toastBottom,
      ]}
    >
      <Ionicons
        name={getIconName()}
        size={24}
        color={getIconColor()}
        style={styles.toastIcon}
      />
      <Text style={styles.toastMessage}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 1000,
    elevation: 1000,
  },
  toastTop: {
    top: SPACING.xl,
  },
  toastBottom: {
    bottom: SPACING.xl,
  },
  toastIcon: {
    marginRight: SPACING.md,
  },
  toastMessage: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});

export default Toast;