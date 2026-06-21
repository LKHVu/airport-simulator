// Đặc tính từng loại tàu bay — ảnh hưởng trực tiếp tới mô phỏng:
//  - speedFactor : hệ số nhân tốc độ lăn (thân rộng lăn chậm hơn để đảm bảo tĩnh không)
//  - maxTaxiKts  : trần tốc độ lăn của loại tàu bay (kts)
//  - sizeScale   : tỉ lệ kích thước biểu tượng trên bản đồ (theo sải cánh)
//  - category    : nhãn nhóm hiển thị

import type { AircraftType } from '../types';

export interface AircraftSpec {
  speedFactor: number;
  maxTaxiKts: number;
  sizeScale: number;
  category: string;
}

export const AIRCRAFT_SPECS: Record<AircraftType, AircraftSpec> = {
  // Thân hẹp tiêu chuẩn — chuẩn tham chiếu.
  A321:  { speedFactor: 1.0,  maxTaxiKts: 30, sizeScale: 1.0,  category: 'Thân hẹp' },
  // Thân hẹp, nhanh nhẹn hơn một chút, nhỏ hơn A321.
  B737:  { speedFactor: 1.05, maxTaxiKts: 30, sizeScale: 0.92, category: 'Thân hẹp' },
  // Thân rộng — lăn chậm hơn, biểu tượng lớn hơn nhiều.
  A350:  { speedFactor: 0.82, maxTaxiKts: 25, sizeScale: 1.45, category: 'Thân rộng' },
  // Turboprop — nhẹ, kích thước nhỏ, tốc độ lăn thấp.
  ATR72: { speedFactor: 0.9,  maxTaxiKts: 22, sizeScale: 0.65, category: 'Turboprop' },
};

export function getAircraftSpec(type: AircraftType): AircraftSpec {
  return AIRCRAFT_SPECS[type] ?? AIRCRAFT_SPECS.A321;
}
