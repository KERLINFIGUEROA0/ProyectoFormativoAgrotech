import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { FileText, BarChart3, TrendingUp, Calendar, Filter, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- APIS ---
import { generateSensorReport } from '../api/sensoresApi';
import { listarCultivos } from '../../cultivos/api/cultivosApi';
import { listarSurcos } from '../../cultivos/api/surcosApi';

// --- INTERFACES ---
import type { ReportData, SensorReport } from '../interfaces/iot';
import type { Cultivo, Surco } from '../../cultivos/interfaces/cultivos';

export default function ReportesSensoresPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [surcos, setSurcos] = useState<Surco[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  // Filtros
  const [scope, setScope] = useState<'surco' | 'cultivo'>('cultivo');
  const [scopeId, setScopeId] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<'day' | 'date' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cultivosRes, surcosRes] = await Promise.all([
        listarCultivos(),
        listarSurcos()
      ]);
      setCultivos(cultivosRes.data || []);
      setSurcos(surcosRes.data || []);
    } catch (error) {
      console.error('Error loading data', error);
    }
  };

  const getScopeName = () => {
    if (scope === 'cultivo') {
      const cultivo = cultivos.find(c => c.id === scopeId);
      return cultivo ? cultivo.nombre : 'Desconocido';
    } else {
      const surco = surcos.find(s => s.id === scopeId);
      return surco ? surco.nombre : 'Desconocido';
    }
  };

  const generateReport = async () => {
    console.log('Starting report generation...');
    console.log('Scope:', scope, 'ScopeId:', scopeId, 'TimeFilter:', timeFilter, 'Date:', selectedDate);

    if (!scopeId) {
      toast.error('Selecciona un cultivo o surco');
      return;
    }

    if ((timeFilter === 'date' || timeFilter === 'month') && !selectedDate) {
      toast.error('Selecciona una fecha');
      return;
    }

    setLoading(true);
    try {
      console.log('Calling generateSensorReport API...');
      const params = {
        scope,
        scopeId,
        timeFilter,
        date: selectedDate || undefined
      };
      console.log('API params:', params);

      const data = await generateSensorReport(params);
      console.log('API response received:', data);

      if (data && data.sensors) {
        console.log('Setting report data with', data.sensors.length, 'sensors');
        setReportData(data);
        toast.success('Reporte generado exitosamente');
      } else {
        console.error('Invalid response data:', data);
        toast.error('Respuesta inválida del servidor');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(`Error al generar el reporte: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    // Ajustar por huso horario: restar 5 horas (UTC-5)
    const date = new Date(dateString);
    date.setHours(date.getHours() - 5);
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadReport = async () => {
    if (!reportData) return;

    setDownloading(true);
    try {
      console.log('Starting PDF generation...');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      pdf.setFontSize(20);
      pdf.text('Reporte de Sensores IoT', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Report info
      pdf.setFontSize(12);
      pdf.text(`Alcance: ${reportData.scope === 'cultivo' ? 'Cultivo General' : 'Surco Individual'}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Nombre: ${getScopeName()}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Período: ${formatDate(reportData.dateRange.start)} - ${formatDate(reportData.dateRange.end)}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Sensores analizados: ${reportData.sensors.length}`, 20, yPosition);
      yPosition += 15;

      // Statistics for each sensor
      for (const sensor of reportData.sensors) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(14);
        pdf.text(`Sensor: ${sensor.sensorName}`, 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        const stats = sensor.statistics;
        pdf.text(`Mínimo: ${stats.min.toFixed(2)} | Máximo: ${stats.max.toFixed(2)}`, 20, yPosition);
        yPosition += 6;
        pdf.text(`Promedio: ${stats.average.toFixed(2)} | Desv. Estándar: ${stats.standardDeviation.toFixed(2)}`, 20, yPosition);
        yPosition += 15;

        // Try to capture chart image
        let chartAdded = false;
        try {
          const chartElement = document.querySelector(`[data-sensor-id="${sensor.sensorId}"]`);
          if (chartElement) {
            console.log(`Attempting to capture chart for sensor ${sensor.sensorId}`);
            const canvas = await html2canvas(chartElement as HTMLElement, {
              scale: 1.5,
              useCORS: true,
              allowTaint: false,
              backgroundColor: '#ffffff',
              width: 400,
              height: 200,
            });

            const imgData = canvas.toDataURL('image/png', 0.8);
            const imgWidth = 160;
            const imgHeight = 80;

            if (yPosition + imgHeight > pageHeight - 20) {
              pdf.addPage();
              yPosition = 20;
            }

            pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 5;
            chartAdded = true;
            console.log(`Chart captured successfully for sensor ${sensor.sensorId}`);
          }
        } catch (chartError) {
          console.warn(`Could not capture chart for sensor ${sensor.sensorId}:`, chartError);
        }

        // Add chart data as text if chart capture failed
        if (!chartAdded) {
          pdf.setFontSize(8);
          pdf.text('Datos del gráfico:', 20, yPosition);
          yPosition += 5;

          // Show first few data points
          const maxPoints = 5;
          for (let i = 0; i < Math.min(maxPoints, sensor.chartData.length); i++) {
            const point = sensor.chartData[i];
            const timeStr = formatDate(point.timestamp);
            pdf.text(`${timeStr}: ${point.value.toFixed(2)}`, 25, yPosition);
            yPosition += 4;
          }

          if (sensor.chartData.length > maxPoints) {
            pdf.text(`... y ${sensor.chartData.length - maxPoints} puntos más`, 25, yPosition);
            yPosition += 4;
          }
        }

        yPosition += 10; // Space between sensors
      }

      // Footer
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(`Generado el ${new Date().toLocaleString('es-CO')}`, 20, pageHeight - 10);
        pdf.text(`Página ${i} de ${pageCount}`, pageWidth - 30, pageHeight - 10);
      }

      const fileName = `reporte-sensores-${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('Saving PDF:', fileName);
      pdf.save(fileName);

      toast.success('Reporte descargado exitosamente');
      console.log('PDF generation completed successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(`Error al generar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setDownloading(false);
    }
  };

  const renderStatisticsCard = (sensor: SensorReport) => (
    <div key={sensor.sensorId} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{sensor.sensorName}</h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{sensor.statistics.min.toFixed(2)}</div>
          <div className="text-sm text-gray-500">Mínimo</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{sensor.statistics.max.toFixed(2)}</div>
          <div className="text-sm text-gray-500">Máximo</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{sensor.statistics.average.toFixed(2)}</div>
          <div className="text-sm text-gray-500">Promedio</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{sensor.statistics.standardDeviation.toFixed(2)}</div>
          <div className="text-sm text-gray-500">Desv. Estándar</div>
        </div>
      </div>

      <div className="h-48" data-sensor-id={sensor.sensorId}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sensor.chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="timestamp"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatDate(value)}
            />
            <YAxis fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              labelFormatter={(value) => formatDate(value)}
              formatter={(value: number) => [value.toFixed(2), 'Valor']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="text-blue-600" size={32} />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reportes Avanzados de Sensores</h1>
            <p className="text-sm text-gray-500 mt-1">Análisis estadístico y visualización de datos IoT</p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Alcance</label>
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as 'surco' | 'cultivo');
                setScopeId(null);
              }}
              className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block py-2.5 px-3"
            >
              <option value="cultivo">Cultivo General</option>
              <option value="surco">Surco Individual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {scope === 'cultivo' ? 'Cultivo' : 'Surco'}
            </label>
            <select
              value={scopeId || ''}
              onChange={(e) => setScopeId(Number(e.target.value))}
              className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block py-2.5 px-3"
            >
              <option value="">Seleccionar...</option>
              {scope === 'cultivo' && cultivos.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
              {scope === 'surco' && surcos.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtro de Tiempo</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as 'day' | 'date' | 'month')}
              className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block py-2.5 px-3"
            >
              <option value="day">Día Actual</option>
              <option value="date">Fecha Específica</option>
              <option value="month">Mes Completo</option>
            </select>
          </div>

          {(timeFilter === 'date' || timeFilter === 'month') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {timeFilter === 'date' ? 'Fecha' : 'Mes y Año'}
              </label>
              <input
                type={timeFilter === 'date' ? 'date' : 'month'}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block py-2.5 px-3"
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={generateReport}
            disabled={loading || !scopeId}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generando...
              </>
            ) : (
              <>
                <BarChart3 size={18} />
                Generar Reporte
              </>
            )}
          </button>

          {reportData && (
            <button
              onClick={downloadReport}
              disabled={downloading}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generando PDF...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Descargar PDF
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* RESULTADOS */}
      {reportData && (
        <div ref={reportRef} className="space-y-6">
          {/* RESUMEN */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="text-green-600" size={24} />
              Resumen del Reporte
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Alcance</div>
                <div className="font-semibold text-gray-800">
                  {reportData.scope === 'cultivo' ? 'Cultivo General' : 'Surco Individual'}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">{scope === 'cultivo' ? 'Cultivo' : 'Surco'}</div>
                <div className="font-semibold text-gray-800">{getScopeName()}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Período</div>
                <div className="font-semibold text-gray-800">
                  {formatDate(reportData.dateRange.start)} - {formatDate(reportData.dateRange.end)}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Sensores Analizados</div>
                <div className="font-semibold text-gray-800">{reportData.sensors.length}</div>
              </div>
            </div>
          </div>

          {/* GRÁFICOS POR SENSOR */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reportData.sensors.map(renderStatisticsCard)}
          </div>
        </div>
      )}

      {!reportData && !loading && (
        <div className="text-center py-20 opacity-60">
          <Filter size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-lg text-gray-500">Configura los filtros y genera un reporte</p>
        </div>
      )}
    </div>
  );
}