import React, { useMemo } from 'react';
import { KPIRow } from '../components/KPIRow';
import { HospitalCanvas } from '../components/3d/HospitalCanvas';
import { RoomInspector } from '../components/inspector/RoomInspector';
import { QueueBarChart } from '../components/charts/QueueBarChart';
import { AlertsPanel } from '../components/alerts/AlertsPanel';
import { KPICardData, QueueLocationData, AlertItem, RoomData } from '../types/hospital';

interface MonitoringViewProps {
  kpis: KPICardData[];
  selectedFloor: string;
  onSelectFloor: (floor: string) => void;
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  roomDetails?: any;
  queueLocations: QueueLocationData[];
  alerts: AlertItem[];
  rooms?: RoomData[];
  onOpenAI: (roomId: string) => void;
  clockTime?: string;
}

export const MonitoringView: React.FC<MonitoringViewProps> = ({
  kpis,
  selectedFloor,
  onSelectFloor,
  selectedRoomId,
  onSelectRoom,
  roomDetails,
  queueLocations,
  alerts,
  rooms,
  onOpenAI,
  clockTime,
}) => {

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Giám sát ngoại trú
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Theo dõi vận hành · Dữ liệu tổng hợp • Tầng đang xem: <strong className="text-blue-700">{selectedFloor === 'All' ? 'Tất cả các tầng' : `Tầng ${selectedFloor}`}</strong>
          </p>
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center space-x-2">
          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
            Phạm vi: {selectedFloor === 'All' ? 'Toàn tòa nhà' : `Khu vực Tầng ${selectedFloor}`}
          </span>
        </div>
      </div>

      {/* 1. Top 4 KPI Cards */}
      <KPIRow kpis={kpis} />

      {/* 2. Middle Row: 3D Hospital Canvas + Right Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 3D Canvas */}
        <div className="lg:col-span-8 xl:col-span-8">
          <HospitalCanvas
            selectedFloor={selectedFloor}
            onSelectFloor={onSelectFloor}
            selectedRoomId={selectedRoomId}
            onSelectRoom={onSelectRoom}
            rooms={rooms}
          />
        </div>

        {/* Right Location Inspector Panel */}
        <div className="lg:col-span-4 xl:col-span-4 flex">
          <RoomInspector
            roomId={selectedRoomId}
            roomDetails={roomDetails}
            onOpenAI={onOpenAI}
            clockTime={clockTime}
          />
        </div>
      </div>

      {/* 3. Bottom Row: Queue by Location + Operational Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Queue by Location Horizontal Bars */}
        <div className="lg:col-span-7 xl:col-span-7">
          <QueueBarChart
            locations={queueLocations}
            onSelectLocation={onSelectRoom}
          />
        </div>

        {/* Right: Operational Alerts List */}
        <div className="lg:col-span-5 xl:col-span-5">
          <AlertsPanel
            alerts={alerts}
            onSelectAlert={onSelectRoom}
            onOpenAI={onOpenAI}
          />
        </div>
      </div>
    </div>
  );
};
