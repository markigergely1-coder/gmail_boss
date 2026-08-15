export type ScriptStatus = 'OFF' | 'AUTO' | 'ON';
export type ScheduleType = 'minutes' | 'hours' | 'days';

export interface ScriptConfig {
  id: string; // The Firestore document ID
  script_id: string;
  name: string;
  status: ScriptStatus;
  
  // Legacy
  interval_minutes?: number;
  
  // Advanced Scheduling
  schedule_type?: ScheduleType;
  schedule_value?: number;
  start_time?: string; // ISO String
  
  last_run: any; // Firestore Timestamp
  last_output?: string;
  parameters: Record<string, any>;
}
