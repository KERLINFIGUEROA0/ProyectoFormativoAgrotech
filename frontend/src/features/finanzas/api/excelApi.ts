export const exportarExcelCultivo = async (cultivoId: number) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/cultivos/${cultivoId}/exportar-excel`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al generar el Excel');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `cultivo-${cultivoId}-reporte.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};