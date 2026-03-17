import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import Card from '../common/Card';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const SLATrendChart = ({ data }) => {
  const labels = data?.labels || [];
  const firstResponse = data?.firstResponse || [];
  const resolution = data?.resolution || [];
  const windowSize = data?.windowSize || 7;

  const [windowStart, setWindowStart] = useState(0);

  useEffect(() => {
    const maxStart = Math.max(0, labels.length - windowSize);
    setWindowStart(maxStart);
  }, [labels.length, windowSize]);

  const maxStart = Math.max(0, labels.length - windowSize);
  const clampedStart = Math.min(windowStart, maxStart);
  const windowEnd = Math.min(labels.length, clampedStart + windowSize);

  const chartData = useMemo(() => ({
    labels: labels.slice(clampedStart, windowEnd),
    datasets: [
      {
        label: 'Primera Respuesta',
        data: firstResponse.slice(clampedStart, windowEnd),
        borderColor: '#4DD4D4',
        backgroundColor: 'rgba(77, 212, 212, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Resolución',
        data: resolution.slice(clampedStart, windowEnd),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  }), [labels, firstResponse, resolution, clampedStart, windowEnd]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
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
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          },
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        ticks: {
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          }
        },
        grid: {
          display: false
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Tendencia de Cumplimiento SLA
      </h3>
      <div style={{ height: '300px' }}>
        <Line data={chartData} options={options} />
      </div>
      {labels.length > windowSize && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>{labels[clampedStart]}</span>
            <span>{labels[windowEnd - 1]}</span>
          </div>
          <input
            type="range"
            min={0}
            max={maxStart}
            value={clampedStart}
            onChange={(e) => setWindowStart(Number(e.target.value))}
            className="w-full"
          />
        </div>
      )}
    </Card>
  );
};

export default SLATrendChart;
