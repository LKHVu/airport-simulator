// Hiển thị trạng thái mô phỏng trực tiếp.

import { Fragment } from 'react';
import type { SimulationState } from '../types';
import { airportGraph } from '../data/airportGraph';
import { routeToEdges } from '../simulation/pathfinding';

interface Props {
  state: SimulationState;
}

const STATUS_VI: Record<string, string> = {
  waiting: 'CHỜ',
  taxiing: 'LĂN BÁNH',
  holding: 'GIỮ NGUYÊN',
  stopped: 'DỪNG LẠI',
  arrived: 'ĐÃ ĐẾN',
};

const TIME_VI: Record<string, string> = {
  morning:   'Buổi sáng',
  afternoon: 'Buổi chiều',
  night:     'Ban đêm',
};

const TRAFFIC_VI: Record<string, string> = {
  low:    'Thấp',
  medium: 'Trung bình',
  high:   'Cao',
};

const INCIDENT_VI: Record<string, string> = {
  none:                   '—',
  blocked_taxiway:        'Đường lăn bị chặn',
  vehicle_crossing:       'Phương tiện cắt ngang',
  runway_incursion:       'Nguy cơ xâm phạm đường băng',
  low_visibility:         'Tầm nhìn hạn chế',
  aircraft_stopped_ahead: 'Máy bay dừng phía trước',
};

export default function StatusPanel({ state }: Props) {
  const { aircraft, config, elapsedSeconds, etaSeconds, warningMessage } = state;

  const routeEdgeIds = aircraft
    ? (routeToEdges(aircraft.assignedRoute, airportGraph.edges) ?? [])
    : [];

  const currentEdge = aircraft?.currentEdgeId
    ? airportGraph.edges.find(e => e.id === aircraft.currentEdgeId)
    : null;

  const routeNodeLabels = aircraft?.assignedRoute.map(id => {
    const n = airportGraph.nodes.find(n => n.id === id);
    return n?.label || id;
  }) ?? [];

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-900 rounded-xl border border-gray-700 text-sm text-gray-200">
      <h2 className="text-base font-bold text-white tracking-wide">Trạng Thái Trực Tiếp</h2>

      {warningMessage && (
        <div className="bg-red-900/60 border border-red-500 text-red-200 rounded-lg px-3 py-2 text-xs font-semibold">
          {warningMessage}
        </div>
      )}

      {!aircraft && !warningMessage && (
        <div className="text-gray-500 text-xs italic">Cấu hình thông số và nhấn Bắt đầu.</div>
      )}

      {aircraft && (
        <>
          <StatusGrid items={[
            { label: 'Mã hiệu',        value: aircraft.callsign },
            { label: 'Trạng thái',     value: <StatusBadge status={aircraft.status} /> },
            { label: 'Tốc độ',         value: `${aircraft.speedKts.toFixed(1)} kts` },
            { label: 'Đoạn đường',     value: currentEdge ? currentEdge.id : '—' },
            { label: 'Thời gian qua',  value: formatTime(elapsedSeconds) },
            { label: 'Thời gian còn',  value: etaSeconds != null ? formatTime(etaSeconds) : '—' },
          ]} />

          <div className="border-t border-gray-800 pt-2">
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Môi trường</div>
            <StatusGrid items={[
              { label: 'Thời tiết',   value: <WeatherBadge weather={config.weather} /> },
              { label: 'Thời điểm',  value: TIME_VI[config.timeOfDay] ?? config.timeOfDay },
              { label: 'Lưu lượng',  value: TRAFFIC_VI[config.trafficLevel] ?? config.trafficLevel },
              { label: 'Sự cố',      value: INCIDENT_VI[config.incident] ?? config.incident },
            ]} />
          </div>

          <div className="border-t border-gray-800 pt-2">
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">
              Lộ trình ({routeEdgeIds.length} đoạn)
            </div>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {routeNodeLabels.map((label, i) => (
                <Fragment key={i}>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                      i === aircraft.routeEdgeIndex
                        ? 'bg-green-700 text-white'
                        : i < aircraft.routeEdgeIndex
                        ? 'bg-gray-800 text-gray-500'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    {label}
                  </span>
                  {i < routeNodeLabels.length - 1 && (
                    <span className="text-gray-600 self-center">›</span>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusGrid({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      {items.map(item => (
        <div key={item.label} className="flex justify-between">
          <span className="text-gray-500 text-xs">{item.label}</span>
          <span className="text-gray-100 text-xs font-mono">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    waiting: 'bg-gray-700 text-gray-300',
    taxiing: 'bg-green-800 text-green-200',
    holding: 'bg-yellow-800 text-yellow-200',
    stopped: 'bg-red-900 text-red-200',
    arrived: 'bg-blue-800 text-blue-200',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${colors[status] ?? 'bg-gray-700 text-gray-300'}`}>
      {STATUS_VI[status] ?? status.toUpperCase()}
    </span>
  );
}

function WeatherBadge({ weather }: { weather: string }) {
  const labels: Record<string, string> = {
    clear:        '☀ Quang đãng',
    rain:         '🌧 Mưa',
    fog:          '🌫 Sương mù',
    thunderstorm: '⛈ Bão',
  };
  return <span>{labels[weather] ?? weather}</span>;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
