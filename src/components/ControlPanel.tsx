// Bảng điều khiển mô phỏng.

import React from 'react';
import { START_NODES, DESTINATION_NODES } from '../data/airportGraph';
import type { SimulationConfig } from '../types';

interface Props {
  config: SimulationConfig;
  onConfigChange: (patch: Partial<SimulationConfig>) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  isRunning: boolean;
  isPaused: boolean;
  canStart: boolean;
}

export default function ControlPanel({
  config,
  onConfigChange,
  onStart,
  onPause,
  onReset,
  isRunning,
  isPaused,
  canStart,
}: Props) {
  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-900 rounded-xl border border-gray-700 text-sm text-gray-200">
      <h2 className="text-base font-bold text-white tracking-wide">Điều Khiển Mô Phỏng</h2>

      {/* Tuyến đường */}
      <Section title="Tuyến đường">
        <LabeledSelect
          label="Điểm xuất phát"
          value={config.startNodeId}
          onChange={v => onConfigChange({ startNodeId: v })}
          options={START_NODES.map(n => ({ value: n.id, label: `${n.label || n.id} (${n.description || n.type})` }))}
        />
        <LabeledSelect
          label="Điểm đến"
          value={config.destinationNodeId}
          onChange={v => onConfigChange({ destinationNodeId: v })}
          options={DESTINATION_NODES.map(n => ({ value: n.id, label: `${n.label || n.id} (${n.description || n.type})` }))}
        />
      </Section>

      {/* Môi trường */}
      <Section title="Môi trường">
        <LabeledSelect
          label="Thời tiết"
          value={config.weather}
          onChange={v => onConfigChange({ weather: v as SimulationConfig['weather'] })}
          options={[
            { value: 'clear',        label: 'Quang đãng' },
            { value: 'rain',         label: 'Mưa (giảm 30% tốc độ)' },
            { value: 'fog',          label: 'Sương mù (giảm 55% tốc độ)' },
            { value: 'thunderstorm', label: 'Bão (giảm 65% tốc độ)' },
          ]}
        />
        <LabeledSelect
          label="Thời điểm trong ngày"
          value={config.timeOfDay}
          onChange={v => onConfigChange({ timeOfDay: v as SimulationConfig['timeOfDay'] })}
          options={[
            { value: 'morning',   label: 'Buổi sáng' },
            { value: 'afternoon', label: 'Buổi chiều' },
            { value: 'night',     label: 'Ban đêm' },
          ]}
        />
        <LabeledSelect
          label="Lưu lượng giao thông"
          value={config.trafficLevel}
          onChange={v => onConfigChange({ trafficLevel: v as SimulationConfig['trafficLevel'] })}
          options={[
            { value: 'low',    label: 'Thấp' },
            { value: 'medium', label: 'Trung bình (giảm 25% tốc độ)' },
            { value: 'high',   label: 'Cao (giảm 45% tốc độ)' },
          ]}
        />
      </Section>

      {/* Tốc độ */}
      <Section title="Tốc độ lăn bánh">
        <div className="flex items-center gap-2">
          <input
            type="range" min={3} max={30} step={1}
            value={config.taxiSpeedKts}
            onChange={e => onConfigChange({ taxiSpeedKts: Number(e.target.value) })}
            className="flex-1 accent-green-500"
          />
          <span className="w-16 text-right text-green-400 font-mono">
            {config.taxiSpeedKts} kts
          </span>
        </div>
      </Section>

      {/* Sự cố */}
      <Section title="Tình huống sự cố">
        <LabeledSelect
          label="Loại sự cố"
          value={config.incident}
          onChange={v => onConfigChange({ incident: v as SimulationConfig['incident'] })}
          options={[
            { value: 'none',                   label: 'Không có sự cố' },
            { value: 'blocked_taxiway',         label: 'Đường lăn bị chặn' },
            { value: 'vehicle_crossing',        label: 'Phương tiện cắt ngang' },
            { value: 'runway_incursion',        label: 'Nguy cơ xâm phạm đường băng' },
            { value: 'low_visibility',          label: 'Tầm nhìn hạn chế' },
            { value: 'aircraft_stopped_ahead',  label: 'Máy bay dừng phía trước' },
          ]}
        />
        {config.incident !== 'none' && (
          <IncidentEdgePicker
            incidentEdgeId={config.incidentEdgeId}
            onChange={v => onConfigChange({ incidentEdgeId: v })}
          />
        )}
        <div className="flex items-center gap-2 mt-1">
          <input
            id="autoreroute"
            type="checkbox"
            checked={config.autoReroute}
            onChange={e => onConfigChange({ autoReroute: e.target.checked })}
            className="accent-green-500"
          />
          <label htmlFor="autoreroute" className="text-gray-300 cursor-pointer">
            Tự động tìm đường vòng khi bị chặn
          </label>
        </div>
      </Section>

      {/* Nút điều khiển */}
      <div className="flex gap-2 mt-1">
        {!isRunning && !isPaused && (
          <button
            onClick={onStart}
            disabled={!canStart}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2 rounded-lg transition"
          >
            Bắt đầu
          </button>
        )}
        {isRunning && (
          <button
            onClick={onPause}
            className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 rounded-lg transition"
          >
            Tạm dừng
          </button>
        )}
        {isPaused && (
          <button
            onClick={onPause}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition"
          >
            Tiếp tục
          </button>
        )}
        <button
          onClick={onReset}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition"
        >
          Đặt lại
        </button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs uppercase tracking-widest text-gray-500 border-b border-gray-800 pb-1">{title}</div>
      {children}
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs text-gray-400">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 text-gray-100 rounded px-2 py-1.5 text-xs"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function IncidentEdgePicker({
  incidentEdgeId,
  onChange,
}: {
  incidentEdgeId: string | null;
  onChange: (v: string | null) => void;
}) {
  const pickableEdges = [
    { value: 'TWY_N_B1C1', label: 'Đường lăn B1-C1 (Trung tâm phía bắc)' },
    { value: 'TWY_M_A3B3', label: 'Đường lăn A3-B3 (Giữa phía tây)' },
    { value: 'TWY_M_B3C3', label: 'Đường lăn B3-C3 (Trung tâm giữa)' },
    { value: 'TWY_M_C3D3', label: 'Đường lăn C3-D3 (Giữa phía đông)' },
    { value: 'TWY_S_B2C2', label: 'Đường lăn B2-C2 (Trung tâm phía nam)' },
    { value: 'TWY_A_13',   label: 'Đường lăn A1-A3 (Tây bắc)' },
    { value: 'TWY_B_13',   label: 'Đường lăn B1-B3 (Trung tây bắc)' },
    { value: 'TWY_C_13',   label: 'Đường lăn C1-C3 (Trung đông bắc)' },
  ];

  return (
    <LabeledSelect
      label="Đoạn đường bị ảnh hưởng"
      value={incidentEdgeId ?? ''}
      onChange={v => onChange(v || null)}
      options={[
        { value: '', label: 'Chọn đoạn đường…' },
        ...pickableEdges,
      ]}
    />
  );
}
