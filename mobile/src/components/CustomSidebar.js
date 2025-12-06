import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

const logoFull = require('../../assets/logo.png');
const logoMini = require('../../assets/logo1.png');

const menuItems = [
  {
    id: 'home',
    label: 'Inicio',
    icon: 'home',
  },
  {
    id: 'iot',
    label: 'IoT',
    icon: 'hardware-chip',
    children: [
      { id: 'gestion-sensores', label: 'Monitor de Sensores', icon: 'pulse' },
      { id: 'reportes-sensores', label: 'Reportes Avanzados', icon: 'trending-up' },
      { id: 'gestion-brokers', label: 'Configuración Bróker', icon: 'git-branch' },
    ],
  },
  {
    id: 'cultivos',
    label: 'Cultivos',
    icon: 'leaf',
    children: [
      { id: 'gestion-cultivos', label: 'Gestion de cultivos', icon: 'leaf' },
      { id: 'gestion-lotes', label: 'Gestion de lotes', icon: 'leaf' },
      { id: 'gestion-Sublotes', label: 'Gestión de Sub-lotes', icon: 'leaf' },
    ],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: 'cube',
    children: [
      { id: 'stock', label: 'Gestion de Productos', icon: 'cube' },
      { id: 'movimientos', label: 'Movimientos', icon: 'swap-horizontal' },
    ],
  },
  {
    id: 'fitosanitario',
    label: 'Fitosanitario',
    icon: 'pulse',
    children: [
      { id: 'fitosanitario', label: 'EPA', icon: 'pulse' },
    ],
  },
  {
    id: 'actividades-menu',
    label: 'Actividades',
    icon: 'clipboard',
    children: [
      { id: 'tareas', label: 'Tareas', icon: 'pulse' },
      { id: 'cronograma', label: 'Cronograma', icon: 'calendar' },
      { id: 'pagos-pasante', label: 'Mis Pagos', icon: 'cash' },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    icon: 'trending-up',
    children: [
      { id: 'ingresos', label: 'Inicio', icon: 'trending-up' },
      { id: 'egresos', label: 'Transacciones', icon: 'cube' },
    ],
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    icon: 'settings',
    children: [
      { id: 'gestion-usuarios', label: 'Gestion Usuarios', icon: 'people' },
      { id: 'gestion-roles', label: 'Gestion Roles', icon: 'settings' },
      { id: 'gestion-fichas', label: 'Gestion Fichas', icon: 'cube' },
    ],
  },
];

const CustomSidebar = ({ navigation, state }) => {
  const { logout } = useAuth();
  const [openMenus, setOpenMenus] = useState({});

  const toggleMenu = (id) => {
    setOpenMenus((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleLogout = async () => {
    await logout();
    // Navigation is handled automatically by AuthContext
  };

  const navigateToScreen = (screenName) => {
    navigation.navigate(screenName);
  };

  const isActive = (routeName) => {
    const currentRoute = state.routes[state.index];
    return currentRoute.name === routeName;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={logoFull} style={styles.logo} resizeMode="contain" />
      </View>

      {/* Menu */}
      <ScrollView style={styles.menu}>
        {menuItems.map((item) => {
          const isExpanded = openMenus[item.id];
          const hasChildren = item.children && item.children.length > 0;

          return (
            <View key={item.id}>
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  isActive(item.id) && styles.activeMenuItem,
                ]}
                onPress={() => {
                  if (hasChildren) {
                    toggleMenu(item.id);
                  } else {
                    navigateToScreen(item.id === 'home' ? 'Home' : item.id);
                  }
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={isActive(item.id) ? '#fff' : '#666'}
                />
                <Text
                  style={[
                    styles.menuText,
                    isActive(item.id) && styles.activeMenuText,
                  ]}
                >
                  {item.label}
                </Text>
                {hasChildren && (
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#666"
                    style={styles.chevron}
                  />
                )}
              </TouchableOpacity>

              {/* Submenu */}
              {hasChildren && isExpanded && (
                <View style={styles.submenu}>
                  {item.children.map((child) => (
                    <TouchableOpacity
                      key={child.id}
                      style={[
                        styles.submenuItem,
                        isActive(child.id) && styles.activeSubmenuItem,
                      ]}
                      onPress={() => navigateToScreen(child.id)}
                    >
                      <Ionicons
                        name={child.icon}
                        size={20}
                        color={isActive(child.id) ? '#fff' : '#666'}
                      />
                      <Text
                        style={[
                          styles.submenuText,
                          isActive(child.id) && styles.activeSubmenuText,
                        ]}
                      >
                        {child.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerItem} onPress={() => navigateToScreen('Perfil')}>
          <Ionicons name="person" size={24} color="#666" />
          <Text style={styles.footerText}>Perfil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color="#666" />
          <Text style={styles.footerText}>Salir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    marginVertical: 16,
    marginLeft: 16,
  },
  header: {
    alignItems: 'center',
    padding: 16,
  },
  logo: {
    width: 160,
    height: 40,
  },
  menu: {
    flex: 1,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  activeMenuItem: {
    backgroundColor: '#22c55e',
  },
  menuText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  activeMenuText: {
    color: '#fff',
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 'auto',
  },
  submenu: {
    paddingLeft: 16,
    marginTop: 8,
  },
  submenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  activeSubmenuItem: {
    backgroundColor: '#dcfce7',
  },
  submenuText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  activeSubmenuText: {
    color: '#166534',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
});

export default CustomSidebar;