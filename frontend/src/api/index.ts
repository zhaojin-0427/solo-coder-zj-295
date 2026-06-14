import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export const emotionAPI = {
  getRecords: (userId: number = 1, days: number = 30) =>
    api.get(`/emotion/records?user_id=${userId}&days=${days}`),
  getTodayRecord: (userId: number = 1) =>
    api.get(`/emotion/today?user_id=${userId}`),
  addRecord: (data: any) =>
    api.post('/emotion/record', data),
  getStressTypes: () =>
    api.get('/emotion/stress-types'),
  getSupportTypes: () =>
    api.get('/emotion/support-types'),
  getAlerts: (userId: number = 1) =>
    api.get(`/emotion/alerts?user_id=${userId}`),
  acknowledgeAlert: (alertId: number) =>
    api.post(`/emotion/alert/acknowledge/${alertId}`)
}

export const stressAPI = {
  getRecords: (userId: number = 1, days: number = 30, type?: string) => {
    let url = `/stress/records?user_id=${userId}&days=${days}`
    if (type) url += `&type=${type}`
    return api.get(url)
  },
  addRecord: (data: any) =>
    api.post('/stress/record', data),
  getSummary: (userId: number = 1, days: number = 30) =>
    api.get(`/stress/summary?user_id=${userId}&days=${days}`)
}

export const messageAPI = {
  getInbox: (recipientId: number = 1) =>
    api.get(`/messages/inbox?recipient_id=${recipientId}`),
  getUnreadCount: (recipientId: number = 1) =>
    api.get(`/messages/unread-count?recipient_id=${recipientId}`),
  sendMessage: (data: any) =>
    api.post('/messages/send', data),
  markViewed: (messageId: number) =>
    api.post(`/messages/view/${messageId}`),
  markAllViewed: (recipientId: number = 1) =>
    api.post('/messages/view-all', { recipient_id: recipientId }),
  getSentMessages: (senderId: number = 2) =>
    api.get(`/messages/sent?sender_id=${senderId}`)
}

export const babyAPI = {
  getSchedules: (userId: number = 1, days: number = 30) =>
    api.get(`/baby/schedules?user_id=${userId}&days=${days}`),
  getTodaySchedule: (userId: number = 1) =>
    api.get(`/baby/today?user_id=${userId}`),
  addSchedule: (data: any) =>
    api.post('/baby/schedule', data),
  getSummary: (userId: number = 1, days: number = 7) =>
    api.get(`/baby/summary?user_id=${userId}&days=${days}`)
}

export const statsAPI = {
  getOverview: (userId: number = 1, period: string = 'week') =>
    api.get(`/stats/overview?user_id=${userId}&period=${period}`),
  getEmotionTrend: (userId: number = 1, period: string = 'week') =>
    api.get(`/stats/emotion-trend?user_id=${userId}&period=${period}`),
  getStressDistribution: (userId: number = 1, period: string = 'week') =>
    api.get(`/stats/stress-distribution?user_id=${userId}&period=${period}`),
  getSupportCount: (userId: number = 1, period: string = 'week') =>
    api.get(`/stats/support-count?user_id=${userId}&period=${period}`),
  getRecoveryCurve: (userId: number = 1, period: string = 'month') =>
    api.get(`/stats/recovery-curve?user_id=${userId}&period=${period}`),
  getBabyEmotionCorrelation: (userId: number = 1, days: number = 14) =>
    api.get(`/stats/baby-emotion-correlation?user_id=${userId}&days=${days}`)
}

export const resourceAPI = {
  getResources: (emergency?: boolean) => {
    let url = '/resources/list'
    if (emergency !== undefined) url += `?emergency=${emergency}`
    return api.get(url)
  },
  getEmergencyResources: () =>
    api.get('/resources/emergency'),
  getTips: () =>
    api.get('/resources/tips')
}

export const userAPI = {
  getUsers: () =>
    api.get('/user/list'),
  getMomUser: () =>
    api.get('/user/mom'),
  getPartnerUser: () =>
    api.get('/user/partner'),
  getCurrentUser: (role: string = 'mom') =>
    api.get(`/user/current?role=${role}`)
}

