import { api } from '../../../lib/axios';

export const exportarExcelCultivo = async (cultivoId: number) => {
  try {
    const response = await api.get(`/cultivos/${cultivoId}/exportar-excel`, {
      responseType: 'blob'
    });

    const blob = response.data;

    // Intentar obtener filename desde header Content-Disposition
    const contentDisp = response.headers['content-disposition'];
    let filename = '';
    if (contentDisp) {
      const match = contentDisp.match(/filename\*?=([^;]+)/i);
      if (match) {
        filename = match[1].trim();
        // remover posibles comillas y UTF-8 prefix
        filename = filename.replace(/^UTF-8''/, '').replace(/^"|"$/g, '');
      }
    }

    if (!filename) {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      filename = `cultivo-${cultivoId}-reporte-${dateStr}.xlsx`;
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
    return true;
  } catch (error) {
    throw error;
  }
};

export const exportarExcelGeneral = async () => {
  try {
    const response = await api.get('/cultivos/exportar-excel/general', {
      responseType: 'blob'
    });

    const blob = response.data;

    // Intentar obtener filename desde header Content-Disposition
    const contentDisp = response.headers['content-disposition'];
    let filename = '';
    if (contentDisp) {
      const match = contentDisp.match(/filename\*?=([^;]+)/i);
      if (match) {
        filename = match[1].trim();
        filename = filename.replace(/^UTF-8''/, '').replace(/^"|"$/g, '');
      }
    }

    if (!filename) {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      filename = `cultivos-reporte-general-${dateStr}.xlsx`;
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
    return true;
  } catch (error) {
    throw error;
  }
};
