import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const InventarioScreen = () => {
  const navigation = useNavigation();

  const submodules = [
    {
      id: 'productos',
      title: 'Gestión de Productos',
      description: 'Administrar productos del inventario',
      icon: '📦',
      screen: 'Materiales',
    },
    {
      id: 'movimientos',
      title: 'Movimientos',
      description: 'Ver historial de movimientos de inventario',
      icon: '📊',
      screen: 'Movimientos',
    },
  ];

  const handleNavigate = (screen) => {
    navigation.navigate(screen);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Módulo de Inventario</Text>
      <Text style={styles.subtitle}>Gestione su inventario de manera eficiente</Text>

      <View style={styles.grid}>
        {submodules.map((submodule) => (
          <TouchableOpacity
            key={submodule.id}
            style={styles.card}
            onPress={() => handleNavigate(submodule.screen)}
          >
            <Text style={styles.icon}>{submodule.icon}</Text>
            <Text style={styles.cardTitle}>{submodule.title}</Text>
            <Text style={styles.cardDescription}>{submodule.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 40,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  cardDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
});

export default InventarioScreen;