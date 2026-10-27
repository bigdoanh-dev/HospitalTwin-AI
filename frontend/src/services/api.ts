import {
  BuildingData,
  RoomData,
  KPICardData,
  QueueLocationData,
  AlertItem,
  UserProfile,
  SimulationResult,
  InterventionItem,
  CameraData
} from '../types/hospital';

let authToken: string | null = sessionStorage.getItem('hospital_twin_token') || null;
let currentUser: UserProfile | null = null;

const API_BASE = '/api/v1';

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

let refreshFlight: Promise<void> | null = null;
function rememberAuth(data: { access_token: string; user?: UserProfile }) {
  authToken = data.access_token;
  sessionStorage.setItem('hospital_twin_token', authToken);
  if (data.user) currentUser = data.user;
}
async function refreshSession() {
  if (!refreshFlight) {
    refreshFlight = (async () => {
      const response = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'same-origin' });
      if (!response.ok) throw new ApiError(401, 'Phiên làm việc đã hết hạn. Hãy đăng nhập lại.');
      rememberAuth(await response.json());
    })().finally(() => { refreshFlight = null; });
  }
  await refreshFlight;
}
async function request<T>(endpoint: string, options: RequestInit = {}, retried = false): Promise<T> {
  const tokenAtRequest = authToken;
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, { ...options, credentials: 'same-origin', headers });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ HospitalTwin. Kiểm tra dịch vụ tại cổng 8000.');
  }
  if (res.status === 401 && !retried && !endpoint.startsWith('/auth/')) {
    try {
      // Parallel failed requests share one cookie rotation. A later 401 can reuse the new token.
      if (authToken === tokenAtRequest) await refreshSession();
      return request<T>(endpoint, options, true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        authToken = null;
        sessionStorage.removeItem('hospital_twin_token');
        window.dispatchEvent(new Event('hospital:session-expired'));
      }
      throw err;
    }
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = typeof data.detail === 'string' ? data.detail
      : Array.isArray(data.detail) ? data.detail.map((e: any) => `${(e.loc || []).filter((x: string) => x !== 'body').join('.')}: ${e.msg}`).join('; ')
      : `Yêu cầu không thành công (${res.status}).`;
    throw new ApiError(res.status, detail);
  }
  const data = res.status === 204 ? null : await res.json();
  if (options.method && options.method !== 'GET' && !/^\/(auth|ai|simulations)\//.test(endpoint) && endpoint !== '/scenarios/validate') {
    // Run after reset/login callers have stored any replacement token.
    setTimeout(() => window.dispatchEvent(new Event('hospital:data-changed')), 0);
  }
  return data as T;
}