export const careAPI = {
  getToday: (userId: number = 1) =>
    api.get(`/care/today?user_id=${userId}`),
  markSuggestion: (suggestionId: number, status: 'completed' | 'skipped' | 'pending') =>
    api.post('/care/mark', { suggestion_id: suggestionId, status }),
  getStats: (userId: number = 1, days: number = 7) =>
    api.get(`/care/stats?user_id=${userId}&days=${days}`),
  getHistory: (userId: number = 1, days: number = 7) =>
    api.get(`/care/history?user_id=${userId}&days=${days}`),
}

export const careMedAPI = {
  getToday: (userId: number = 1) =>
    api.get(`/care-med/today?user_id=${userId}`),
  getAlerts: (userId: number = 1) =>
    api.get(`/care-med/alerts?user_id=${userId}`),
  getStats: (userId: number = 1, days: number = 30) =>
    api.get(`/care-med/stats?user_id=${userId}&days=${days}`),
  getHistory: (userId: number = 1, days: number = 30) =>
    api.get(`/care-med/history?user_id=${userId}&days=${days}`),

  getVisits: (userId: number = 1, status?: string, days?: number) => {
    let url = `/care-med/visits?user_id=${userId}`
    if (status) url += `&status=${status}`
    if (days) url += `&days=${days}`
    return api.get(url)
  },
  addVisit: (data: any) =>
    api.post('/care-med/visits', data),
  updateVisit: (visitId: number, data: any) =>
    api.put(`/care-med/visits/${visitId}`, data),
  completeVisit: (visitId: number, data?: any) =>
    api.post(`/care-med/visits/${visitId}/complete`, data || {}),
  deleteVisit: (visitId: number) =>
    api.delete(`/care-med/visits/${visitId}`),

  getMedications: (userId: number = 1, activeOnly?: boolean) => {
    let url = `/care-med/medications?user_id=${userId}`
    if (activeOnly) url += `&active_only=1`
    return api.get(url)
  },
  addMedication: (data: any) =>
    api.post('/care-med/medications', data),
  updateMedication: (medId: number, data: any) =>
    api.put(`/care-med/medications/${medId}`, data),
  deleteMedication: (medId: number) =>
    api.delete(`/care-med/medications/${medId}`),

  logMedication: (data: {
    user_id?: number
    medication_id: number
    status: 'taken' | 'missed' | 'skipped' | 'pending'
    scheduled_time?: string
    log_date?: string
    actual_time?: string
    note?: string
  }) =>
    api.post('/care-med/medications/log', data),
  getMedLogs: (userId: number = 1, days: number = 7, medicationId?: number) => {
    let url = `/care-med/medications/logs?user_id=${userId}&days=${days}`
    if (medicationId) url += `&medication_id=${medicationId}`
    return api.get(url)
  },

  getReactions: (userId: number = 1, days: number = 30) =>
    api.get(`/care-med/reactions?user_id=${userId}&days=${days}`),
  addReaction: (data: any) =>
    api.post('/care-med/reactions', data),
  deleteReaction: (reactionId: number) =>
    api.delete(`/care-med/reactions/${reactionId}`),
}

