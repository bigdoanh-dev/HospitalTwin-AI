import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  RotateCcw,
  Maximize2,
  Layers,
  Compass,
  Camera,
  Video,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';
import { RoomData } from '../../types/hospital';

interface HospitalCanvasProps {
  selectedFloor: string; // 'All', '3F', '2F', '1F', 'B1'
  onSelectFloor: (floor: string) => void;
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  rooms?: RoomData[];
}

// Check prefers-reduced-motion
function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Flow Particle moving along CatmullRomCurve3
function FlowParticle({
  curve,
  speed = 0.12,
  offset = 0,
  color = "#0284c7"
}: {
  curve: THREE.CatmullRomCurve3;
  speed?: number;
  offset?: number;
  color?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const reduced = isReducedMotion();

  useFrame(({ clock }) => {
    if (!meshRef.current || reduced) return;
    const t = ((clock.getElapsedTime() * speed + offset) % 1 + 1) % 1;
    const point = curve.getPointAt(t);
    meshRef.current.position.copy(point);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.26, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
    </mesh>
  );
}

// Comprehensive Patient Flow: Forward Path & Distinct Purple Return Path
function DynamicPatientFlows({ rooms }: { rooms: any[] }) {
  const roomMap = useMemo(() => {
    const map = new Map<string, any>();
    rooms.forEach((r) => map.set(r.id, r));
    return map;
  }, [rooms]);

  // Find exact room positions from API
  const getPos = useCallback((id: string, fallback: [number, number, number]) => {
    const rm = roomMap.get(id);
    if (rm) return new THREE.Vector3(rm.x, 0.4, rm.z);
    return new THREE.Vector3(...fallback);
  }, [roomMap]);

  // Forward route: Registration -> Insurance -> Consultation -> Lab -> Results
  const forwardPoints = useMemo(() => {
    return [
      getPos('ROOM-REC-101', [-18, 0.4, 14]),   // Tiếp đón & Đăng ký
      getPos('ROOM-INS-101', [-20, 0.4, -15]),  // Xác thực BHYT
      getPos('ROOM-WAIT-101', [-4, 0.4, 6]),    // Khu chờ sảnh chính
      getPos('ROOM-EXAM-101', [6, 0.4, -4]),    // Khám bác sĩ
      getPos('ROOM-LAB-101', [18, 0.4, 10]),    // Lấy mẫu xét nghiệm
      getPos('ROOM-RES-101', [22, 0.4, -4]),    // Chờ & Trả kết quả
    ];
  }, [getPos]);

  // Return route (Distinct Purple): Results -> RETURN Consultation -> Payment -> Pharmacy
  const returnPoints = useMemo(() => {
    return [
      getPos('ROOM-RES-101', [22, 0.4, -4]),    // Có kết quả xét nghiệm
      getPos('ROOM-EXAM-101', [6, 0.4, -4]),    // Bác sĩ kết luận & kê đơn (TÁI KHÁM)
      getPos('ROOM-PAY-101', [-2, 0.4, -14]),   // Thanh toán viện phí
      getPos('ROOM-PHAR-101', [18, 0.4, -16]),  // Cấp phát thuốc
    ];
  }, [getPos]);

  const forwardCurve = useMemo(() => new THREE.CatmullRomCurve3(forwardPoints, false, 'catmullrom', 0.2), [forwardPoints]);
  const forwardTube = useMemo(() => new THREE.TubeGeometry(forwardCurve, 70, 0.08, 8, false), [forwardCurve]);

  const returnCurve = useMemo(() => new THREE.CatmullRomCurve3(returnPoints, false, 'catmullrom', 0.2), [returnPoints]);
  const returnTube = useMemo(() => new THREE.TubeGeometry(returnCurve, 60, 0.09, 8, false), [returnCurve]);

  return (
    <group>
      {/* Forward Path (Vibrant Royal Blue) */}
      <mesh geometry={forwardTube}>
        <meshBasicMaterial color="#0284c7" opacity={0.65} transparent />
      </mesh>
      {[0, 0.25, 0.5, 0.75].map((offset, idx) => (
        <FlowParticle key={`fwd-${idx}`} curve={forwardCurve} speed={0.10} offset={offset} color="#0ea5e9" />
      ))}

      {/* Return Path (Distinct Purple/Violet as specified in Review) */}
      <mesh geometry={returnTube}>
        <meshBasicMaterial color="#9333ea" opacity={0.75} transparent />
      </mesh>
      {[0, 0.33, 0.66].map((offset, idx) => (
        <FlowParticle key={`ret-${idx}`} curve={returnCurve} speed={0.09} offset={offset} color="#c084fc" />
      ))}
    </group>
  );
}

// 3D Individual Counter Desk & Chair
function CounterDesk({ position, width = 1.0 }: { position: [number, number, number]; width?: number }) {
  return (
    <group position={position}>
      {/* Desk surface */}
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[width, 0.76, 0.55]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
      </mesh>
      {/* Computer monitor */}
      <mesh position={[0, 0.85, -0.1]}>
        <boxGeometry args={[0.4, 0.28, 0.04]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {/* Counter front modesty panel */}
      <mesh position={[0, 0.38, 0.28]}>
        <boxGeometry args={[width, 0.76, 0.04]} />
        <meshStandardMaterial color="#0284c7" />
      </mesh>
      {/* Staff Chair */}
      <mesh position={[0, 0.25, -0.42]}>
        <cylinderGeometry args={[0.18, 0.18, 0.5, 12]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
    </group>
  );
}

// Human Silhouette Avatar in 3D
function HumanSilhouette({ position, color = "#64748b" }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      {/* Torso */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.6, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  );
}

// 3D Room Cutaway Component using API dimensions and room.counters
function RoomCutaway({
  room,
  floorY = 0,
  isSelected = false,
  onSelect,
}: {
  room: any;
  floorY?: number;
  isSelected?: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const {
    x = 0,
    z = 0,
    width = 10,
    length = 8,
    id,
    name,
    status,
    current_queue_length = 0,
    room_type,
    counters = 0,
    cameras = []
  } = room;

  // Queue threshold: Red > 50, Amber > 20, Normal blue/teal
  const isCongested = status === 'congested' || current_queue_length > 50;
  const isElevated = current_queue_length > 20 && !isCongested;

  const heatColor = useMemo(() => {
    if (isCongested) return '#ef4444'; // Red > 50
    if (isElevated) return '#f59e0b';  // Amber > 20
    if (room_type === 'imaging') return '#6366f1'; // Indigo
    if (room_type === 'laboratory') return '#0284c7'; // Blue
    if (room_type === 'technical' || room_type === 'storage') return '#94a3b8'; // Cool gray
    return '#0ea5e9'; // Teal / Sky
  }, [isCongested, isElevated, room_type]);

  const wallHeight = 1.15;
  const wallThick = 0.22;

  // Calculate individual counter desk layout based on room.counters from API
  const counterPositions = useMemo(() => {
    if (!counters || counters <= 0) return [];
    const count = Math.min(counters, 8);
    const usableWidth = width - 2.0;
    const spacing = usableWidth / count;
    const startX = -usableWidth / 2 + spacing / 2;

    const list: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      list.push([startX + i * spacing, 0, length * 0.15]);
    }
    return list;
  }, [counters, width, length]);

  return (
    <group position={[x, floorY, z]}>
      {/* Clickable Floor Plate for this room */}
      <mesh
        position={[0, 0.02, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[width - 0.15, 0.05, length - 0.15]} />
        <meshStandardMaterial
          color={isSelected ? '#e0f2fe' : hovered ? '#f8fafc' : '#ffffff'}
          roughness={0.3}
        />
      </mesh>

      {/* Selected room floor glow border */}
      {isSelected && (
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[width + 0.1, 0.02, length + 0.1]} />
          <meshBasicMaterial color="#0284c7" wireframe />
        </mesh>
      )}

      {/* Light cutaway walls matching hospital concept (White/Cool Gray) */}
      {/* North Wall */}
      <mesh position={[0, wallHeight / 2, -length / 2]}>
        <boxGeometry args={[width, wallHeight, wallThick]} />
        <meshStandardMaterial color={isSelected ? '#38bdf8' : isCongested ? '#fca5a5' : '#e2e8f0'} roughness={0.5} />
      </mesh>
      {/* East Wall */}
      <mesh position={[width / 2, wallHeight / 2, 0]}>
        <boxGeometry args={[wallThick, wallHeight, length]} />
        <meshStandardMaterial color={isSelected ? '#38bdf8' : isCongested ? '#fca5a5' : '#e2e8f0'} roughness={0.5} />
      </mesh>
      {/* West Wall */}
      <mesh position={[-width / 2, wallHeight / 2, 0]}>
        <boxGeometry args={[wallThick, wallHeight, length]} />
        <meshStandardMaterial color={isSelected ? '#38bdf8' : isCongested ? '#fca5a5' : '#e2e8f0'} roughness={0.5} />
      </mesh>
      {/* South Wall with Entrance Opening */}
      <mesh position={[-width / 3.2, wallHeight / 2, length / 2]}>
        <boxGeometry args={[width / 3, wallHeight, wallThick]} />
        <meshStandardMaterial color={isSelected ? '#38bdf8' : isCongested ? '#fca5a5' : '#e2e8f0'} roughness={0.5} />
      </mesh>
      <mesh position={[width / 3.2, wallHeight / 2, length / 2]}>
        <boxGeometry args={[width / 3, wallHeight, wallThick]} />
        <meshStandardMaterial color={isSelected ? '#38bdf8' : isCongested ? '#fca5a5' : '#e2e8f0'} roughness={0.5} />
      </mesh>

      {/* Individual Counters from API room.counters */}
      {counterPositions.map((cPos, idx) => (
        <CounterDesk key={idx} position={cPos} width={Math.min(1.2, (width - 2) / counters - 0.2)} />
      ))}

      {/* Specific Furniture Archetypes */}
      {/* CT Scanner Torus Gantry (Imaging) */}
      {id === 'ROOM-IMG-302' && (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 1.4, -0.8]}>
            <torusGeometry args={[1.2, 0.36, 16, 32]} />
            <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.45, 0.8]}>
            <boxGeometry args={[1.0, 0.8, 3.0]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
        </group>
      )}

      {/* X-Ray Equipment */}
      {id === 'ROOM-IMG-301' && (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 1.8, -1]}>
            <cylinderGeometry args={[0.2, 0.25, 0.6, 12]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[0, 0.9, -1.8]}>
            <boxGeometry args={[0.9, 1.6, 0.15]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
        </group>
      )}

      {/* Waiting Area: Rows of Chairs + Human Silhouettes */}
      {room_type === 'waiting' && (
        <group position={[0, 0, 0]}>
          {[-1.8, 0, 1.8].map((pz, idx) => (
            <group key={idx} position={[0, 0, pz]}>
              <mesh position={[0, 0.22, 0]}>
                <boxGeometry args={[width * 0.7, 0.38, 0.6]} />
                <meshStandardMaterial color="#cbd5e1" />
              </mesh>
              {/* Human avatars sitting */}
              {[-1.5, 0, 1.5].map((hx, hIdx) => (
                <HumanSilhouette key={hIdx} position={[hx, 0.1, 0]} color="#64748b" />
              ))}
            </group>
          ))}
        </group>
      )}

      {/* Pharmacy medicine shelving racks */}
      {room_type === 'pharmacy' && (
        <group position={[0, 0, -length / 3]}>
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[width * 0.8, 1.8, 0.4]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
        </group>
      )}

      {/* 3D Floating HTML Room Label with Camera Badge */}
      <Html position={[0, wallHeight + 0.8, 0]} center distanceFactor={40}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`cursor-pointer px-2.5 py-1 rounded-xl text-[10px] font-bold shadow-sm transition-all whitespace-nowrap select-none flex items-center space-x-1.5 ${
            isSelected
              ? 'bg-blue-600 text-white ring-2 ring-blue-300 scale-105'
              : isCongested
              ? 'bg-red-600 text-white animate-pulse'
              : isElevated
              ? 'bg-amber-500 text-white'
              : 'bg-white/95 text-slate-800 border border-slate-200 hover:bg-blue-50'
          }`}
          title={`Phòng: ${name} (${id}) - Nhấn để chọn`}
        >
          <span className={`w-2 h-2 rounded-full ${isCongested ? 'bg-white' : heatColor === '#ef4444' ? 'bg-red-500' : heatColor === '#f59e0b' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
          <span>{name}</span>

          {/* Camera Marker Icon if camera exists */}
          {cameras && cameras.length > 0 && (
            <span className="p-0.5 rounded bg-blue-100 text-blue-800" title={`Có camera: ${cameras.join(', ')}`}>
              <Camera className="w-2.5 h-2.5" />
            </span>
          )}

          {current_queue_length > 0 && (
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
              isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {current_queue_length}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

// Stylized Courtyard Garden at (0, 0)
function CentralCourtyardAtrium() {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[14, 0.24, 10]} />
        <meshStandardMaterial color="#f1f5f9" />
      </mesh>
      {/* Green grass lawn */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[13.2, 0.04, 9.2]} />
        <meshStandardMaterial color="#16a34a" roughness={0.8} />
      </mesh>

      {/* 4 stylized trees */}
      {[[-4, 0, -2.5], [4, 0, -2.5], [-4, 0, 2.5], [4, 0, 2.5]].map((pos, idx) => (
        <group key={idx} position={pos as [number, number, number]}>
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.12, 0.18, 1.2, 8]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <dodecahedronGeometry args={[0.8, 1]} />
            <meshStandardMaterial color="#22c55e" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Camera fit & controller
function CameraController({ resetKey, isTopView }: { resetKey: number; isTopView: boolean }) {
  const { camera } = useThree();

  useEffect(() => {
    if (isTopView) {
      camera.position.set(0, 56, 0.1);
      camera.lookAt(0, 0, 0);
    } else {
      // Perspective cutaway fitting building comfortably
      camera.position.set(30, 36, 42);
      camera.lookAt(0, 1, 0);
    }
  }, [resetKey, isTopView, camera]);

  return null;
}

export const HospitalCanvas: React.FC<HospitalCanvasProps> = ({
  selectedFloor,
  onSelectFloor,
  selectedRoomId,
  onSelectRoom,
  rooms: propRooms,
}) => {
  const [buildingData, setBuildingData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [webglError, setWebglError] = useState(false);

  // View state
  const [resetKey, setResetKey] = useState(0);
  const [isTopView, setIsTopView] = useState(false);

  // Fetch building spatial data from API
  const fetchBuilding = useCallback(async () => {
    try {
      const data = await api.getBuilding();
      setBuildingData(data);
    } catch (err: any) {
      console.warn('Hospital spatial data load:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchBuilding();

    // Poll building every 8s AND listen for hospital:data-changed event
    const interval = setInterval(fetchBuilding, 8000);
    const handleDataChanged = () => fetchBuilding();
    window.addEventListener('hospital:data-changed', handleDataChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener('hospital:data-changed', handleDataChanged);
    };
  }, [fetchBuilding]);

  const floors = buildingData?.floors || [];

  // Determine floors to render based on selectedFloor
  // 'All' renders Exploded Multi-Floor View (B1: y=-5, 1F: y=0, 2F: y=7, 3F: y=14)
  const isExploded = selectedFloor === 'All';

  const floorsToRender = useMemo(() => {
    if (!floors.length) return [];
    if (isExploded) {
      return floors.map((f: any) => {
        let y = 0;
        if (f.id === 'FL-B1') y = -5;
        if (f.id === 'FL-1F') y = 0;
        if (f.id === 'FL-2F') y = 7;
        if (f.id === 'FL-3F') y = 14;
        return { ...f, renderElevation: y };
      });
    }

    const targetId = selectedFloor === 'B1' ? 'FL-B1' : `FL-${selectedFloor}`;
    const found = floors.find((f: any) => f.id === targetId || f.name.includes(selectedFloor));
    if (found) {
      return [{ ...found, renderElevation: 0 }];
    }
    // Default fallback to 1F
    return [{ ...(floors[1] || floors[0]), renderElevation: 0 }];
  }, [floors, selectedFloor, isExploded]);

  // Current floor's rooms for dynamic flows
  const activeRooms = useMemo(() => {
    const f = floorsToRender.find((fl: any) => fl.id === 'FL-1F');
    return f ? f.rooms || [] : [];
  }, [floorsToRender]);

  return (
    <div className="relative w-full h-full min-h-[460px] lg:min-h-[540px] bg-slate-100 rounded-2xl overflow-hidden shadow-xs border border-slate-200">
      {/* 1. Floor Selector Ribbon (All, 3F, 2F, 1F, B1) */}
      <div className="absolute top-3 left-3 z-10 flex items-center bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-200 shadow-sm">
        {['All', '3F', '2F', '1F', 'B1'].map((floor) => {
          const isSelected = selectedFloor === floor;
          return (
            <button
              key={floor}
              onClick={() => onSelectFloor(floor)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {floor === 'All' ? 'Tất cả (Nổ tầng)' : floor}
            </button>
          );
        })}
      </div>

      {/* 2. Top-right Controls (Reset, 2D Top-down toggle) */}
      <div className="absolute top-3 right-3 z-10 flex items-center space-x-2">
        <button
          onClick={() => setIsTopView(!isTopView)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-colors shadow-sm flex items-center space-x-1.5 ${
            isTopView
              ? 'bg-blue-600 text-white border-blue-500'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          title="Chuyển chế độ nhìn 2D từ trên xuống"
          aria-label="Chuyển chế độ nhìn 2D"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{isTopView ? 'Góc nhìn 2D' : 'Góc nhìn 3D'}</span>
        </button>

        <button
          onClick={() => {
            setIsTopView(false);
            setResetKey((k) => k + 1);
          }}
          className="p-2 rounded-xl bg-white/95 hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-colors"
          title="Đặt lại góc nhìn camera"
          aria-label="Đặt lại góc nhìn camera"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Bottom Legend Indicator with Dynamic Threshold Labels */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center space-x-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] text-slate-700 shadow-sm">
        <span className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
          <span>Quá tải (&gt; 50 người)</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Tăng cao (&gt; 20 người)</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span>Bình thường</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          <span>Luồng tái khám</span>
        </span>
      </div>

      {/* 4. 3D R3F Canvas Viewport with LIGHT WHITE / COOL GRAY Canvas Theme */}
      {!webglError ? (
        <Canvas
          shadows={false}
          camera={{ position: [30, 36, 42], fov: 42 }}
          onCreated={({ gl }) => {
            gl.setClearColor('#f1f5f9'); // Light cool gray background matching hospital concept
          }}
          onError={() => setWebglError(true)}
        >
          <CameraController resetKey={resetKey} isTopView={isTopView} />

          {/* Light Architectural Lighting matching hospital concept */}
          <ambientLight intensity={1.1} />
          <directionalLight position={[25, 40, 25]} intensity={1.3} />
          <directionalLight position={[-25, 20, -20]} intensity={0.5} color="#e0f2fe" />

          {/* Orbit Controls */}
          <OrbitControls
            enableDamping
            dampingFactor={0.06}
            maxPolarAngle={isTopView ? 0.01 : Math.PI / 2.1}
            minDistance={15}
            maxDistance={90}
          />

          {/* Multi-Floor Rendering */}
          <group>
            {floorsToRender.map((floor: any) => {
              const y = floor.renderElevation ?? 0;
              const is1F = floor.id === 'FL-1F';

              return (
                <group key={floor.id} position={[0, y, 0]}>
                  {/* Clean White Architectural Floor Slab Base */}
                  <mesh position={[0, -0.15, 0]}>
                    <boxGeometry args={[58, 0.3, 44]} />
                    <meshStandardMaterial
                      color={isExploded ? "#ffffff" : "#ffffff"}
                      opacity={isExploded ? 0.85 : 1.0}
                      transparent={isExploded}
                      roughness={0.2}
                    />
                  </mesh>

                  {/* Floor Grid Lines (Soft Cool Gray #cbd5e1) */}
                  <gridHelper
                    args={[56, 28, '#94a3b8', '#e2e8f0']}
                    position={[0, 0.01, 0]}
                  />

                  {/* Central Courtyard Atrium for 1F */}
                  {is1F && <CentralCourtyardAtrium />}

                  {/* Dynamic Patient Forward & Return Flow Tubes for 1F */}
                  {is1F && activeRooms.length > 0 && <DynamicPatientFlows rooms={activeRooms} />}

                  {/* Elevator Vertical Core (dynamically positioned at elevator room x/z from API) */}
                  {(() => {
                    const elevRoom = floor.rooms?.find((r: any) => r.id.includes('ELEV') || r.room_type === 'elevator');
                    const elevX = elevRoom?.x ?? 22.0;
                    const elevZ = elevRoom?.z ?? 0.0;
                    return (
                      <mesh position={[elevX, 1.8, elevZ]}>
                        <boxGeometry args={[4.2, isExploded ? 6.2 : 3.6, 4.2]} />
                        <meshStandardMaterial color="#94a3b8" opacity={0.6} transparent roughness={0.3} />
                      </mesh>
                    );
                  })()}

                  {/* Rooms on this Floor from API */}
                  {floor.rooms?.map((rm: any) => (
                    <RoomCutaway
                      key={rm.id}
                      room={rm}
                      floorY={0}
                      isSelected={selectedRoomId === rm.id}
                      onSelect={() => onSelectRoom(rm.id)}
                    />
                  ))}
                </group>
              );
            })}
          </group>
        </Canvas>
      ) : (
        /* 2D Architectural Fallback */
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-slate-700 text-xs space-y-3 bg-white">
          <Info className="w-8 h-8 text-blue-600" />
          <h3 className="text-sm font-bold">Chế độ hiển thị 2D Sơ đồ Mặt bằng</h3>
          <p className="text-slate-500 text-center max-w-md">
            WebGL không khả dụng trên trình duyệt hiện tại. Đang chuyển sang chế độ sơ đồ không gian 2D tương tác.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
            {floorsToRender[0]?.rooms?.map((rm: any) => (
              <button
                key={rm.id}
                onClick={() => onSelectRoom(rm.id)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  selectedRoomId === rm.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="font-bold">{rm.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">{rm.id}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
