// Sistema de Animaciones Interactivas para React Native
import { Animated, Easing } from 'react-native';

// Configuraciones de animación base
export const ANIMATION_CONFIG = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
    slower: 700,
  },
  easing: {
    easeInOut: Easing.inOut(Easing.ease),
    easeOut: Easing.out(Easing.ease),
    easeIn: Easing.in(Easing.ease),
    bounce: Easing.bounce,
    elastic: Easing.elastic(1),
  },
};

// Detectar si estamos en web o móvil
const isWeb = typeof window !== 'undefined' && window.navigator && window.navigator.product === 'ReactNative' ? false : true;

// Configuración de driver de animación
const getUseNativeDriver = () => {
  // En web, siempre usar JS-based animations
  if (isWeb) return false;
  // En móvil, usar native driver cuando sea posible
  return true;
};

// Animaciones de escala para botones
export const createScaleAnimation = (scaleValue, toValue = 0.95) => {
  return Animated.timing(scaleValue, {
    toValue,
    duration: ANIMATION_CONFIG.duration.fast,
    easing: ANIMATION_CONFIG.easing.easeInOut,
    useNativeDriver: getUseNativeDriver(),
  });
};

// Animación de fade in/out
export const createFadeAnimation = (opacityValue, toValue = 1) => {
  return Animated.timing(opacityValue, {
    toValue,
    duration: ANIMATION_CONFIG.duration.normal,
    easing: ANIMATION_CONFIG.easing.easeInOut,
    useNativeDriver: getUseNativeDriver(),
  });
};

// Animación de slide desde dirección específica
export const createSlideAnimation = (translateValue, toValue = 0, direction = 'bottom') => {
  const fromValue = direction === 'bottom' ? 50 : direction === 'top' ? -50 : direction === 'left' ? -50 : 50;

  return Animated.timing(translateValue, {
    toValue,
    duration: ANIMATION_CONFIG.duration.normal,
    easing: ANIMATION_CONFIG.easing.easeOut,
    useNativeDriver: getUseNativeDriver(),
  });
};

// Animación de bounce para elementos interactivos
export const createBounceAnimation = (scaleValue) => {
  const bounceUp = Animated.timing(scaleValue, {
    toValue: 1.1,
    duration: ANIMATION_CONFIG.duration.fast,
    easing: ANIMATION_CONFIG.easing.bounce,
    useNativeDriver: getUseNativeDriver(),
  });

  const bounceDown = Animated.timing(scaleValue, {
    toValue: 1,
    duration: ANIMATION_CONFIG.duration.fast,
    easing: ANIMATION_CONFIG.easing.bounce,
    useNativeDriver: getUseNativeDriver(),
  });

  return Animated.sequence([bounceUp, bounceDown]);
};

// Animación de rotación para loading
export const createSpinAnimation = (rotationValue) => {
  return Animated.loop(
    Animated.timing(rotationValue, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: getUseNativeDriver(),
    })
  );
};

// Animación de pulso para elementos destacados
export const createPulseAnimation = (scaleValue) => {
  const pulseIn = Animated.timing(scaleValue, {
    toValue: 1.05,
    duration: ANIMATION_CONFIG.duration.slow,
    easing: ANIMATION_CONFIG.easing.easeInOut,
    useNativeDriver: getUseNativeDriver(),
  });

  const pulseOut = Animated.timing(scaleValue, {
    toValue: 1,
    duration: ANIMATION_CONFIG.duration.slow,
    easing: ANIMATION_CONFIG.easing.easeInOut,
    useNativeDriver: getUseNativeDriver(),
  });

  return Animated.loop(Animated.sequence([pulseIn, pulseOut]));
};

// Animación de entrada secuencial para listas
export const createStaggerAnimation = (animations, staggerDelay = 100) => {
  return Animated.stagger(staggerDelay, animations);
};

// Hook personalizado para animaciones de pantalla
export const useScreenAnimation = () => {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  const animateIn = () => {
    return Animated.parallel([
      createFadeAnimation(fadeAnim, 1),
      createSlideAnimation(slideAnim, 0, 'bottom'),
    ]);
  };

  const animateOut = () => {
    return Animated.parallel([
      createFadeAnimation(fadeAnim, 0),
      createSlideAnimation(slideAnim, -50, 'top'),
    ]);
  };

  return {
    fadeAnim,
    slideAnim,
    animateIn,
    animateOut,
  };
};

// Hook para animaciones de botón
export const useButtonAnimation = () => {
  const scaleAnim = new Animated.Value(1);

  const animatePressIn = () => {
    createScaleAnimation(scaleAnim, 0.95).start();
  };

  const animatePressOut = () => {
    createScaleAnimation(scaleAnim, 1).start();
  };

  return {
    scaleAnim,
    animatePressIn,
    animatePressOut,
  };
};

// Hook para animaciones de carga
export const useLoadingAnimation = () => {
  const spinAnim = new Animated.Value(0);
  const pulseAnim = new Animated.Value(1);

  const startLoading = () => {
    const spinAnimation = createSpinAnimation(spinAnim);
    const pulseAnimation = createPulseAnimation(pulseAnim);

    spinAnimation.start();
    pulseAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
    };
  };

  const interpolateSpin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return {
    spinAnim: interpolateSpin,
    pulseAnim,
    startLoading,
  };
};

// Hook para animaciones de lista
export const useListAnimation = () => {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(20);

  const animateItem = (delay = 0) => {
    return Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.duration.normal,
        delay,
        easing: ANIMATION_CONFIG.easing.easeOut,
        useNativeDriver: getUseNativeDriver(),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: ANIMATION_CONFIG.duration.normal,
        delay,
        easing: ANIMATION_CONFIG.easing.easeOut,
        useNativeDriver: getUseNativeDriver(),
      }),
    ]);
  };

  return {
    fadeAnim,
    slideAnim,
    animateItem,
  };
};

// Animaciones predefinidas para componentes comunes
export const PRESET_ANIMATIONS = {
  // Animación de entrada de pantalla
  screenEnter: {
    opacity: 0,
    transform: [{ translateY: 50 }],
  },
  screenEnterAnimated: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },

  // Animación de botón presionado
  buttonPressed: {
    transform: [{ scale: 0.95 }],
  },

  // Animación de carga
  loading: {
    transform: [{ rotate: '360deg' }],
  },

  // Animación de éxito
  success: {
    transform: [{ scale: [1, 1.2, 1] }],
  },

  // Animación de error
  error: {
    transform: [{ translateX: [0, -10, 10, -10, 10, 0] }],
  },
};

// Configuraciones de timing para animaciones complejas
export const TIMING_CONFIG = {
  // Timing para animaciones de entrada
  enter: {
    duration: ANIMATION_CONFIG.duration.normal,
    easing: ANIMATION_CONFIG.easing.easeOut,
    useNativeDriver: getUseNativeDriver(),
  },

  // Timing para animaciones de salida
  exit: {
    duration: ANIMATION_CONFIG.duration.fast,
    easing: ANIMATION_CONFIG.easing.easeIn,
    useNativeDriver: getUseNativeDriver(),
  },

  // Timing para animaciones de hover/press
  interaction: {
    duration: ANIMATION_CONFIG.duration.fast,
    easing: ANIMATION_CONFIG.easing.easeInOut,
    useNativeDriver: getUseNativeDriver(),
  },
};