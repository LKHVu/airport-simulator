// Ứng dụng chính — kết nối vòng lặp mô phỏng, trạng thái cấu hình
// và bố cục ba bảng (bản đồ | điều khiển | trạng thái).

import { useCallback, useEffect, useRef, useState } from 'react';
import AirportMap from './components/AirportMap';
import ControlPanel from './components/ControlPanel';
import StatusPanel from './components/StatusPanel';
import ScenarioPanel from './components/ScenarioPanel';
import HuongDanModal from './components/HuongDanModal';
import { initSimulation, simulationTick, acceptRoute } from './simulation/simulator';
import type { SimulationConfig, SimulationState } from './types';

const DEFAULT_CONFIG: SimulationConfig = {
  startNodeId:       'DOM_S1',
  destinationNodeId: 'H07L',
  callsign:          'VN001',
  aircraftType:      'A321',
  weather:           'clear',
  timeOfDay:         'morning',
  trafficLevel:      'low',
  taxiSpeedKts:      15,
  incident:          'none',
  incidentEdgeId:    null,
  autoReroute:       true,
};

// Số giây mô phỏng trên mỗi giây thực
const TIME_SCALE = 8;

export default function App() {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [simState, setSimState] = useState<SimulationState>(() => initSimulation(DEFAULT_CONFIG));
  const [showGuide, setShowGuide] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Vòng lặp mô phỏng qua requestAnimationFrame
  useEffect(() => {
    if (!simState.isRunning || simState.isPaused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = null;
      return;
    }

    function tick(now: number) {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const realDt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const simDt = realDt * TIME_SCALE;

      setSimState(prev => {
        if (!prev.isRunning || prev.isPaused) return prev;
        return simulationTick(prev, simDt);
      });

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [simState.isRunning, simState.isPaused]);

  const handleConfigChange = useCallback((patch: Partial<SimulationConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch };
      setSimState(initSimulation(next));
      return next;
    });
  }, []);

  const handleStart = useCallback(() => {
    setSimState(prev => {
      if (prev.aircraft && (prev.aircraft.status === 'waiting' || prev.aircraft.status === 'holding')) {
        return {
          ...prev,
          isRunning: true,
          isPaused: false,
          aircraft: { ...prev.aircraft, status: 'taxiing' },
          warningMessage: null,
        };
      }
      const fresh = initSimulation(config);
      return {
        ...fresh,
        isRunning: true,
        isPaused: false,
        aircraft: fresh.aircraft ? { ...fresh.aircraft, status: 'taxiing' } : null,
        warningMessage: null,
      };
    });
  }, [config]);

  const handlePause = useCallback(() => {
    setSimState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  const handleAcceptRoute = useCallback(() => {
    setSimState(prev => acceptRoute(prev));
  }, []);

  const handleReset = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTimeRef.current = null;
    setSimState(initSimulation(config));
  }, [config]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Cảnh báo giáo dục */}
      <header className="bg-amber-950 border-b border-amber-700 text-amber-200 text-center py-1.5 text-xs font-semibold tracking-wide px-4">
        CHỈ DÙNG CHO MỤC ĐÍCH GIÁO DỤC — KHÔNG SỬ DỤNG TRONG HOẠT ĐỘNG HÀNG KHÔNG THỰC TẾ
      </header>

      {/* Thanh tiêu đề */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800">
        <h1 className="text-base font-bold text-white">
          Mô Phỏng Di Chuyển Mặt Đất Sân Bay
        </h1>
        <span className="text-xs text-gray-500 hidden sm:inline">
          · Sơ đồ đơn giản hóa lấy cảm hứng từ Sân bay Tân Sơn Nhất
        </span>

        {/* Nút Hướng dẫn — đặt cuối thanh tiêu đề */}
        <button
          onClick={() => setShowGuide(true)}
          className="ml-auto flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
        >
          <span className="text-sm leading-none">?</span>
          Hướng dẫn sử dụng
        </button>
      </div>

      {/* Bố cục chính */}
      <div className="flex flex-1 gap-3 p-3 overflow-hidden min-h-0">
        {/* Bản đồ sân bay */}
        <div className="flex-1 min-w-0 min-h-0">
          <AirportMap state={simState} />
        </div>

        {/* Thanh bên phải */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
          <ControlPanel
            config={config}
            onConfigChange={handleConfigChange}
            onAcceptRoute={handleAcceptRoute}
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
            routeStatus={simState.routeStatus}
            isRunning={simState.isRunning}
            isPaused={simState.isPaused}
            canStart={!!simState.aircraft}
          />
          <StatusPanel state={simState} />
          <ScenarioPanel state={simState} />
        </div>
      </div>

      {/* Modal hướng dẫn */}
      {showGuide && <HuongDanModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}
