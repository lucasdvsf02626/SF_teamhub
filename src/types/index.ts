// SF:Team Hub Types

export type AppRole =
  | "pmr_client"
  | "manufacturing_client"
  | "media_pr_client"
  | "pet_client"
  | "director"
  | "operations_manager"
  | "account_manager"
  | "formulation_scientist"
  | "qa_manager"
  | "regulatory_specialist"
  | "production_manager"
  | "warehouse_manager"
  | "finance_manager"
  | "marketing_manager"
  | "pr_manager"
  | "customer_service"
  | "lab_technician"
  | "admin_assistant"
  | "it_support"
  | "compliance_officer"
  | "architect"
  | "general_manager"
  | "senior_leadership"
  | "revenue_generation"
  | "production_operative"
  | "team_leader"
  | "manufacturing_manager"
  | "senior_qc_officer";

export type PresenceStatus = "on_site" | "on_break" | "remote" | "leave" | "sick" | "off";

export type AttendanceDirection = "in" | "out";

export type AttendanceSource = "kiosk" | "phone" | "manual" | "migration";

export interface Profile {
  id: string;
  email: string | null;
  first_name: string | null;
  surname: string | null;
  display_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  company: string | null;
  department: string | null;
  permission_level: number | null;
  reports_to: string | null;
  phone: string | null;
  bio: string | null;
  start_date: string | null;
  birthday: string | null;
  country_code: string | null;
  work_city: string | null;
  work_country_code: string | null;
  languages: string[] | null;
  must_change_password: boolean | null;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  address: string | null;
  expected_start_time: string | null;
  is_active: boolean;
}

export interface AttendanceEvent {
  id: string;
  person_id: string;
  direction: AttendanceDirection;
  source: AttendanceSource;
  site_id: string | null;
  recorded_at: string;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

// Mock data for demo purposes
export interface MockUser extends Profile {
  pin?: string;
  currentStatus?: PresenceStatus;
  signedInAt?: string;
}