export const feedingAPI = {
  getToday: (userId: number = 1) =>
    api.get(`/feeding/today?user_id=${userId}`),
  getAlerts: (userId: number = 1) =>
    api.get(`/feeding/alerts?user_id=${userId}`),
  getStats: (userId: number = 1, days: number = 30) =>
    api.get(`/feeding/stats?user_id=${userId}&days=${days}`),

  getRecords: (userId: number = 1, days: number = 30, feedType?: string) => {
    let url = `/feeding/records?user_id=${userId}&days=${days}`
    if (feedType) url += `&feed_type=${feedType}`
    return api.get(url)
  },
  getTodayRecords: (userId: number = 1) =>
    api.get(`/feeding/records/today?user_id=${userId}`),
  addRecord: (data: any) =>
    api.post('/feeding/records', data),
  updateRecord: (recordId: number, data: any) =>
    api.put(`/feeding/records/${recordId}`, data),
  deleteRecord: (recordId: number) =>
    api.delete(`/feeding/records/${recordId}`),

  getCareRecords: (userId: number = 1, days: number = 30) =>
    api.get(`/feeding/care-records?user_id=${userId}&days=${days}`),
  addCareRecord: (data: any) =>
    api.post('/feeding/care-records', data),
  updateCareRecord: (recordId: number, data: any) =>
    api.put(`/feeding/care-records/${recordId}`, data),
  deleteCareRecord: (recordId: number) =>
    api.delete(`/feeding/care-records/${recordId}`),

  getGoals: (userId: number = 1, status?: string) => {
    let url = `/feeding/goals?user_id=${userId}`
    if (status) url += `&status=${status}`
    return api.get(url)
  },
  addGoal: (data: any) =>
    api.post('/feeding/goals', data),
  updateGoal: (goalId: number, data: any) =>
    api.put(`/feeding/goals/${goalId}`, data),
  deleteGoal: (goalId: number) =>
    api.delete(`/feeding/goals/${goalId}`),

  getAdvices: (userId: number = 1, isCompleted?: boolean) => {
    let url = `/feeding/advices?user_id=${userId}`
    if (isCompleted !== undefined) url += `&is_completed=${isCompleted ? 1 : 0}`
    return api.get(url)
  },
  addAdvice: (data: any) =>
    api.post('/feeding/advices', data),
  updateAdvice: (adviceId: number, data: any) =>
    api.put(`/feeding/advices/${adviceId}`, data),
  deleteAdvice: (adviceId: number) =>
    api.delete(`/feeding/advices/${adviceId}`),
}

export const rehabAPI = {
  getToday: (userId: number = 1) =>
    api.get(`/rehab/today?user_id=${userId}`),
  getAlerts: (userId: number = 1) =>
    api.get(`/rehab/alerts?user_id=${userId}`),
  getStats: (userId: number = 1, days: number = 30) =>
    api.get(`/rehab/stats?user_id=${userId}&days=${days}`),
  getHistory: (userId: number = 1, days: number = 30) =>
    api.get(`/rehab/history?user_id=${userId}&days=${days}`),

  getRecords: (userId: number = 1, days: number = 30, trainingType?: string) => {
    let url = `/rehab/records?user_id=${userId}&days=${days}`
    if (trainingType) url += `&training_type=${trainingType}`
    return api.get(url)
  },
  addRecord: (data: any) =>
    api.post('/rehab/records', data),
  updateRecord: (recordId: number, data: any) =>
    api.put(`/rehab/records/${recordId}`, data),
  deleteRecord: (recordId: number) =>
    api.delete(`/rehab/records/${recordId}`),

  getGoals: (userId: number = 1, status?: string) => {
    let url = `/rehab/goals?user_id=${userId}`
    if (status) url += `&status=${status}`
    return api.get(url)
  },
  addGoal: (data: any) =>
    api.post('/rehab/goals', data),
  updateGoal: (goalId: number, data: any) =>
    api.put(`/rehab/goals/${goalId}`, data),
  deleteGoal: (goalId: number) =>
    api.delete(`/rehab/goals/${goalId}`),

  getContraindications: (userId: number = 1, activeOnly?: boolean) => {
    let url = `/rehab/contraindications?user_id=${userId}`
    if (activeOnly) url += `&active_only=1`
    return api.get(url)
  },
  addContraindication: (data: any) =>
    api.post('/rehab/contraindications', data),
  updateContraindication: (itemId: number, data: any) =>
    api.put(`/rehab/contraindications/${itemId}`, data),
  deleteContraindication: (itemId: number) =>
    api.delete(`/rehab/contraindications/${itemId}`),

  acknowledgeAlert: (alertId: number) =>
    api.post(`/rehab/alert/acknowledge/${alertId}`),
}

export default api
