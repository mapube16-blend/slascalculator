import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import Card from '../common/Card';

// Registrar componentes de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

const TicketDistributionChart = ({ data }) => {
  const chartData = {
    labels: data?.labels || ['Abiertos', 'Cerrados', 'En Progreso'],
    datasets: [
      {
        data: data?.values || [0, 0, 0],
        backgroundColor: [
          '#EF4444', // danger - Abiertos
          '#10B981', // success - Cerrados
          '#F59E0B', // warning - En Progreso
        ],
        borderColor: [
          '#DC2626',
          '#059669',
          '#D97706',
        ],
        borderWidth: 2,
        hoverOffset: 10
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          },
          usePointStyle: true,
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

                return {
                  text: `${label}: ${value} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          family: 'Inter, sans-serif'
        },
        bodyFont: {
          size: 13,
          family: 'Inter, sans-serif'
        },
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} tickets (${percentage}%)`;
          }
        }
      }
    },
    cutout: '65%', // Hace que sea un donut en lugar de pie
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Distribución de Estado de Tickets
      </h3>
      <div style={{ height: '300px' }}>
        <Doughnut data={chartData} options={options} />
      </div>
    </Card>
  );
};

export default TicketDistributionChart;
