import React, { useState } from 'react';
import { HospitalCanvas } from '../components/3d/HospitalCanvas';
import { RoomInspector } from '../components/inspector/RoomInspector';
import { Compass, Navigation, MapPin, Layers, Info } from 'lucide-react';
import { api } from '../services/api';
import { RoomData } from '../types/hospital';

export const DigitalTwinView: React.FC<{
  selectedFloor: string;
  onSelectFloor: (fl: string) => void;
  selectedRoomId: string;
  onSelectRoom: (id: string) => void;
  roomDetails?: any;
  rooms?: RoomData[];
  onOpenAI: (id: string) => void;
}> = ({
  selectedFloor,
  onSelectFloor,
  selectedRoomId,
  onSelectRoom,
  roomDetails,
  rooms,
  onOpenAI,
}) => {
  const [routeFrom, setRouteFrom] = useState('ROOM-REC-101');
  const [routeTo, setRouteTo] = useState('ROOM-LAB-101');
  const [showRouting, setShowRouting] = useState(false);

  const [route, setRoute] = useState<any>(null);
  const [routeError, setRouteError] = useState('');
  const calculateRoute = async () => {
    setRouteError(''); setRoute(null); setShowRouting(true);
    try { setRoute(await api.getRoute(routeFrom, routeTo)); } catch (err: any) { setRouteError(err.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Hospital Digital Twin 3D
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Không gian số bệnh viện đa tầng — Định vị không gian và điều hướng luồng người bệnh
          </p>
        </div>

        {/* Spatial Routing Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-2xs">
          <Navigation className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-slate-500">Từ:</span>
          <select
            value={routeFrom}
            onChange={(e) => setRouteFrom(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-medium"
          >
            <option value="ROOM-REC-101">Đăng ký khám (1F)</option>
            <option value="ROOM-EXAM-101">Phòng khám Nội 1 (1F)</option>
            <option value="ROOM-WAIT-101">Khu chờ khám (1F)</option>
          </select>

          <span className="text-slate-500">&rarr; Đến:</span>
          <select
            value={routeTo}
            onChange={(e) => setRouteTo(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-medium"
          >
            <option value="ROOM-LAB-101">Lấy mẫu xét nghiệm (1F)</option>
            <option value="ROOM-IMG-302">Chụp CT Scanner (3F)</option>
            <option value="ROOM-PHAR-101">Nhà thuốc (1F)</option>
          </select>

          <button
            onClick={calculateRoute}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1 rounded-md transition-colors"
          >
            Tìm đường
          </button>
        </div>
      </div>

      {showRouting && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-blue-600" />
            <span>
              {routeError || (!route ? 'Đang tính lộ trình…' : <><strong>Lộ trình minh họa:</strong> {route.nodes.map((id: string) => rooms?.find(r => r.id === id)?.name || (id.startsWith('CORRIDOR') ? 'Hành lang / thang máy' : id)).join(' → ')}. Khoảng cách <strong>{route.distance_m} m</strong>, dự kiến <strong>{route.travel_minutes} phút</strong>. Tốc độ giả định 1 m/s; chưa phản ánh thời gian chờ thang máy.</>)}
            </span>
          </div>
          <button
            onClick={() => setShowRouting(false)}
            className="text-blue-500 hover:text-blue-800 font-bold ml-2"
          >
            &times;
          </button>
        </div>
      )}

      {/* 3D Viewport with Side Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 xl:col-span-8">
          <HospitalCanvas
            selectedFloor={selectedFloor}
            onSelectFloor={onSelectFloor}
            selectedRoomId={selectedRoomId}
            onSelectRoom={onSelectRoom}
            rooms={rooms}
          />
        </div>
        <div className="lg:col-span-4 xl:col-span-4 flex">
          <RoomInspector
            roomId={selectedRoomId}
            roomDetails={roomDetails}
            onOpenAI={onOpenAI}
          />
        </div>
      </div>
    </div>
  );
};
