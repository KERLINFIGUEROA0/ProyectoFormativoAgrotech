// Utilidades para descargar archivos desde el navegador

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const downloadFile = async (blob: Blob, filename: string) => {
  try {
    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    throw error;
  }
};