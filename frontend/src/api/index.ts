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

export default api
