export type ScriptStatus = 'OFF' | 'AUTO' | 'ON';

export interface ScriptConfig {
  id: string; // The Firestore document ID
  script_id: string;
  name: string;
  status: ScriptStatus;
  interval_minutes: number;
  last_run: any; // Firestore Timestamp
  last_output?: string;
  parameters: Record<string, any>;
}
