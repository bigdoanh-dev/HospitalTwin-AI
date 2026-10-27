export type ModuleType =
  | 'overview'
  | 'monitoring'
  | 'digital_twin'
  | 'camera'
  | 'operations'
  | 'process'
  | 'simulation'
  | 'ai'
  | 'interventions'
  | 'adaptive'
  | 'admin'
  | 'patient';

export interface RoomData {
  id: string;
  name: string;
  floor_id: string;
  department_id: string;
  room_type: string;
  x: number;
  y: number;
  z: number;
  width: number;
  length: number;
  capacity: number;
  counters: number;
  active_staff: number;
  current_queue_length: number;
  current_waiting_time: number;
  status: 'normal' | 'busy' | 'congested' | 'warning' | 'offline';
  cameras: string[];
}

export interface FloorData {
  id: string;
  name: string;
  level: number;
  elevation: number;
  rooms: RoomData[];
}

export interface BuildingData {
  building: {
    id: string;
    name: string;
    code: string;
  };
  floors: FloorData[];
  cameras: CameraData[];
}

export interface CameraData {
  id: string;
  name: string;
  room_id: string;
  source_type: string;
  label_type?: string;
  is_online: boolean;
  people_count: number;
  confidence: number;
  last_update?: string;
}

export interface KPICardData {
  id: string;
  title: string;
  value: string | number;
  unit: string;
  delta: string;
  trend: 'up' | 'down' | 'neutral';
  sparkline: number[];
  definition?: string;
  source?: string;
  measured_at?: string;
  data_mode?: string;
}

export interface QueueLocationData {
  name: string;
  room_id: string;
  waiting: number;
  present: number | null;
  floor_id?: string;
  is_congested: boolean;
}

export interface AlertItem {
  id: string;
  room_id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  metric_name?: string;
  metric_value?: number;
  threshold?: number;
  created_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  role: string;
  email: string;
  patient_id?: string;
}

export interface SimulationResult {
  simulation_id?: string;
  scenario_version_id?: string;
  baseline: {
    completed_visits: number;
    unfinished_visits: number;
    total_patients_arrived: number;
    median_waiting_time_minutes: number;
    p90_waiting_time_minutes?: number;
    max_queue_length: number;
    resource_utilization: number;
    completion_rate_percent?: number;
    queue_timeline?: any[];
    input_snapshot_id?: string;
    [key: string]: any;
  };
  proposed: {
    completed_visits: number;
    unfinished_visits: number;
    total_patients_arrived: number;
    median_waiting_time_minutes: number;
    p90_waiting_time_minutes?: number;
    max_queue_length: number;
    resource_utilization: number;
    completion_rate_percent?: number;
    queue_timeline?: any[];
    input_snapshot_id?: string;
    [key: string]: any;
  };
  comparison: {
    waiting_time_delta_minutes: number;
    throughput_delta_patients: number;
    queue_reduction_percent: number;
    total_time_delta_minutes?: number;
    utilization_delta_percentage_points?: number;
    [key: string]: any;
  };
  uncertainty?: any;
  data_mode?: string;
}

export interface InterventionItem {
  id: string;
  title: string;
  description: string;
  target_room_id: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'in_progress' | 'executing' | 'completed' | 'evaluated' | string;
  proposed_by: string;
  approved_by?: string;
  resource_delta?: string;
  expected_impact?: string;
  created_at: string;
  simulation_run_id?: string | null;
  scenario_version_id?: string | null;
  prediction?: any;
  evaluation?: any;
  audit_history?: any[];
  data_mode?: string;
  tasks: Array<{
    id: string;
    title: string;
    assigned_to: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
}
