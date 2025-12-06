import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../constants/theme';

// Detectar si estamos en web o móvil
const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.product === 'ReactNative' ? false : true;

// Configuración de driver de animación
const getUseNativeDriver = () => {
  // En web, siempre usar JS-based animations
  if (isWeb) return false;
  // En móvil, usar native driver cuando sea posible
  return true;
};

const AnimatedLoader = ({
  size = 'medium',
  color = COLORS.primary,
  type = 'spinner',
  text,
  fullScreen = false,
}) => {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (type === 'spinner') {
      // Animación de rotación continua
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: getUseNativeDriver(),
        })
      ).start();
    } else if (type === 'pulse') {
      // Animación de pulso
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: getUseNativeDriver(),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: getUseNativeDriver(),
          }),
        ])
      ).start();
    } else if (type === 'bounce') {
      // Animación de rebote
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -10,
            duration: 300,
            useNativeDriver: getUseNativeDriver(),
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: getUseNativeDriver(),
          }),
        ])
      ).start();
    } else if (type === 'dots') {
      // Animación de puntos
      const animateDots = () => {
        Animated.stagger(200, [
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 400,
            useNativeDriver: getUseNativeDriver(),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: getUseNativeDriver(),
          }),
        ]).start(() => {
          pulseAnim.setValue(1);
          animateDots();
        });
      };
      animateDots();
    }
  }, [type]);

  const getSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'large':
        return 60;
      case 'medium':
      default:
        return 40;
    }
  };

  const renderSpinner = () => {
    const spinnerSize = getSize();
    const spin = spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <Animated.View
        style={[
          styles.spinner,
          {
            width: spinnerSize,
            height: spinnerSize,
            borderColor: color,
            transform: [{ rotate: spin }],
          },
        ]}
      />
    );
  };

  const renderPulse = () => {
    const pulseSize = getSize();

    return (
      <Animated.View
        style={[
          styles.pulse,
          {
            width: pulseSize,
            height: pulseSize,
            backgroundColor: color,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
    );
  };

  const renderBounce = () => {
    const bounceSize = getSize();

    return (
      <Animated.View
        style={[
          styles.bounce,
          {
            width: bounceSize,
            height: bounceSize,
            backgroundColor: color,
            transform: [{ translateY: bounceAnim }],
          },
        ]}
      />
    );
  };

  const renderDots = () => {
    const dotSize = getSize() / 4;

    return (
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                backgroundColor: color,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderLoader = () => {
    switch (type) {
      case 'spinner':
        return renderSpinner();
      case 'pulse':
        return renderPulse();
      case 'bounce':
        return renderBounce();
      case 'dots':
        return renderDots();
      default:
        return renderSpinner();
    }
  };

  const containerStyle = fullScreen
    ? [styles.container, styles.fullScreen]
    : styles.container;

  return (
    <View style={containerStyle}>
      {renderLoader()}
      {text && (
        <Text style={[styles.text, { color }]}>{text}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  spinner: {
    borderWidth: 3,
    borderRadius: BORDER_RADIUS.full,
    borderTopColor: 'transparent',
  },
  pulse: {
    borderRadius: BORDER_RADIUS.full,
  },
  bounce: {
    borderRadius: BORDER_RADIUS.sm,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: BORDER_RADIUS.full,
    marginHorizontal: SPACING.xs,
  },
  text: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    textAlign: 'center',
  },
});

export default AnimatedLoader;