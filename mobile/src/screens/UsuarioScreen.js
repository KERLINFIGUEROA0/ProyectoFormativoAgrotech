import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const UsuarioScreen = () => {
  const navigation = useNavigation();

  const QuickAccessCard = ({ title, description, icon, colorClass, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { borderLeftColor: colorClass, borderLeftWidth: 4 }]}
    >
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: colorClass + '20' }]}>
          {icon}
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
      </View>
      <MaterialIcons name="arrow-forward" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeTitle}>¡Bienvenido!</Text>
        <Text style={styles.welcomeSubtitle}>
          Administra eficientemente todos los usuarios del sistema
        </Text>
      </View>

      {/* Quick Access */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <QuickAccessCard
              title="Gestión de Usuarios"
              description="Consulta y administra todos los usuarios"
              icon={<MaterialIcons name="people" size={24} color="#007bff" />}
              colorClass="#007bff"
              onPress={() => navigation.navigate('gestion-usuarios')}
            />
          </View>
          <View style={styles.gridItem}>
            <QuickAccessCard
              title="Gestión de Roles"
              description="Administra roles y permisos"
              icon={<FontAwesome5 name="shield-alt" size={20} color="#28a745" />}
              colorClass="#28a745"
              onPress={() => navigation.navigate('gestion-roles')}
            />
          </View>
        </View>
        <View style={styles.fullWidthCard}>
          <QuickAccessCard
            title="Gestión de Fichas"
            description="Administra fichas de formación"
            icon={<FontAwesome5 name="file-alt" size={20} color="#f59e0b" />}
            colorClass="#f59e0b"
            onPress={() => navigation.navigate('gestion-fichas')}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#e3f2fd',
    lineHeight: 24,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  fullWidthCard: {
    marginTop: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});

export default UsuarioScreen;