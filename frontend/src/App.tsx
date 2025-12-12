import { AuthProvider } from './context/AuthContext';
import { MonitoringProvider } from './context/MonitoringContext';
import AppRouter from './routes/AppRouter';
import { Toaster } from 'sonner';

function App() {
  return (
    <AuthProvider>
      <MonitoringProvider>
        <AppRouter />
        <Toaster position="top-right" richColors />
      </MonitoringProvider>
    </AuthProvider>
  );
}

export default App;
