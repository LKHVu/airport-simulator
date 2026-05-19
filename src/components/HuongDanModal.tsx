// Modal "Hướng dẫn sử dụng" — có thể mở/đóng dễ dàng.

import { useEffect } from 'react';

interface Props {
  onClose: () => void;
}

export default function HuongDanModal({ onClose }: Props) {
  // Đóng khi nhấn phím Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    /* Overlay tối */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Hộp nội dung — ngăn sự kiện click lan ra overlay */}
      <div
        className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Hướng dẫn sử dụng</h2>
            <p className="text-xs text-gray-500 mt-0.5">Mô phỏng di chuyển mặt đất sân bay giáo dục</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition text-2xl leading-none px-2"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        {/* Nội dung cuộn */}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-6 text-sm text-gray-300">

          {/* 1. Giới thiệu */}
          <Section title="1. Giới thiệu">
            <p>
              Đây là phần mềm <strong className="text-white">mô phỏng di chuyển mặt đất sân bay</strong> dành cho mục đích giáo dục.
              Hệ thống minh họa khái niệm <strong className="text-green-400">Đèn Dẫn Đường Xanh (Follow-the-Greens / SMGCS)</strong> —
              công nghệ dẫn đường trực quan giúp phi công lăn bánh an toàn theo lộ trình được cấp phép,
              đặc biệt hữu ích trong điều kiện tầm nhìn kém hoặc sân bay có mật độ cao.
            </p>
            <Callout type="warning">
              Phần mềm này <strong>KHÔNG phải</strong> hệ thống kiểm soát không lưu thực tế. Mọi dữ liệu sân bay chỉ mang tính minh họa.
            </Callout>
          </Section>

          {/* 2. Cách sử dụng */}
          <Section title="2. Các bước thực hiện">
            <ol className="flex flex-col gap-2 list-none">
              <Step n={1} title="Chọn tuyến đường">
                Trong mục <em>Điều Khiển Mô Phỏng</em>, chọn <strong className="text-white">Điểm xuất phát</strong> (ô đỗ, sân đỗ…) và <strong className="text-white">Điểm đến</strong> (điểm chờ đường băng, ô đỗ…).
                Hệ thống tự tính lộ trình tối ưu bằng thuật toán Dijkstra.
              </Step>
              <Step n={2} title="Thiết lập môi trường">
                Chọn <strong className="text-white">Thời tiết</strong>, <strong className="text-white">Thời điểm trong ngày</strong> và <strong className="text-white">Lưu lượng giao thông</strong>.
                Mỗi yếu tố ảnh hưởng đến tốc độ lăn bánh thực tế.
              </Step>
              <Step n={3} title="Điều chỉnh tốc độ">
                Kéo thanh trượt <strong className="text-white">Tốc độ lăn bánh</strong> (3–30 knot). Tốc độ thực tế được tính sau khi áp dụng hệ số thời tiết và lưu lượng.
              </Step>
              <Step n={4} title="Thêm tình huống sự cố (tùy chọn)">
                Chọn loại <strong className="text-white">Sự cố</strong> và <strong className="text-white">Đoạn đường bị ảnh hưởng</strong>.
                Bật <strong className="text-white">Tự động tìm đường vòng</strong> để hệ thống tự tìm lộ trình thay thế khi gặp sự cố.
              </Step>
              <Step n={5} title="Chạy mô phỏng">
                Nhấn <strong className="text-green-400">Bắt đầu</strong> để khởi chạy. Dùng <strong className="text-yellow-400">Tạm dừng</strong> / <strong className="text-blue-400">Tiếp tục</strong> hoặc <strong className="text-gray-300">Đặt lại</strong> bất cứ lúc nào.
              </Step>
            </ol>
          </Section>

          {/* 3. Bản đồ */}
          <Section title="3. Đọc bản đồ sân bay">
            <div className="grid grid-cols-2 gap-2">
              <MapLegendItem color="bg-slate-400" label="Đường băng" desc="Hai đường băng song song: 07L/25R (trên) và 07R/25L (dưới)" />
              <MapLegendItem color="bg-slate-600" label="Đường lăn" desc="Các đường lăn kết nối sân đỗ với đường băng (A, B, C, D)" />
              <MapLegendItem color="bg-amber-500" label="Điểm giữ chờ (Hold)" desc="Vị trí máy bay dừng chờ lệnh vào đường băng" />
              <MapLegendItem color="bg-green-500" label="Ô đỗ (Stand)" desc="Stand 1–8: vị trí đỗ của máy bay tại sân" />
              <MapLegendItem color="bg-amber-400" label="Điểm xuất phát" desc="Vị trí bắt đầu của máy bay trong mô phỏng" />
              <MapLegendItem color="bg-green-400" label="Điểm đến" desc="Vị trí mục tiêu cần đến" />
            </div>
          </Section>

          {/* 4. Hệ thống đèn */}
          <Section title="4. Hệ thống đèn dẫn đường">
            <div className="flex flex-col gap-2">
              <LightRow color="bg-green-500" label="Xanh lá — Đường đã giải phóng">
                Các đoạn đường phía trước máy bay (trong vùng nhìn trước 4 đoạn) được đèn xanh chiếu sáng.
                Phi công được phép lăn bánh qua các đoạn này.
              </LightRow>
              <LightRow color="bg-red-500" label="Đỏ — Vạch dừng / Bị chặn">
                Đoạn đường đang bị sự cố, đóng cửa hoặc bị hạn chế. Máy bay phải dừng trước vạch này.
              </LightRow>
              <LightRow color="bg-gray-600" label="Tắt — Không thuộc lộ trình">
                Đoạn đường không nằm trong lộ trình hiện tại hoặc đã được đi qua.
              </LightRow>
            </div>
          </Section>

          {/* 5. Sự cố */}
          <Section title="5. Các loại sự cố">
            <div className="flex flex-col gap-2 text-xs">
              <IncidentRow icon="🚧" name="Đường lăn bị chặn"       desc="Vật cản vật lý trên đường lăn. Máy bay giữ nguyên hoặc tìm đường vòng." />
              <IncidentRow icon="🚗" name="Phương tiện cắt ngang"   desc="Xe mặt đất đi qua đường lăn. Kích hoạt vạch dừng trên đoạn bị ảnh hưởng." />
              <IncidentRow icon="⚠" name="Nguy cơ xâm phạm đường băng" desc="Máy bay vào đường băng trái phép. Toàn bộ di chuyển lân cận bị đình chỉ." />
              <IncidentRow icon="🌫" name="Tầm nhìn hạn chế"        desc="Quy trình SMGCS kích hoạt. Tốc độ giảm, đèn xanh trở nên thiết yếu." />
              <IncidentRow icon="✈" name="Máy bay dừng phía trước" desc="Máy bay kế trước bất động trên đường lăn. Phải giữ khoảng cách an toàn." />
            </div>
          </Section>

          {/* 6. Phím tắt */}
          <Section title="6. Ghi chú kỹ thuật">
            <ul className="list-disc list-inside flex flex-col gap-1 text-xs text-gray-400">
              <li>Tốc độ mô phỏng nhanh hơn thực tế <strong className="text-gray-300">8×</strong> để dễ quan sát.</li>
              <li>Thuật toán tìm đường: <strong className="text-gray-300">Dijkstra</strong> theo tổng chiều dài đoạn đường (mét).</li>
              <li>Thay đổi cấu hình khi đang chạy sẽ <strong className="text-gray-300">đặt lại</strong> mô phỏng về trạng thái ban đầu.</li>
              <li>Nhấn <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-200 font-mono">Esc</kbd> để đóng cửa sổ này.</li>
            </ul>
          </Section>

        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-gray-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-1">{title}</h3>
      {children}
    </div>
  );
}

