// Bảng điều khiển mô phỏng.

import React from 'react';
import { START_NODES, DESTINATION_NODES } from '../data/airportGraph';
import type { SimulationConfig } from '../types';

interface Props {
  config: SimulationConfig;
  onConfigChange: (patch: Partial<SimulationConfig>) => void;
  onAcceptRoute: () => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  routeStatus: 'pending' | 'accepted';
  isRunning: boolean;
  isPaused: boolean;
  canStart: boolean;
  blockedCount: number;
  autoIncidents: boolean;
  onToggleAutoIncidents: () => void;
  onTriggerIncident: () => void;
  onClearIncidents: () => void;
}

export default function ControlPanel({
  config,
  onConfigChange,
  onAcceptRoute,
  onStart,
  onPause,
  onReset,
  routeStatus,
  isRunning,
  isPaused,
  canStart,
  blockedCount,
  autoIncidents,
  onToggleAutoIncidents,
  onTriggerIncident,
  onClearIncidents,
}: Props) {
  return (
    <div className="flex flex-col gap-3 p-4 bg-[#111620] rounded-xl border border-[#1e2838] text-sm text-gray-200">
      <h2 className="text-base font-bold text-white tracking-wide">Điều Khiển Mô Phỏng</h2>

      {/* Cấu hình tàu bay */}
      <Section title="Cấu hình tàu bay">
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-400">Số hiệu chuyến bay</label>
          <input
            type="text"
            value={config.callsign}
            onChange={e => onConfigChange({ callsign: e.target.value.toUpperCase() })}
            maxLength={8}
            className="bg-[#0d1318] border border-[#1e2838] text-gray-100 rounded px-2 py-1.5 text-xs font-mono uppercase"
            placeholder="VN001"
          />
        </div>
        <LabeledSelect
          label="Loại tàu bay"
          value={config.aircraftType}
          onChange={v => onConfigChange({ aircraftType: v as SimulationConfig['aircraftType'] })}
          options={[
            { value: 'A321', label: 'Airbus A321 (Thân hẹp · lăn chuẩn)' },
            { value: 'B737', label: 'Boeing 737 (Thân hẹp · nhanh nhẹn)' },
            { value: 'A350', label: 'Airbus A350 (Thân rộng · lăn chậm, lớn)' },
            { value: 'ATR72', label: 'ATR 72 (Turboprop · nhỏ, chậm)' },
          ]}
        />
      </Section>

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

      {/* Sự cố động (A-SMGCS / SMAN) */}
      <Section title="Sự cố trên đường lăn (động)">
        <p className="text-xs text-gray-500 -mt-1">
          Tạo sự cố ngay khi máy bay đang lăn — hệ thống sẽ tự chạy lại Dijkstra
          từ vị trí hiện tại để tìm đường vòng, không khởi động lại.
        </p>

        <button
          onClick={onTriggerIncident}
          disabled={!isRunning}
          className="w-full bg-orange-700 hover:bg-orange-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
        >
          ⚠ Tạo sự cố trên tuyến phía trước
        </button>

        <div className="flex items-center gap-2 mt-1">
          <input
            id="autoincidents"
            type="checkbox"
            checked={autoIncidents}
            onChange={onToggleAutoIncidents}
            className="accent-orange-500"
          />
          <label htmlFor="autoincidents" className="text-gray-300 cursor-pointer">
            Sự cố tự động (mỗi 4 giây khi đang lăn)
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="autoreroute"
            type="checkbox"
            checked={config.autoReroute}
            onChange={e => onConfigChange({ autoReroute: e.target.checked })}
            className="accent-green-500"
          />
          <label htmlFor="autoreroute" className="text-gray-300 cursor-pointer">
            Tự động tìm đường vòng (Dijkstra) khi bị chặn
          </label>
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">
            Đoạn bị chặn: <span className="text-red-400 font-mono">{blockedCount}</span>
          </span>
          <button
            onClick={onClearIncidents}
            disabled={blockedCount === 0}
            className="text-xs text-gray-300 underline disabled:text-gray-700 disabled:no-underline"
          >
            Xóa sự cố
          </button>
        </div>
      </Section>

      {/* Nút điều khiển */}
      <div className="flex flex-col gap-2 mt-1">
        {/* Step 1: Accept route — shown when not yet running */}
        {!isRunning && !isPaused && routeStatus === 'pending' && (
          <button
            onClick={onAcceptRoute}
            disabled={!canStart}
            className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2 rounded-lg transition text-sm"
          >
            ✓ Chấp nhận tuyến đường
          </button>
        )}

        {/* Step 2: Start — shown only after route accepted */}
        {!isRunning && !isPaused && routeStatus === 'accepted' && (
          <button
            onClick={onStart}
            disabled={!canStart}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2 rounded-lg transition text-sm"
          >
            ▶ Bắt đầu lăn bánh
          </button>
        )}

        {isRunning && (
          <button
            onClick={onPause}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 rounded-lg transition text-sm"
          >
            ⏸ Tạm dừng
          </button>
        )}
        {isPaused && (
          <button
            onClick={onPause}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg transition text-sm"
          >
            ▶ Tiếp tục
          </button>
        )}
        <button
          onClick={onReset}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition text-sm"
        >
          ↺ Đặt lại
        </button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs uppercase tracking-widest text-[#4a5a6e] border-b border-[#1e2838] pb-1">{title}</div>
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
        className="bg-[#0d1318] border border-[#1e2838] text-gray-100 rounded px-2 py-1.5 text-xs"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