export const api = {
  // Auth
  async login(username = 'operator', password = 'demo123'): Promise<{ access_token: string; user: UserProfile }> {
    const data = await request<{ access_token: string; user: UserProfile }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    authToken = data.access_token;
    currentUser = data.user;
    sessionStorage.setItem('hospital_twin_token', authToken);
    return data;
  },

  async switchRole(role: string): Promise<{ access_token: string; user: UserProfile }> {
    const data = await request<{ access_token: string; user: UserProfile }>('/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    authToken = data.access_token;
    currentUser = data.user;
    sessionStorage.setItem('hospital_twin_token', authToken);
    return data;
  },

  async getDemoUsers(): Promise<UserProfile[]> {
    return request<UserProfile[]>('/auth/demo-users');
  },

  async getMe(): Promise<UserProfile> {
    const user = await request<UserProfile>('/auth/me');
    currentUser = user;
    return user;
  },

  getCurrentUser(): UserProfile | null {
    return currentUser;
  },

  getToken(): string | null {
    return authToken;
  },

  setToken(token: string) {
    authToken = token;
    sessionStorage.setItem('hospital_twin_token', token);
  },

  // Spatial & 3D
  async getBuilding(): Promise<BuildingData> {
    return request<BuildingData>('/spatial/building');
  },

  async getRoomDetails(roomId: string): Promise<any> {
    return request<any>(`/spatial/rooms/${roomId}`);
  },

  async getRoute(source: string, target: string): Promise<any> {
    return request<any>(`/spatial/route?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`);
  },

  // Monitoring
  async getOverview(floorId?: string, departmentId?: string): Promise<{ kpis: KPICardData[]; freshness: string; data_mode: string; measured_at?: string; source?: string; summary?: any }> {
    let q = '';
    const params = new URLSearchParams();
    if (floorId && floorId !== 'All') params.set('floor_id', floorId);
    if (departmentId) params.set('department_id', departmentId);
    const qs = params.toString();
    if (qs) q = `?${qs}`;
    return request<any>(`/monitoring/overview${q}`);
  },

  async getQueueByLocation(floorId?: string, departmentId?: string): Promise<QueueLocationData[]> {
    let q = '';
    const params = new URLSearchParams();
    if (floorId && floorId !== 'All') params.set('floor_id', floorId);
    if (departmentId) params.set('department_id', departmentId);
    const qs = params.toString();
    if (qs) q = `?${qs}`;
    return request<QueueLocationData[]>(`/monitoring/queue-by-location${q}`);
  },

  async getQueueHistory(roomId: string): Promise<Array<{ time: string; count: number }>> {
    return request<Array<{ time: string; count: number }>>(`/monitoring/queue-history/${roomId}`);
  },

  async getAlerts(floorId?: string): Promise<AlertItem[]> {
    return request<AlertItem[]>(`/monitoring/alerts${floorId && floorId !== 'All' ? `?floor_id=${encodeURIComponent(floorId)}` : ''}`);
  },

  async getEvents(): Promise<Array<{ id: string; event_type: string; description: string; timestamp: string }>> {
    return request<any[]>('/monitoring/events');
  },

  // Operations Lifecycle
  async listVisits(status?: string): Promise<any[]> {
    return request<any[]>(`/operations/visits${status ? `?status=${status}` : ''}`);
  },

  async getVisitById(id: string): Promise<any> {
    return request<any>(`/operations/visits/${id}`);
  },

  async getMyVisit(): Promise<any> {
    return request<any>('/operations/my-visit');
  },

  async registerPatient(data: { full_name: string; gender?: string; dob?: string; phone?: string; payment_type?: string; chief_complaint?: string }): Promise<any> {
    return request<any>('/operations/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async callPatient(visit_id: string, room_id?: string): Promise<any> {
    return request<any>('/operations/queue/call', {
      method: 'POST',
      body: JSON.stringify({ visit_id, room_id }),
    });
  },

  async startService(visit_id: string, room_id?: string): Promise<any> {
    return request<any>('/operations/queue/start', {
      method: 'POST',
      body: JSON.stringify({ visit_id, room_id }),
    });
  },

  async completeStep(visit_id: string, room_id?: string, needs_lab = false): Promise<any> {
    return request<any>('/operations/queue/complete', {
      method: 'POST',
      body: JSON.stringify({ visit_id, room_id, needs_lab }),
    });
  },

  async orderLab(visit_id: string, test_type = 'Xét nghiệm minh họa'): Promise<any> {
    return request<any>('/operations/doctor/order-lab', {
      method: 'POST',
      body: JSON.stringify({ visit_id, test_type }),
    });
  },

  async processLab(visit_id: string): Promise<any> {
    return request<any>('/operations/lab/process', {
      method: 'POST',
      body: JSON.stringify({ visit_id }),
    });
  },

  async resultReadyLab(visit_id: string): Promise<any> {
    return request<any>('/operations/lab/result-ready', {
      method: 'POST',
      body: JSON.stringify({ visit_id }),
    });
  },

  async queueAction(visit_id: string, action: string, reason?: string, target_room_id?: string): Promise<any> {
    return request<any>('/operations/queue/action', {
      method: 'POST',
      body: JSON.stringify({ visit_id, action, reason, target_room_id }),
    });
  },

  // Scenarios & Process Modelling
  async listScenarios(): Promise<any[]> {
    return request<any[]>('/scenarios');
  },

  async getScenarioTemplate(): Promise<any> {
    return request<any>('/scenarios/template');
  },

  async validateScenario(data: { name?: string; description?: string; config?: any; nodes?: any[]; edges?: any[] }): Promise<any> {
    return request<any>('/scenarios/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createScenario(data: { name: string; description?: string; config?: any; nodes?: any[]; edges?: any[] }): Promise<any> {
    return request<any>('/scenarios', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createScenarioVersion(scenarioId: string, data: { name?: string; description?: string; config?: any; nodes?: any[]; edges?: any[] }): Promise<any> {
    return request<any>(`/scenarios/${scenarioId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Discrete-Event Simulation
  async runSimulation(params: {
    name?: string;
    lab_counters?: number;
    lab_staff?: number;
    exam_counters?: number;
    service_time?: number;
    travel_minutes?: number;
    ct_online?: boolean;
    fast_track_returning?: boolean;
    seed?: number;
    repetitions?: number;
    scenario_version_id?: string;
  }): Promise<SimulationResult> {
    return request<SimulationResult>('/simulations/run', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getLatestSimulation(): Promise<any> {
    return request<any>('/simulations/baseline');
  },

  // AI Assistant (Evidence-backed)
  async queryAI(query: string, room_id?: string): Promise<any> {
    return request<any>('/ai/query', {
      method: 'POST',
      body: JSON.stringify({ query, room_id }),
    });
  },

  // Interventions & Human Approvals
  async listInterventions(): Promise<InterventionItem[]> {
    return request<InterventionItem[]>('/interventions');
  },

  async createIntervention(data: {
    title: string;
    description: string;
    target_room_id: string;
    simulation_run_id?: string;
    resource_delta?: string;
    expected_impact?: string;
    proposed_by?: string;
  }): Promise<any> {
    return request<any>('/interventions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async decideIntervention(id: string, decision: 'approved' | 'rejected', reason?: string): Promise<any> {
    return request<any>(`/interventions/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason }),
    });
  },

  async updateTask(task_id: string, status: 'in_progress' | 'completed'): Promise<any> {
    return request<any>('/interventions/tasks/update', {
      method: 'POST',
      body: JSON.stringify({ task_id, status }),
    });
  },

  async evaluateIntervention(id: string): Promise<any> {
    return request<any>(`/interventions/${id}/evaluate`, {
      method: 'POST',
    });
  },

  async rollbackIntervention(id: string): Promise<any> {
    return request<any>(`/interventions/${id}/rollback`, {
      method: 'POST',
    });
  },

  // Cameras
  async listCameras(): Promise<CameraData[]> {
    return request<CameraData[]>('/cameras');
  },

  async updateCamera(id: string, is_online: boolean): Promise<any> {
    return request<any>(`/cameras/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_online }),
    });
  },

  // Demo Controls
  async getDemoState(): Promise<{ now: string; running: boolean; speed: number; data_mode: string; spare_staff: number; spare_counters: number; clock_note: string }> {
    return request<any>('/demo/state');
  },

  async setClock(running: boolean, speed = 1): Promise<any> {
    return request<any>('/demo/clock', {
      method: 'POST',
      body: JSON.stringify({ running, speed }),
    });
  },

  async tickClock(minutes = 5): Promise<any> {
    return request<any>('/demo/tick', {
      method: 'POST',
      body: JSON.stringify({ minutes }),
    });
  },

  async triggerCongestion(): Promise<any> {
    return request<any>('/demo/trigger-congestion', { method: 'POST' });
  },

  async triggerCTIncident(): Promise<any> {
    return request<any>('/demo/trigger-ct-incident', { method: 'POST' });
  },

  async restoreCT(): Promise<any> {
    return request<any>('/demo/restore-ct', { method: 'POST' });
  },

  async resetDemo(): Promise<{ message: string; access_token: string; user: UserProfile }> {
    const data = await request<{ message: string; access_token: string; user: UserProfile }>('/demo/reset', { method: 'POST' });
    if (data.access_token) {
      authToken = data.access_token;
      currentUser = data.user;
      sessionStorage.setItem('hospital_twin_token', authToken);
    }
    return data;
  },

  // Admin & System
  async getAdminUsers(): Promise<any[]> {
    return request<any[]>('/admin/users');
  },

  async updateAdminUser(userId: string, is_active: boolean): Promise<any> {
    return request<any>(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active }),
    });
  },

  async getAdminAudit(): Promise<any[]> {
    return request<any[]>('/admin/audit');
  },

  async getSystemFeatures(): Promise<any> {
    return request<any>('/system/features');
  },
};