function Callout({ type, children }: { type: 'warning' | 'info'; children: React.ReactNode }) {
  const styles = {
    warning: 'bg-amber-950/60 border-amber-700 text-amber-200',
    info:    'bg-blue-950/60 border-blue-700 text-blue-200',
  };
  return (
    <div className={`border rounded-lg px-3 py-2 text-xs ${styles[type]}`}>
      {children}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-700 text-white text-xs flex items-center justify-center font-bold mt-0.5">
        {n}
      </span>
      <div>
        <div className="font-semibold text-white mb-0.5">{title}</div>
        <div className="text-gray-400 text-xs">{children}</div>
      </div>
    </li>
  );
}

function MapLegendItem({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className={`w-3 h-3 rounded mt-0.5 flex-shrink-0 ${color}`} />
      <div>
        <div className="text-white font-semibold">{label}</div>
        <div className="text-gray-500">{desc}</div>
      </div>
    </div>
  );
}

function LightRow({ color, label, children }: { color: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-gray-800 rounded-lg p-3">
      <span className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${color}`} />
      <div>
        <div className="text-white font-semibold text-xs mb-0.5">{label}</div>
        <div className="text-gray-400 text-xs">{children}</div>
      </div>
    </div>
  );
}

function IncidentRow({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex-shrink-0 w-5 text-center">{icon}</span>
      <div>
        <span className="text-gray-200 font-semibold">{name}: </span>
        <span className="text-gray-400">{desc}</span>
      </div>
    </div>
  );
}
