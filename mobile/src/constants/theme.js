// Sistema de Diseño Unificado para la Aplicación Móvil
export const COLORS = {
  // Colores primarios
  primary: '#22c55e',      // Verde principal
  primaryDark: '#16a34a',  // Verde oscuro
  primaryLight: '#4ade80', // Verde claro

  // Colores secundarios
  secondary: '#3b82f6',    // Azul
  secondaryDark: '#2563eb',
  secondaryLight: '#60a5fa',

  // Colores de estado
  success: '#10b981',      // Verde éxito
  warning: '#f59e0b',      // Amarillo warning
  danger: '#ef4444',       // Rojo error
  info: '#8b5cf6',         // Púrpura info

  // Colores neutros
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Colores de fondo
  background: {
    primary: '#f9fafb',
    secondary: '#ffffff',
    modal: 'rgba(0,0,0,0.5)',
  },

  // Colores de texto
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
  },

  // Colores de borde
  border: {
    light: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
  },
};

export const TYPOGRAPHY = {
  // Tamaños de fuente
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
  },

  // Pesos de fuente
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Altura de línea
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
};

export const SPACING = {
  // Espaciado básico
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 20,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    // Para React Native Web
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  md: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    // Para React Native Web
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  lg: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    // Para React Native Web
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
  },
  xl: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    // Para React Native Web
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
  },
};

// Estilos base reutilizables
const baseButton = {
  paddingVertical: SPACING.md,
  paddingHorizontal: SPACING.lg,
  borderRadius: BORDER_RADIUS.md,
  alignItems: 'center',
  justifyContent: 'center',
};

const baseStatusBadge = {
  paddingHorizontal: SPACING.sm,
  paddingVertical: SPACING.xs,
  borderRadius: BORDER_RADIUS.full,
};

// Estilos comunes reutilizables
export const COMMON_STYLES = {
  // Contenedores
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },

  // Headers
  header: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
  },

  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },

  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
  },

  // Botones
  button: baseButton,

  buttonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.white,
  },

  // Botones por variante
  primaryButton: {
    ...baseButton,
    backgroundColor: COLORS.primary,
  },

  secondaryButton: {
    ...baseButton,
    backgroundColor: COLORS.secondary,
  },

  successButton: {
    ...baseButton,
    backgroundColor: COLORS.success,
  },

  warningButton: {
    ...baseButton,
    backgroundColor: COLORS.warning,
  },

  dangerButton: {
    ...baseButton,
    backgroundColor: COLORS.danger,
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: COLORS.border.medium,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    backgroundColor: COLORS.white,
    color: COLORS.text.primary,
  },

  // Cards
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },

  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.background.modal,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    width: '90%',
    maxWidth: 400,
    ...SHADOWS.lg,
  },

  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },

  modalSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },

  // Estados de carga
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.primary,
  },

  loadingText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.text.secondary,
  },

  // Estados vacíos
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['3xl'],
  },

  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  // Badges de estado
  statusBadge: baseStatusBadge,

  statusBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },

  // Status badge variants
  statusSuccess: {
    ...baseStatusBadge,
    backgroundColor: COLORS.success,
  },

  statusWarning: {
    ...baseStatusBadge,
    backgroundColor: COLORS.warning,
  },

  statusDanger: {
    ...baseStatusBadge,
    backgroundColor: COLORS.danger,
  },

  statusInfo: {
    ...baseStatusBadge,
    backgroundColor: COLORS.info,
  },

  statusDefault: {
    ...baseStatusBadge,
    backgroundColor: COLORS.gray[400],
  },
};

// Funciones de utilidad para estilos dinámicos
export const getStatusBadgeStyle = (status) => {
  const statusMap = {
    'Activo': COMMON_STYLES.statusSuccess,
    'En crecimiento': COMMON_STYLES.statusSuccess,
    'En preparación': COMMON_STYLES.statusWarning,
    'Parcialmente ocupado': COMMON_STYLES.statusInfo,
    'En cultivación': COMMON_STYLES.statusSuccess,
    'En mantenimiento': COMMON_STYLES.statusWarning,
    'Finalizado': COMMON_STYLES.statusDefault,
    'Inactivo': COMMON_STYLES.statusDanger,
  };

  return statusMap[status] || COMMON_STYLES.statusDefault;
};

export const getStatusBadgeText = (status) => {
  const textMap = {
    'Activo': 'ACTIVO',
    'En crecimiento': 'CRECIMIENTO',
    'En preparación': 'PREPARACIÓN',
    'Parcialmente ocupado': 'PARCIAL',
    'En cultivación': 'CULTIVO',
    'En mantenimiento': 'MANTENIMIENTO',
    'Finalizado': 'FINALIZADO',
    'Inactivo': 'INACTIVO',
  };

  return textMap[status] || status.toUpperCase();
};