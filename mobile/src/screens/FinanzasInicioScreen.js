import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import api from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

export default function FinanzasInicioScreen({ navigation }) {
  const [recentMovs, setRecentMovs] = useState([]);
  const [flujoData, setFlujoData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [movsRes, flujoRes] = await Promise.all([
          obtenerTransacciones(),
          obtenerFlujoMensual(),
        ]);

        const allMovs = (movsRes.data || []).map((t) => ({
          ...t,
          tipo: t.tipo || 'ingreso',
          cantidad: t.cantidad || 1,
          precioUnitario: t.precioUnitario || t.monto,
        })).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        setRecentMovs(allMovs.slice(0, 4));
        setFlujoData(flujoRes.data || []);

      } catch (error) {
        Alert.alert("Error", "Error al cargar los datos del dashboard.");
        console.error("Error al cargar datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const obtenerTransacciones = async () => {
    const token = await AsyncStorage.getItem('token');
    const [ventasRes, gastosRes] = await Promise.all([
      api.get("/ventas", {
        headers: { Authorization: `Bearer ${token}` }
      }),
      api.get("/gastos-produccion", {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    const ingresos = (ventasRes.data?.data || []).map((v) => ({
      ...v,
      id: v.id,
      tipo: 'ingreso',
      cantidad: v.cantidad || 1,
      unidad: v.unidadMedida || 'Unid',
      precioUnitario: v.precioUnitario || v.monto,
    }));

    const egresos = (gastosRes.data?.data || []).map((g) => ({
      ...g,
      id: `gasto-${g.id}`,
      tipo: 'egreso',
      cantidad: g.cantidad !== null ? Number(g.cantidad) : 1,
      unidad: g.unidad || '-',
      precioUnitario: g.precioUnitario !== null ? Number(g.precioUnitario) : g.monto,
    }));

    const allTransacciones = [...ingresos, ...egresos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return { data: allTransacciones };
  };

  const obtenerFlujoMensual = async () => {
    const token = await AsyncStorage.getItem('token');
    const response = await api.get("/ventas/flujo-mensual", {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Finanzas</Text>
        <View style={styles.headerActions}>
          <TextInput
            placeholder="Buscar..."
            style={styles.searchInput}
          />
          <TouchableOpacity style={styles.bellButton}>
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gráfico de flujo mensual - Placeholder por ahora */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Flujo de Efectivo Mensual</Text>
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartPlaceholderText}>Gráfico próximamente</Text>
        </View>
      </View>

      {/* Transacciones recientes */}
      <View style={styles.transactionsContainer}>
        <View style={styles.transactionsHeader}>
          <Text style={styles.transactionsTitle}>Transacciones Recientes</Text>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('FinanzasTransacciones')}
          >
            <Text style={styles.viewAllButtonText}>Ver Todas</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Fecha</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Tipo</Text>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Descripción</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Cant.</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Precio Unit.</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Valor Total</Text>
          </View>

          {recentMovs.map((mov, index) => (
            <View key={mov.id} style={[styles.tableRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                {new Date(mov.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </Text>
              <View style={[styles.tableCell, { flex: 1, flexDirection: 'row', alignItems: 'center' }]}>
                <View style={[
                  styles.typeBadge,
                  mov.tipo === 'ingreso' ? styles.incomeBadge : styles.expenseBadge
                ]}>
                  <Text style={[
                    styles.typeIcon,
                    mov.tipo === 'ingreso' ? styles.incomeIcon : styles.expenseIcon
                  ]}>
                    {mov.tipo === 'ingreso' ? '↑' : '↓'}
                  </Text>
                  <Text style={[
                    styles.typeText,
                    mov.tipo === 'ingreso' ? styles.incomeText : styles.expenseText
                  ]}>
                    {mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.tableCell, { flex: 2, fontWeight: '500' }]} numberOfLines={1}>
                {mov.descripcion}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {mov.cantidad}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: '#6B7280' }]}>
                {currencyFormatter.format(mov.precioUnitario || 0)}
              </Text>
              <Text style={[
                styles.tableCell,
                {
                  flex: 1,
                  textAlign: 'right',
                  fontWeight: 'bold',
                  color: mov.tipo === 'egreso' ? '#EF4444' : '#10B981'
                }
              ]}>
                {mov.tipo === 'egreso' ? '-' : ''}{currencyFormatter.format(mov.monto)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    maxWidth: 300,
  },
  searchInput: {
    flex: 1,
  },
  bellButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  bellIcon: {
    fontSize: 20,
    color: '#6B7280',
  },
  viewAllButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewAllButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  typeIcon: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  incomeIcon: {
    color: '#10B981',
  },
  expenseIcon: {
    color: '#EF4444',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    padding: 20,
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  transactionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    padding: 20,
  },
  transactionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  tableContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  evenRow: {
    backgroundColor: '#FFFFFF',
  },
  oddRow: {
    backgroundColor: '#F9FAFB',
  },
  tableCell: {
    fontSize: 14,
    color: '#374151',
    paddingVertical: 2,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  incomeBadge: {
    backgroundColor: '#D1FAE5',
  },
  expenseBadge: {
    backgroundColor: '#FEE2E2',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  incomeText: {
    color: '#065F46',
  },
  expenseText: {
    color: '#991B1B',
  },
});