import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

export const initializeCapacitor = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Configurar StatusBar
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });

      // Ocultar SplashScreen después de que la app esté lista
      await SplashScreen.hide();

      // Manejar el botón de retroceso en Android
      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        } else {
          window.history.back();
        }
      });

      console.log('Capacitor inicializado correctamente');
    } catch (error) {
      console.error('Error al inicializar Capacitor:', error);
    }
  }
};
