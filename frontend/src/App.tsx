import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { LockKeyhole, RefreshCw } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MonitoringView } from './views/MonitoringView';
import { OverviewView } from './views/OverviewView';
import { DigitalTwinView } from './views/DigitalTwinView';
import { CameraView } from './views/CameraView';
import { OperationsView } from './views/OperationsView';
import { ProcessView } from './views/ProcessView';
import { SimulationView } from './views/SimulationView';
import { AIAssistantView } from './views/AIAssistantView';
import { InterventionsView } from './views/InterventionsView';
import { AdaptiveView } from './views/AdaptiveView';
import { AdminView } from './views/AdminView';
import { PatientPortalView } from './views/PatientPortalView';
import { Toast } from './components/common/Toast';
import { api } from './services/api';
import { ModuleType, UserProfile, KPICardData, QueueLocationData, AlertItem, RoomData, CameraData } from './types/hospital';

const access: Partial<Record<ModuleType, string[]>> = {
  camera: ['admin', 'operator', 'director', 'camera_operator', 'department_manager'],
  operations: ['admin', 'operator', 'receptionist', 'doctor', 'lab_staff', 'department_manager', 'cashier', 'pharmacy_staff'],
  process: ['admin', 'operator', 'analyst', 'director', 'department_manager'],
  simulation: ['admin', 'operator', 'analyst', 'director', 'department_manager'],
  ai: ['admin', 'operator', 'analyst', 'director', 'department_manager'],
  interventions: ['admin', 'operator', 'analyst', 'director', 'department_manager', 'lab_staff', 'maintenance'],
  adaptive: ['admin', 'operator', 'director', 'analyst', 'department_manager', 'maintenance'],
  admin: ['admin'], patient: ['patient'],
};
// Keep StrictMode's initial mount from creating two demo sessions.
let bootstrapAuth: Promise<UserProfile> | null = null;
function authenticate() {
  if (!bootstrapAuth) bootstrapAuth = (api.getToken() ? api.getMe().catch(() => api.login().then(x => x.user)) : api.login().then(x => x.user))
    .finally(() => { bootstrapAuth = null; });
  return bootstrapAuth;
}
const floorCode = (id: string) => id.replace('FL-', '');

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleType>('monitoring');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('1F');
  const [selectedRoomId, setSelectedRoomId] = useState('ROOM-LAB-101');
  const [roomDetails, setRoomDetails] = useState<any>(null);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [kpis, setKpis] = useState<KPICardData[]>([]);
  const [globalKpis, setGlobalKpis] = useState<KPICardData[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [queueLocations, setQueueLocations] = useState<QueueLocationData[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [clockTime, setClockTime] = useState('');
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [simScenarioVersionId, setSimScenarioVersionId] = useState<string>();
  const [aiTargetRoom, setAiTargetRoom] = useState('ROOM-LAB-101');
  const [toast, setToast] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);
  const sequence = useRef(0);
  const reduced = useReducedMotion();
  const showToast = (type: 'error' | 'success' | 'info', message: string) => setToast({ type, message });
  const role = currentUser?.role || '';
  const isPatient = role === 'patient';
  const canClock = ['admin', 'operator'].includes(role);
  const cameraAllowed = access.camera!.includes(role);
  const clockReadable = ['admin', 'operator', 'director', 'analyst', 'department_manager', 'maintenance'].includes(role);

  const loadStaffData = useCallback(async () => {
    if (!currentUser || currentUser.role === 'patient') return;
    const serial = ++sequence.current;
    const results = await Promise.allSettled([
      api.getOverview(selectedFloor), api.getOverview(), api.getQueueByLocation(selectedFloor),
      api.getAlerts(selectedFloor), api.getBuilding(), api.getRoomDetails(selectedRoomId),
      cameraAllowed ? api.listCameras() : Promise.resolve([]),
      clockReadable ? api.getDemoState() : Promise.resolve(null),
    ]);
    if (serial !== sequence.current) return;
    const value = (i: number): any => results[i].status === 'fulfilled' ? (results[i] as PromiseFulfilledResult<any>).value : undefined;
    if (value(0)) setKpis(value(0).kpis);
    if (value(1)) { setGlobalKpis(value(1).kpis); setSummary(value(1).summary); setClockTime(value(1).measured_at); }
    if (value(2)) setQueueLocations(value(2));
    if (value(3)) setAlerts(value(3));
    if (value(4)) setRooms(value(4).floors.flatMap((f: any) => f.rooms.map((r: any) => ({ ...r, floor_id: f.id }))));
    if (value(5)) setRoomDetails(value(5));
    if (value(6)) setCameras(value(6));
    if (value(7)) { setClockTime(value(7).now); setIsClockRunning(value(7).running); }
    const failure = results.slice(0, 6).find(x => x.status === 'rejected');
    if (failure?.status === 'rejected') showToast('error', failure.reason.message);
  }, [currentUser, selectedFloor, selectedRoomId, cameraAllowed, clockReadable]);

  const init = useCallback(async () => {
    setAuthError('');
    try {
      const user = await authenticate();
      setCurrentUser(user);
      if (user.role === 'patient') setActiveModule('patient');
    } catch (err: any) { setAuthError(err.message); }
  }, []);
  useEffect(() => { void init(); }, [init]);
  useEffect(() => {
    void loadStaffData();
    const refresh = () => { if (!document.hidden) void loadStaffData(); };
    const expired = () => { setCurrentUser(null); setAuthError('Phiên demo đã hết hạn. Đăng nhập lại để tiếp tục.'); };
    window.addEventListener('hospital:data-changed', refresh);
    window.addEventListener('hospital:session-expired', expired);
    const poll = window.setInterval(refresh, 12000);
    return () => { ++sequence.current; clearInterval(poll); window.removeEventListener('hospital:data-changed', refresh); window.removeEventListener('hospital:session-expired', expired); };
  }, [loadStaffData]);
  useEffect(() => {
    if (!isClockRunning || !canClock) return;
    let busy = false;
    const timer = window.setInterval(async () => {
      if (busy || document.hidden) return;
      busy = true;
      try { await api.tickClock(1); } catch (err: any) { setIsClockRunning(false); showToast('error', err.message); } finally { busy = false; }
    }, 5000);
    return () => clearInterval(timer);
  }, [isClockRunning, canClock]);

  const selectFloor = (floor: string) => {
    setSelectedFloor(floor); setRoomDetails(null); setKpis([]); setQueueLocations([]); setAlerts([]);
    if (floor !== 'All' && floorCode(rooms.find(r => r.id === selectedRoomId)?.floor_id || '') !== floor) {
      setSelectedRoomId(rooms.find(r => floorCode(r.floor_id) === floor)?.id || '');
    }
  };
  const selectRoom = (id: string) => {
    setRoomDetails(null); setSelectedRoomId(id);
    const room = rooms.find(r => r.id === id);
    if (room && selectedFloor !== 'All') setSelectedFloor(floorCode(room.floor_id));
  };
  const switchRole = async (next: string) => {
    try {
      const auth = await api.switchRole(next); ++sequence.current;
      setKpis([]); setGlobalKpis([]); setRooms([]); setQueueLocations([]); setAlerts([]); setCameras([]); setRoomDetails(null);
      setCurrentUser(auth.user); setIsClockRunning(false);
      if (next === 'patient') setActiveModule('patient');
      else if (activeModule === 'patient') setActiveModule('monitoring');
      showToast('info', `Đã chuyển vai trò demo: ${auth.user.full_name}`);
    } catch (err: any) { showToast('error', err.message); }
  };
  const navigate = (module: ModuleType) => { setActiveModule(module); setIsMobileSidebarOpen(false); };
  const openAI = (id: string) => { setAiTargetRoom(id); navigate('ai'); };
  const openSimulation = (version?: string) => { setSimScenarioVersionId(version); navigate('simulation'); };
  const clockAction = async (minutes?: number) => {
    try { if (minutes) await api.tickClock(minutes); else await api.setClock(!isClockRunning); } catch (err: any) { showToast('error', err.message); }
  };
  const allowed = isPatient ? activeModule === 'patient' : !access[activeModule] || access[activeModule]!.includes(role);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <Sidebar activeModule={activeModule} onSelectModule={navigate} currentUser={currentUser} isOpenMobile={isMobileSidebarOpen} onCloseMobile={() => setIsMobileSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header currentModule={activeModule} currentUser={currentUser} onSwitchRole={switchRole} clockTime={clockTime || '—'}
          isClockRunning={isClockRunning} onToggleClock={canClock ? () => void clockAction() : undefined}
          onTickClock={canClock ? n => void clockAction(n) : undefined} onRefreshData={loadStaffData}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(x => !x)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 lg:p-6" id="main-content">
          {authError ? <div role="alert" className="mx-auto mt-16 max-w-md rounded-2xl bg-white border border-red-100 p-8 text-center space-y-4"><h1 className="font-bold text-lg">Kết nối HospitalTwin</h1><p className="text-sm text-slate-600">{authError}</p><button onClick={init} className="btn-primary inline-flex gap-2"><RefreshCw size={16} />Thử lại</button></div>
          : !currentUser ? <div role="status" className="p-12 text-center text-slate-500">Đang kết nối phiên demo…</div>
          : !allowed ? <div className="mx-auto mt-16 max-w-md rounded-2xl border bg-white p-8 text-center space-y-3"><LockKeyhole className="mx-auto text-blue-600" /><h1 className="font-bold text-lg">Phân hệ dành cho vai trò khác</h1><p className="text-sm text-slate-500">Chọn vai trò phù hợp trong menu demo để trải nghiệm phân hệ này.</p><button className="btn-primary" onClick={() => navigate(isPatient ? 'patient' : 'monitoring')}>Về màn hình của tôi</button></div>
          : <motion.div key={`${activeModule}-${role}`} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .22 }}>
            {activeModule === 'monitoring' && <MonitoringView kpis={kpis} selectedFloor={selectedFloor} onSelectFloor={selectFloor} selectedRoomId={selectedRoomId} onSelectRoom={selectRoom} roomDetails={roomDetails} queueLocations={queueLocations} alerts={alerts} rooms={rooms} onOpenAI={openAI} clockTime={clockTime} />}
            {activeModule === 'overview' && <OverviewView kpis={globalKpis} onNavigate={navigate} rooms={rooms} summary={summary} />}
            {activeModule === 'digital_twin' && <DigitalTwinView selectedFloor={selectedFloor} onSelectFloor={selectFloor} selectedRoomId={selectedRoomId} onSelectRoom={selectRoom} roomDetails={roomDetails} rooms={rooms} onOpenAI={openAI} />}
            {activeModule === 'camera' && <CameraView cameras={cameras} onSelectRoom={id => { selectRoom(id); navigate('monitoring'); }} />}
            {activeModule === 'operations' && <OperationsView onOpenAI={openAI} onError={(a,b) => showToast('error', b ? `${a}: ${b}` : a)} onSuccess={(a,b) => showToast('success', b ? `${a}: ${b}` : a)} />}
            {activeModule === 'process' && <ProcessView onOpenAI={openAI} onNavigateToSimulation={openSimulation} />}
            {activeModule === 'simulation' && <SimulationView initialScenarioVersionId={simScenarioVersionId} onNavigateToIntervention={() => navigate('interventions')} />}
            {activeModule === 'ai' && <AIAssistantView initialRoomId={aiTargetRoom} onNavigateToSimulation={openSimulation} onNavigateToIntervention={() => navigate('interventions')} />}
            {activeModule === 'interventions' && <InterventionsView currentUser={currentUser} />}
            {activeModule === 'adaptive' && <AdaptiveView onOpenAI={openAI} />}
            {activeModule === 'admin' && <AdminView currentUser={currentUser} onRefreshAppState={loadStaffData} />}
            {activeModule === 'patient' && <PatientPortalView currentUser={currentUser} />}
          </motion.div>}
        </main>
      </div>
    </div>
  );
}
