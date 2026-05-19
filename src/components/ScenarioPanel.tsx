// Bảng thông tin tình huống — giải thích sự cố hiện tại và hệ thống đèn.

import type { SimulationState } from '../types';

interface Props {
  state: SimulationState;
}

const INCIDENT_INFO: Record<string, { title: string; desc: string; color: string }> = {
  none: {
    title: 'Không có sự cố',
    desc:  'Hoạt động bình thường.',
    color: 'text-green-400',
  },
  blocked_taxiway: {
    title: 'Đường lăn bị chặn',
    desc:  'Một phương tiện hoặc vật cản đang chặn đường lăn. Máy bay phải giữ nguyên hoặc tìm đường vòng.',
    color: 'text-orange-400',
  },
  vehicle_crossing: {
    title: 'Phương tiện cắt ngang',
    desc:  'Xe mặt đất đang cắt qua đường lăn. Vạch dừng được kích hoạt trên đoạn bị ảnh hưởng.',
    color: 'text-yellow-400',
  },
  runway_incursion: {
    title: 'Nguy cơ xâm phạm đường băng',
    desc:  'Một máy bay đã vào đường băng mà không có phép. Toàn bộ di chuyển trên đường lăn lân cận bị tạm dừng.',
    color: 'text-red-400',
  },
  low_visibility: {
    title: 'Tầm nhìn hạn chế',
    desc:  'Quy trình tầm nhìn thấp (SMGCS) đang áp dụng. Tốc độ bị giới hạn, đèn xanh dẫn đường là bắt buộc.',
    color: 'text-blue-400',
  },
  aircraft_stopped_ahead: {
    title: 'Máy bay dừng phía trước',
    desc:  'Máy bay phía trước đã dừng trên đường lăn. Máy bay phía sau phải giữ nguyên vị trí.',
    color: 'text-orange-300',
  },
};

export default function ScenarioPanel({ state }: Props) {
  const info = INCIDENT_INFO[state.config.incident];
  const blockedCount = state.blockedEdgeIds.size;

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-900 rounded-xl border border-gray-700 text-sm text-gray-200">
      <h2 className="text-base font-bold text-white tracking-wide">Thông Tin Tình Huống</h2>

      <div className="bg-gray-800 rounded-lg p-3">
        <div className={`font-semibold ${info.color} mb-1`}>{info.title}</div>
        <div className="text-xs text-gray-400">{info.desc}</div>
      </div>

      <div className="border-t border-gray-800 pt-2">
        <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Hệ thống đèn dẫn đường</div>
        <div className="flex flex-col gap-1.5 text-xs">
          <LightExplainer color="bg-green-500" label="Xanh lá" desc="Đường đã được giải phóng — máy bay được phép lăn bánh trên đoạn này." />
          <LightExplainer color="bg-red-500"   label="Đỏ"      desc="Vạch dừng hoặc đoạn bị chặn — không được vượt qua." />
          <LightExplainer color="bg-gray-600"  label="Tắt"     desc="Không thuộc lộ trình đang hoạt động." />
        </div>
      </div>

      <div className="border-t border-gray-800 pt-2 text-xs text-gray-400">
        <div>Đoạn bị chặn: <span className="text-red-400 font-mono">{blockedCount}</span></div>
        <div>
          Tự động tìm đường:{' '}
          <span className={state.config.autoReroute ? 'text-green-400' : 'text-gray-500'}>
            {state.config.autoReroute ? 'Bật' : 'Tắt'}
          </span>
        </div>
      </div>

      <div className="text-xs text-gray-600 border-t border-gray-800 pt-2">
        Trong thực tế, hệ thống "Đèn Dẫn Đường Xanh" (SMGCS) hướng dẫn phi công dọc theo lộ trình lăn bánh đã được giải phóng bằng đèn nhúng trong đường băng/đường lăn. Vạch dừng ngăn ngừa xâm phạm đường băng.
      </div>
    </div>
  );
}

function LightExplainer({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`w-3 h-3 mt-0.5 rounded-full flex-shrink-0 ${color}`} />
      <span><span className="font-semibold text-gray-200">{label}:</span> {desc}</span>
    </div>
  );
}
