export interface EmotionRecord {
  id: number
  record_date: string
  emotion_score: number
  sleep_quality: number
  sleep_hours: number
  note: string
  self_assessment: number
  stress_types: string[]
  support_usage: { type: string; used: boolean; helpfulness: number }[]
  created_at: string
}

export interface StressRecord {
  id: number
  stress_type: string
  severity: number
  description: string
  record_date: string
  created_at: string
}

export interface Message {
  id: number
  sender_name: string
  content: string
  is_anonymous: boolean
  is_viewed: boolean
  created_at: string
}

export interface BabySchedule {
  id: number
  record_date: string
  sleep_total_hours: number
  feed_count: number
  crying_duration: number
  note: string
  created_at: string
}

export interface CounselingResource {
  id: number
  title: string
  description: string
  contact: string
  type: string
  is_emergency: boolean
}

export interface LowMoodAlert {
  id: number
  alert_date: string
  consecutive_low_days: number
  average_score: number
  resources: CounselingResource[]
  is_acknowledged: boolean
  message: string
}

export interface StatsOverview {
  period: string
  avg_emotion: number
  avg_sleep_hours: number
  stress_count: number
  support_count: number
  record_days: number
  month_avg_emotion: number
  record_days_month: number
}

export interface EmotionTrendItem {
  date: string
  emotion_score: number | null
  sleep_quality: number | null
  sleep_hours: number | null
  self_assessment: number | null
}

export interface StressDistributionItem {
  type: string
  count: number
  avg_severity: number
  percentage: number
}

export interface SupportCountData {
  total_support_days: number
  total_support_count: number
  by_type: { type: string; count: number; avg_helpfulness: number }[]
}

export interface CorrelationItem {
  date: string
  emotion_score: number | null
  sleep_quality: number | null
  baby_sleep_hours: number | null
  baby_feed_count: number | null
  baby_crying_duration: number | null
}

export interface CareSuggestion {
  id: number
  suggestion_date: string
  category: string
  category_label: string
  content: string
  status: 'pending' | 'completed' | 'skipped'
  priority: 'normal' | 'urgent'
}

export interface CareStats {
  total: number
  completed: number
  skipped: number
  pending: number
  completion_rate: number
  daily_rates: { date: string; total: number; completed: number; rate: number }[]
  category_distribution: { category: string; category_label: string; count: number; completed: number; percentage: number }[]
}

export interface PostpartumVisit {
  id: number
  visit_date: string
  hospital: string
  department: string
  doctor_name: string
  visit_type: string
  check_items: string
  doctor_advice: string
  status: 'pending' | 'completed' | 'cancelled' | 'overdue'
  status_label: string
  result_note: string
  completed_date: string | null
  medication_count: number
}

export interface Medication {
  id: number
  visit_id: number | null
  name: string
  category: string
  dosage: string
  frequency_per_day: number
  specific_times: string
  start_date: string | null
  end_date: string | null
  meal_relation: string
  notes: string
  is_active: boolean
  visit: { id: number; visit_type: string; visit_date: string } | null
  today_taken: number
  today_missed: number
  today_expected: number
}

export interface MedicationLog {
  id: number
  medication_id: number
  medication_name: string
  log_date: string
  scheduled_time: string
  actual_time: string
  status: 'pending' | 'taken' | 'missed' | 'skipped'
  status_label: string
  note: string
}

export interface AdverseReaction {
  id: number
  medication_id: number | null
  medication_name: string | null
  reaction_date: string
  symptom: string
  severity: number
  severity_label: string
  description: string
  duration_hours: number
  action_taken: string
  consulted_doctor: boolean
}

export interface CareMedAlert {
  level: 'urgent' | 'warn' | 'info'
  category: string
  title: string
  content: string
  resources?: { title: string; contact: string }[]
  action_hint?: string
  medication_id?: number
}

export interface CareMedTodo {
  type: 'visit' | 'medication'
  id: number
  log_id?: number
  title: string
  subtitle: string
  time: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  status: string
  extra?: any
}

export interface CareMedTodayData {
  todos: CareMedTodo[]
  alerts: CareMedAlert[]
  need_urgent: boolean
  today: string
}

export interface CareMedStats {
  period_days: number
  visits: {
    total: number
    completed: number
    pending: number
    overdue: number
    completion_rate: number
    type_distribution: { type: string; count: number; completed: number; percentage: number }[]
    daily_rates: { date: string; total: number; completed: number; rate: number }[]
  }
  medication: {
    expected_total: number
    taken_total: number
    missed_total: number
    adherence_rate: number
    daily_adherence: { date: string; expected: number; taken: number; missed: number; rate: number }[]
    missed_trend: { date: string; missed: number }[]
    consecutive_missed_days: number
    active_medication_count: number
  }
  reactions: {
    total: number
    severe_count: number
    symptom_distribution: { symptom: string; count: number; avg_severity: number; percentage: number }[]
    severity_distribution: { severity: number; severity_label: string; count: number; percentage: number }[]
  }
  emotion_state: {
    avg_emotion: number
    avg_sleep: number
    avg_sleep_quality: number
    record_count: number
  } | null
}

export interface HistoryItem {
  date: string
  type: 'visit' | 'med_log' | 'reaction'
  data: any
}
