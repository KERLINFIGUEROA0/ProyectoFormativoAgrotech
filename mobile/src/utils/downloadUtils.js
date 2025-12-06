import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Utilidades para descargar y compartir archivos en React Native
export const downloadAndShareFile = async (blob, filename, mimeType = 'application/octet-stream') => {
  try {
    // Convertir blob a base64
    const base64 = await blobToBase64(blob);

    // Crear URI temporal
    const fileUri = FileSystem.documentDirectory + filename;

    // Escribir archivo
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Compartir archivo
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: `Compartir ${filename}`,
      });
    } else {
      throw new Error('Compartir no está disponible en este dispositivo');
    }

    // Limpiar archivo temporal después de compartir
    await FileSystem.deleteAsync(fileUri, { idempotent: true });

  } catch (error) {
    console.error('Error al descargar y compartir archivo:', error);
    throw error;
  }
};

// Función para descargar PDF
export const downloadPDF = async (blob, filename = 'reporte.pdf') => {
  try {
    await downloadAndShareFile(blob, filename, 'application/pdf');
  } catch (error) {
    console.error('Error al descargar PDF:', error);
    throw error;
  }
};

// Función para descargar Excel
export const downloadExcel = async (blob, filename = 'reporte.xlsx') => {
  try {
    await downloadAndShareFile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } catch (error) {
    console.error('Error al descargar Excel:', error);
    throw error;
  }
};

// Función auxiliar para convertir blob a base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};