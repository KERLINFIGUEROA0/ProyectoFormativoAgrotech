// ... imports existentes ...
import { AuthProvider } from './context/AuthContext';
import { MonitoringProvider } from './context/MonitoringContext'; // <--- IMPORTAR ESTO
import AppRouter from './routes/AppRouter';
import { Toaster } from 'sonner';

function App() {
  return (
    <AuthProvider>
      {/* Envolvemos la App con el MonitoringProvider */}
      <MonitoringProvider> 
        <AppRouter />
        <Toaster position="top-right" richColors />
      </MonitoringProvider>
    </AuthProvider>
  );
}

export default App;