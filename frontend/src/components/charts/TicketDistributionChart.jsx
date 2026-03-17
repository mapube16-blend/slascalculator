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

const DEFAULT_LABELS = ['Abiertos', 'Cerrados', 'En Progreso'];
const DEFAULT_VALUES = [0, 0, 0];
const DEFAULT_PALETTE = [
  '#F97316',
  '#38BDF8',
  '#A855F7',
  '#34D399',
  '#F472B6',
  '#6366F1'
];

const getPalette = (count) =>
  Array.from({ length: count }, (_, i) => DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]);

const sumValues = (values) => values.reduce((acc, v) => acc + (Number(v) || 0), 0);

const centerTextPlugin = {
  id: 'centerText',
  afterDraw(chart, _args, pluginOptions) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const total = sumValues(chart.data.datasets?.[0]?.data || []);
    const { left, right, top, bottom } = chartArea;
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;

    const title = pluginOptions?.title || 'Total';
    const value = pluginOptions?.value ?? total;

    ctx.save();
    ctx.fillStyle = pluginOptions?.color || '#E2E8F0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${pluginOptions?.titleSize || 12}px Inter, sans-serif`;
    ctx.fillText(title, centerX, centerY - 16);
    ctx.font = `700 ${pluginOptions?.valueSize || 28}px Inter, sans-serif`;
    ctx.fillText(String(value), centerX, centerY + 8);
    ctx.restore();
  }
};

const outerLabelsPlugin = {
  id: 'outerLabels',
  afterDraw(chart, _args, pluginOptions) {
    const { ctx, chartArea } = chart;
    const meta = chart.getDatasetMeta(0);
    const labels = chart.data.labels || [];
    const values = chart.data.datasets?.[0]?.data || [];
    if (!chartArea || !meta?.data?.length || !labels.length) return;

    const { left, right, top, bottom } = chartArea;
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const total = sumValues(values);

    const offset = pluginOptions?.offset ?? 16;
    const textOffset = pluginOptions?.textOffset ?? 18;
    const minSpacing = pluginOptions?.minSpacing ?? 14;
    const lineColor = pluginOptions?.lineColor || 'rgba(17, 24, 39, 0.2)';
    const textColor = pluginOptions?.textColor || '#111827';
    const fontSize = pluginOptions?.fontSize || 11;

    const points = meta.data.map((arc, index) => {
      const angle = (arc.startAngle + arc.endAngle) / 2;
      const x = centerX + Math.cos(angle) * arc.outerRadius;
      const y = centerY + Math.sin(angle) * arc.outerRadius;
      const side = x >= centerX ? 'right' : 'left';
      return { arc, index, angle, x, y, side };
    });

    const layoutSide = (side) => {
      const items = points
        .filter(p => p.side === side)
        .sort((a, b) => a.y - b.y)
        .map(item => ({ ...item, targetY: item.y }));

      for (let i = 1; i < items.length; i += 1) {
        if (items[i].targetY - items[i - 1].targetY < minSpacing) {
          items[i].targetY = items[i - 1].targetY + minSpacing;
        }
      }
      return items;
    };

    const leftSide = layoutSide('left');
    const rightSide = layoutSide('right');

    ctx.save();
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;

    const drawItem = (item) => {
      const { arc, angle, targetY, side, index } = item;
      const lineStartX = centerX + Math.cos(angle) * (arc.outerRadius + 4);
      const lineStartY = centerY + Math.sin(angle) * (arc.outerRadius + 4);
      const lineMidX = centerX + Math.cos(angle) * (arc.outerRadius + offset);
      const lineMidY = centerY + Math.sin(angle) * (arc.outerRadius + offset);
      const lineEndX = side === 'right'
        ? centerX + arc.outerRadius + offset + textOffset
        : centerX - arc.outerRadius - offset - textOffset;

      ctx.beginPath();
      ctx.moveTo(lineStartX, lineStartY);
      ctx.lineTo(lineMidX, lineMidY);
      ctx.lineTo(lineEndX, targetY);
      ctx.stroke();

      const label = labels[index] || '';
      const value = values[index] || 0;
      const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

      ctx.textAlign = side === 'right' ? 'left' : 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${label} ${percent}%`, lineEndX + (side === 'right' ? 6 : -6), targetY);
    };

    leftSide.forEach(drawItem);
    rightSide.forEach(drawItem);
    ctx.restore();
  }
};

const TicketDistributionChart = ({ data }) => {
  const labels = data?.labels?.length ? data.labels : DEFAULT_LABELS;
  const values = data?.values?.length ? data.values : DEFAULT_VALUES;
  const palette = data?.colors?.length ? data.colors : getPalette(labels.length);
  const total = sumValues(values);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: palette,
        borderColor: palette.map(color => color),
        borderWidth: 0,
        hoverOffset: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 16, bottom: 16, left: 24, right: 24 }
    },
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 12,
          color: '#111827',
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        padding: 12,
        titleFont: {
          size: 13,
          family: 'Inter, sans-serif'
        },
        bodyFont: {
          size: 12,
          family: 'Inter, sans-serif'
        },
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
      centerText: { title: 'Total', value: total, color: '#111827' },
      outerLabels: { offset: 14, textOffset: 14, minSpacing: 14 }
    },
    cutout: '72%'
  };

  return (
    <Card className="bg-white text-slate-900">
      {data?.isTicketView ? (
        <>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Ticket #{data.ticketNumber} - Tiempo por Estado
          </h3>
          <div style={{ height: '320px' }}>
            <Doughnut data={chartData} options={options} plugins={[centerTextPlugin, outerLabelsPlugin]} />
          </div>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Estado Casos
          </h3>
          <div style={{ height: '320px' }}>
            <Doughnut data={chartData} options={options} plugins={[centerTextPlugin, outerLabelsPlugin]} />
          </div>
        </>
      )}
    </Card>
  );
};

export default TicketDistributionChart;
