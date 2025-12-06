import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import UsuarioScreen from './src/screens/UsuarioScreen';
import GestionUsuariosScreen from './src/screens/GestionUsuariosScreen';
import GestionRolesScreen from './src/screens/GestionRolesScreen';
import GestionFichasScreen from './src/screens/GestionFichasScreen';
import LoteScreen from './src/screens/LoteScreen';
import CultivoScreen from './src/screens/CultivoScreen';
import SensorScreen from './src/screens/SensorScreen';
import InformacionSensorScreen from './src/screens/InformacionSensorScreen';
import ReportesSensoresScreen from './src/screens/ReportesSensoresScreen';
import GestionBrokersScreen from './src/screens/GestionBrokersScreen';
import TratamientoScreen from './src/screens/TratamientoScreen';
import EpaScreen from './src/screens/EpaScreen';
import ActividadesScreen from './src/screens/ActividadesScreen';
import TareasScreen from './src/screens/TareasScreen';
import CronogramaScreen from './src/screens/CronogramaScreen';
import MisPagosScreen from './src/screens/MisPagosScreen';
import FinanzasInicioScreen from './src/screens/FinanzasInicioScreen';
import FinanzasTransaccionesScreen from './src/screens/FinanzasTransaccionesScreen';
import InventarioScreen from './src/screens/InventarioScreen';
import MaterialesScreen from './src/screens/MaterialesScreen';
import MovimientosScreen from './src/screens/MovimientosScreen';
import ProduccionesScreen from './src/screens/ProduccionesScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import CustomSidebar from './src/components/CustomSidebar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

function DrawerNavigator() {
  return (
    <Drawer.Navigator drawerContent={(props) => <CustomSidebar {...props} />}>
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="gestion-sensores" component={InformacionSensorScreen} />
      <Drawer.Screen name="reportes-sensores" component={ReportesSensoresScreen} />
      <Drawer.Screen name="gestion-brokers" component={GestionBrokersScreen} />
      <Drawer.Screen name="gestion-cultivos" component={CultivoScreen} />
      <Drawer.Screen name="gestion-lotes" component={LoteScreen} />
      <Drawer.Screen name="gestion-Sublotes" component={LoteScreen} />
      <Drawer.Screen name="inventario" component={InventarioScreen} />
      <Drawer.Screen name="stock" component={MaterialesScreen} />
      <Drawer.Screen name="movimientos" component={MovimientosScreen} />
      <Drawer.Screen name="fitosanitario" component={EpaScreen} />
      <Drawer.Screen name="gestion-actividades" component={ActividadesScreen} />
      <Drawer.Screen name="tareas" component={TareasScreen} />
      <Drawer.Screen name="cronograma" component={CronogramaScreen} />
      <Drawer.Screen name="pagos-pasante" component={MisPagosScreen} />
      <Drawer.Screen name="finanzas" component={FinanzasInicioScreen} />
      <Drawer.Screen name="ingresos" component={FinanzasInicioScreen} />
      <Drawer.Screen name="egresos" component={FinanzasTransaccionesScreen} />
      <Drawer.Screen name="gestion-usuarios" component={GestionUsuariosScreen} />
      <Drawer.Screen name="gestion-roles" component={GestionRolesScreen} />
      <Drawer.Screen name="gestion-fichas" component={GestionFichasScreen} />
      <Drawer.Screen name="Perfil" component={PerfilScreen} />
    </Drawer.Navigator>
  );
}

function AppNavigator() {
  const { isLoggedIn, isLoading } = useAuth();

  console.log('🚀 AppNavigator: isLoading:', isLoading, 'isLoggedIn:', isLoggedIn);

  if (isLoading) {
    console.log('⏳ AppNavigator: Showing loading screen');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  console.log('🧭 AppNavigator: Rendering navigation, isLoggedIn:', isLoggedIn);
  return (
    <NavigationContainer>
      {isLoggedIn ? (
        <DrawerNavigator />
      ) : (
        <Stack.Navigator>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{
              headerShown: false,
              presentation: 'modal'
            }}
          />
        </Stack.Navigator>
      )}
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
