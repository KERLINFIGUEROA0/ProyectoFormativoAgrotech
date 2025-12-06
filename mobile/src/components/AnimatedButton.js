import React, { useRef } from 'react';
import { TouchableOpacity, Animated, Text } from 'react-native';
import { useButtonAnimation } from '../constants/animations';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, COMMON_STYLES } from '../constants/theme';

const AnimatedButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  children,
  ...props
}) => {
  const { scaleAnim, animatePressIn, animatePressOut } = useButtonAnimation();

  const handlePressIn = () => {
    if (!disabled && !loading) {
      animatePressIn();
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      animatePressOut();
    }
  };

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  // Determinar estilos base según variante
  const getButtonStyle = () => {
    const baseStyle = {
      ...COMMON_STYLES.button,
      transform: [{ scale: scaleAnim }],
    };

    switch (variant) {
      case 'primary':
        return { ...baseStyle, ...COMMON_STYLES.primaryButton };
      case 'secondary':
        return { ...baseStyle, ...COMMON_STYLES.secondaryButton };
      case 'success':
        return { ...baseStyle, ...COMMON_STYLES.successButton };
      case 'warning':
        return { ...baseStyle, ...COMMON_STYLES.warningButton };
      case 'danger':
        return { ...baseStyle, ...COMMON_STYLES.dangerButton };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: COLORS.primary,
        };
      default:
        return { ...baseStyle, ...COMMON_STYLES.primaryButton };
    }
  };

  // Determinar estilos de texto según variante
  const getTextStyle = () => {
    const baseTextStyle = COMMON_STYLES.buttonText;

    switch (variant) {
      case 'outline':
        return { ...baseTextStyle, color: COLORS.primary };
      default:
        return baseTextStyle;
    }
  };

  // Determinar tamaño del botón
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: SPACING.sm,
          paddingHorizontal: SPACING.md,
        };
      case 'large':
        return {
          paddingVertical: SPACING.lg,
          paddingHorizontal: SPACING.xl,
        };
      default: // medium
        return {};
    }
  };

  // Determinar tamaño del texto
  const getTextSizeStyle = () => {
    switch (size) {
      case 'small':
        return { fontSize: TYPOGRAPHY.fontSize.sm };
      case 'large':
        return { fontSize: TYPOGRAPHY.fontSize.lg };
      default: // medium
        return { fontSize: TYPOGRAPHY.fontSize.base };
    }
  };

  const buttonStyle = [
    getButtonStyle(),
    getSizeStyle(),
    disabled && { opacity: 0.6 },
    style,
  ];

  const buttonTextStyle = [
    getTextStyle(),
    getTextSizeStyle(),
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1} // Desactivamos la opacidad por defecto ya que usamos animación
      {...props}
    >
      {loading ? (
        <Animated.Text style={[buttonTextStyle, { transform: [{ scale: scaleAnim }] }]}>
          Cargando...
        </Animated.Text>
      ) : children ? (
        children
      ) : (
        <Animated.Text style={[buttonTextStyle, { transform: [{ scale: scaleAnim }] }]}>
          {title}
        </Animated.Text>
      )}
    </TouchableOpacity>
  );
};

export default AnimatedButton;