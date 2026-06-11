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
  week_avg_emotion: number
  month_avg_emotion: number
  week_avg_sleep_hours: number
  week_stress_count: number
  week_support_count: number
  record_days_week: number
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
