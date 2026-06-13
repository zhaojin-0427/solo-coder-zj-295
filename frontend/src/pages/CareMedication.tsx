import { useState, useEffect } from 'react'
import { careMedAPI, resourceAPI } from '../api'
import {
  PostpartumVisit,
  Medication,
  AdverseReaction,
  HistoryItem,
  CareMedTodayData,
  CounselingResource,
} from '../types'

type TabKey = 'today' | 'visits' | 'medications' | 'reactions' | 'history'

const VISIT_TYPES = ['常规复诊', '42天复查', '盆底检查', '乳腺检查', '心理健康评估', '产后康复', '其他']
const MED_CATEGORIES = ['处方药', '非处方药', '维生素', '钙片', '铁剂', 'DHA', '益生菌', '营养补充剂', '其他']
const MEAL_RELATIONS = ['无要求', '饭前', '饭后', '随餐', '睡前']
const SEVERITY_OPTIONS = [
  { value: 1, label: '轻微 1', color: '#22c55e' },
  { value: 2, label: '较轻 2', color: '#84cc16' },
  { value: 3, label: '一般 3', color: '#eab308' },
  { value: 4, label: '较重 4', color: '#f97316' },
  { value: 5, label: '严重 5', color: '#ef4444' },
]

const ALERT_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  urgent: { bg: '#fef2f2', border: '#ef4444', badge: '#ef4444', text: '#991b1b' },
  warn: { bg: '#fffbeb', border: '#f59e0b', badge: '#f59e0b', text: '#92400e' },
  info: { bg: '#eff6ff', border: '#3b82f6', badge: '#3b82f6', text: '#1e40af' },
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  normal: '#3b82f6',
  low: '#9ca3af',
}

function CareMedication() {
  const [activeTab, setActiveTab] = useState<TabKey>('today')
  const [todayData, setTodayData] = useState<CareMedTodayData | null>(null)
  const [visits, setVisits] = useState<PostpartumVisit[]>([])
  const [medications, setMedications] = useState<Medication[]>([])
  const [reactions, setReactions] = useState<AdverseReaction[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [emergencyResources, setEmergencyResources] = useState<CounselingResource[]>([])
  const [loading, setLoading] = useState(true)

  const [showVisitModal, setShowVisitModal] = useState(false)
  const [editingVisit, setEditingVisit] = useState<PostpartumVisit | null>(null)
  const [showMedModal, setShowMedModal] = useState(false)
  const [editingMed, setEditingMed] = useState<Medication | null>(null)
  const [showReactionModal, setShowReactionModal] = useState(false)
  const [showCompleteVisitModal, setShowCompleteVisitModal] = useState(false)
  const [completingVisit, setCompletingVisit] = useState<PostpartumVisit | null>(null)

  const [visitForm, setVisitForm] = useState({
    visit_date: new Date().toISOString().split('T')[0],
    hospital: '',
    department: '',
    doctor_name: '',
    visit_type: '常规复诊',
    check_items: '',
    doctor_advice: '',
  })

  const [medForm, setMedForm] = useState({
    name: '',
    category: '处方药',
    dosage: '',
    frequency_per_day: 1,
    specific_times: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    meal_relation: '无要求',
    notes: '',
  })

  const [reactionForm, setReactionForm] = useState({
    reaction_date: new Date().toISOString().split('T')[0],
    medication_id: null as number | null,
    symptom: '',
    severity: 3,
    description: '',
    duration_hours: 0,
    action_taken: '',
    consulted_doctor: false,
  })

  const [completeForm, setCompleteForm] = useState({
    result_note: '',
    doctor_advice: '',
  })

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setLoading(true)
      const [todayRes, visitsRes, medsRes, reactionsRes, historyRes, emergencyRes] = await Promise.all([
        careMedAPI.getToday(1),
        careMedAPI.getVisits(1),
        careMedAPI.getMedications(1),
        careMedAPI.getReactions(1, 30),
        careMedAPI.getHistory(1, 30),
        resourceAPI.getEmergencyResources(),
      ])
      if (todayRes.data.success) setTodayData(todayRes.data.data)
      if (visitsRes.data.success) setVisits(visitsRes.data.data)
      if (medsRes.data.success) setMedications(medsRes.data.data)
      if (reactionsRes.data.success) setReactions(reactionsRes.data.data)
      if (historyRes.data.success) setHistory(historyRes.data.data)
      if (emergencyRes.data.success) setEmergencyResources(emergencyRes.data.data)
    } catch (e) {
      console.error('加载复诊用药数据失败', e)
    } finally {
      setLoading(false)
    }
  }

  const openAddVisit = () => {
    setEditingVisit(null)
    setVisitForm({
      visit_date: new Date().toISOString().split('T')[0],
      hospital: '',
      department: '',
      doctor_name: '',
      visit_type: '常规复诊',
      check_items: '',
      doctor_advice: '',
    })
    setShowVisitModal(true)
  }

  const openEditVisit = (v: PostpartumVisit) => {
    setEditingVisit(v)
    setVisitForm({
      visit_date: v.visit_date,
      hospital: v.hospital,
      department: v.department,
      doctor_name: v.doctor_name,
      visit_type: v.visit_type,
      check_items: v.check_items,
      doctor_advice: v.doctor_advice,
    })
    setShowVisitModal(true)
  }

  const submitVisit = async () => {
    if (!visitForm.visit_date) {
      alert('请选择就诊日期')
      return
    }
    try {
      setSubmitting(true)
      const payload = { user_id: 1, ...visitForm }
      if (editingVisit) {
        await careMedAPI.updateVisit(editingVisit.id, payload)
      } else {
        await careMedAPI.addVisit(payload)
      }
      setShowVisitModal(false)
      loadAllData()
    } catch (e) {
      console.error('保存复诊失败', e)
      alert('保存失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteVisit = async (id: number) => {
    if (!confirm('确定删除这条复诊记录吗？')) return
    try {
      await careMedAPI.deleteVisit(id)
      loadAllData()
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  const openCompleteVisit = (v: PostpartumVisit) => {
    setCompletingVisit(v)
    setCompleteForm({ result_note: v.result_note, doctor_advice: v.doctor_advice })
    setShowCompleteVisitModal(true)
  }

  const submitCompleteVisit = async () => {
    if (!completingVisit) return
    try {
      setSubmitting(true)
      await careMedAPI.completeVisit(completingVisit.id, completeForm)
      setShowCompleteVisitModal(false)
      loadAllData()
    } catch (e) {
      console.error('完成复诊失败', e)
      alert('操作失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const openAddMed = () => {
    setEditingMed(null)
    setMedForm({
      name: '',
      category: '处方药',
      dosage: '',
      frequency_per_day: 1,
      specific_times: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      meal_relation: '无要求',
      notes: '',
    })
    setShowMedModal(true)
  }

  const openEditMed = (m: Medication) => {
    setEditingMed(m)
    setMedForm({
      name: m.name,
      category: m.category,
      dosage: m.dosage,
      frequency_per_day: m.frequency_per_day,
      specific_times: m.specific_times,
      start_date: m.start_date || new Date().toISOString().split('T')[0],
      end_date: m.end_date || '',
      meal_relation: m.meal_relation,
      notes: m.notes,
    })
    setShowMedModal(true)
  }

  const submitMed = async () => {
    if (!medForm.name.trim()) {
      alert('请输入药品/补充剂名称')
      return
    }
    try {
      setSubmitting(true)
      const payload = { user_id: 1, ...medForm }
      if (editingMed) {
        await careMedAPI.updateMedication(editingMed.id, payload)
      } else {
        await careMedAPI.addMedication(payload)
      }
      setShowMedModal(false)
      loadAllData()
    } catch (e) {
      console.error('保存用药失败', e)
      alert('保存失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleMedActive = async (m: Medication) => {
    try {
      await careMedAPI.updateMedication(m.id, { is_active: !m.is_active })
      loadAllData()
    } catch (e) {
      console.error('更新用药状态失败', e)
    }
  }

  const deleteMed = async (id: number) => {
    if (!confirm('确定删除这条用药记录吗？相关服药记录将被保留。')) return
    try {
      await careMedAPI.deleteMedication(id)
      loadAllData()
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  const markMedication = async (medId: number, scheduledTime: string, status: 'taken' | 'missed') => {
    try {
      await careMedAPI.logMedication({
        user_id: 1,
        medication_id: medId,
        status,
        scheduled_time: scheduledTime,
      })
      loadAllData()
    } catch (e) {
      console.error('记录服药失败', e)
      alert('操作失败，请重试')
    }
  }

  const openAddReaction = (medId?: number) => {
    setReactionForm({
      reaction_date: new Date().toISOString().split('T')[0],
      medication_id: medId || null,
      symptom: '',
      severity: 3,
      description: '',
      duration_hours: 0,
      action_taken: '',
      consulted_doctor: false,
    })
    setShowReactionModal(true)
  }

  const submitReaction = async () => {
    if (!reactionForm.symptom.trim()) {
      alert('请描述不适症状')
      return
    }
    try {
      setSubmitting(true)
      await careMedAPI.addReaction({ user_id: 1, ...reactionForm })
      setShowReactionModal(false)
      loadAllData()
    } catch (e) {
      console.error('保存不适反应失败', e)
      alert('保存失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteReaction = async (id: number) => {
    if (!confirm('确定删除这条不适反应记录吗？')) return
    try {
      await careMedAPI.deleteReaction(id)
      loadAllData()
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${month}月${day}日 ${weekdays[d.getDay()]}`
  }

  const daysUntil = (dateStr: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(dateStr)
    target.setHours(0, 0, 0, 0)
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'today', label: '今日', icon: '📅' },
    { key: 'visits', label: '复诊计划', icon: '🏥' },
    { key: 'medications', label: '用药管理', icon: '💊' },
    { key: 'reactions', label: '不适反应', icon: '⚠️' },
    { key: 'history', label: '历史记录', icon: '📋' },
  ]

  const urgentAlerts = todayData?.alerts.filter(a => a.level === 'urgent') || []
  const nonUrgentAlerts = todayData?.alerts.filter(a => a.level !== 'urgent') || []

  const renderAlert = (alert: any, idx: number) => {
    const colors = ALERT_COLORS[alert.level] || ALERT_COLORS.info
    return (
      <div
        key={idx}
        style={{
          background: colors.bg,
          borderLeft: `4px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: colors.badge,
                color: 'white',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              {alert.level === 'urgent' ? '🚨 紧急' : alert.level === 'warn' ? '⚠️ 注意' : 'ℹ️ 提示'}
            </span>
            <strong style={{ color: colors.text, fontSize: '15px' }}>{alert.title}</strong>
          </div>
        </div>
        <p style={{ color: colors.text, fontSize: '14px', lineHeight: 1.7, margin: '8px 0' }}>
          {alert.content}
        </p>
        {alert.action_hint && (
          <p style={{ fontSize: '13px', color: colors.text, opacity: 0.8, marginBottom: '8px' }}>
            💡 {alert.action_hint}
          </p>
        )}
        {alert.resources && alert.resources.length > 0 && (
          <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: colors.text, marginBottom: '6px' }}>
              📞 紧急联系资源：
            </p>
            {alert.resources.map((r: any, i: number) => (
              <div key={i} style={{ fontSize: '13px', color: colors.text, marginBottom: '4px' }}>
                • <strong>{r.title}</strong>：{r.contact}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderTodo = (todo: any, idx: number) => {
    const isVisit = todo.type === 'visit'
    const statusColors: Record<string, { bg: string; text: string }> = {
      pending: { bg: '#dbeafe', text: '#1e40af' },
      taken: { bg: '#dcfce7', text: '#166534' },
      missed: { bg: '#fee2e2', text: '#991b1b' },
      completed: { bg: '#dcfce7', text: '#166534' },
      overdue: { bg: '#fee2e2', text: '#991b1b' },
      skipped: { bg: '#f3f4f6', text: '#4b5563' },
    }
    const sc = statusColors[todo.status] || statusColors.pending
    const done = todo.status === 'taken' || todo.status === 'completed'

    return (
      <div
        key={idx}
        style={{
          background: done ? '#f9fafb' : 'white',
          border: '1px solid #f0f0f0',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '10px',
          opacity: done ? 0.7 : 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '20px' }}>{isVisit ? '🏥' : '💊'}</span>
              <strong style={{ fontSize: '15px', textDecoration: done ? 'line-through' : 'none' }}>
                {todo.title}
              </strong>
              <span
                style={{
                  background: sc.bg,
                  color: sc.text,
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 500,
                }}
              >
                {todo.status === 'pending' && isVisit ? '待就诊' :
                 todo.status === 'pending' ? '待服用' :
                 todo.status === 'taken' ? '已服用' :
                 todo.status === 'missed' ? '已漏服' :
                 todo.status === 'completed' ? '已完成' :
                 todo.status === 'overdue' ? '已逾期' : todo.status}
              </span>
              {todo.priority && todo.priority !== 'normal' && (
                <span
                  className="tag"
                  style={{
                    background: `${PRIORITY_COLORS[todo.priority] || '#999'}20`,
                    color: PRIORITY_COLORS[todo.priority] || '#666',
                    border: 'none',
                    fontSize: '11px',
                    padding: '2px 8px',
                  }}
                >
                  {todo.priority === 'urgent' ? '🔥 紧急' : todo.priority === 'high' ? '⭐ 重要' : ''}
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
              🕐 {todo.time} | {todo.subtitle}
            </div>
            {todo.extra?.meal_relation && todo.extra.meal_relation !== '无要求' && (
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                🍽️ {todo.extra.meal_relation}服用
              </div>
            )}
            {todo.extra?.notes && (
              <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px' }}>
                ⚠️ {todo.extra.notes}
              </div>
            )}
          </div>
        </div>

        {!done && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {isVisit ? (
              <>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                  onClick={() => {
                    const v = visits.find(x => x.id === todo.id)
                    if (v) openCompleteVisit(v)
                  }}
                >
                  ✓ 标记完成
                </button>
                <button
                  className="btn btn-outline"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                  onClick={() => {
                    const v = visits.find(x => x.id === todo.id)
                    if (v) openEditVisit(v)
                  }}
                >
                  编辑
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                  onClick={() => markMedication(todo.id, todo.time && todo.time.includes('第') ? '' : todo.time, 'taken')}
                >
                  ✓ 已服用
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                  onClick={() => {
                    if (confirm('确定标记为漏服吗？')) {
                      markMedication(todo.id, todo.time && todo.time.includes('第') ? '' : todo.time, 'missed')
                    }
                  }}
                >
                  ✗ 漏服
                </button>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%)',
          color: 'white',
        }}
      >
        <h2 style={{ fontSize: '20px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🏥 产后复诊与用药提醒
        </h2>
        <p style={{ fontSize: '14px', opacity: 0.95 }}>
          记录您的产后复诊计划、用药情况和身体反应，系统会根据数据为您提供个性化的健康提醒
        </p>
        <div style={{ marginTop: '12px', fontSize: '13px', opacity: 0.85 }}>
          📅 {formatDate(new Date().toISOString().split('T')[0])}
        </div>
      </div>

      <div className="tabs-row">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p>加载中...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'today' && todayData && (
            <div>
              {urgentAlerts.length > 0 && (
                <div className="card">
                  <h2 className="card-title">🚨 紧急提醒</h2>
                  <div
                    style={{
                      padding: '12px',
                      background: '#fef2f2',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      border: '1px dashed #ef4444',
                    }}
                  >
                    <p style={{ fontSize: '14px', color: '#991b1b', lineHeight: 1.6 }}>
                      ⚠️ 检测到需要您<strong>立即关注</strong>的情况，请仔细阅读以下提醒，必要时请联系医生或拨打急救电话。
                    </p>
                  </div>
                  {urgentAlerts.map((a, i) => renderAlert(a, i))}
                </div>
              )}

              {nonUrgentAlerts.length > 0 && (
                <div className="card">
                  <h2 className="card-title">💡 今日提醒</h2>
                  {nonUrgentAlerts.map((a, i) => renderAlert(a, i))}
                </div>
              )}

              <div className="card">
                <h2 className="card-title">📋 今日待办</h2>
                {todayData.todos.length > 0 ? (
                  todayData.todos.map((t, i) => renderTodo(t, i))
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">🌷</div>
                    <p>今日暂无待办事项，您可以在"复诊计划"或"用药管理"中添加记录</p>
                  </div>
                )}
              </div>

              {emergencyResources.length > 0 && (
                <div className="card">
                  <h2 className="card-title">📞 紧急联系资源</h2>
                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                    遇到任何紧急情况，请随时联系以下专业机构求助，您不需要独自面对：
                  </p>
                  {emergencyResources.slice(0, 3).map((r, i) => (
                    <div
                      key={i}
                      className="resource-card emergency"
                    >
                      <div className="resource-title">
                        {r.title}
                        <span className="emergency-badge">紧急</span>
                      </div>
                      <div className="resource-contact">📞 {r.contact}</div>
                      <div className="resource-desc">{r.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'visits' && (
            <div>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 className="card-title" style={{ marginBottom: 0 }}>🏥 复诊计划</h2>
                  <button className="btn btn-primary" onClick={openAddVisit}>
                    + 新增复诊
                  </button>
                </div>

                {visits.length > 0 ? (
                  visits.map(v => {
                    const diff = daysUntil(v.visit_date)
                    const isOverdue = v.status === 'pending' && diff < 0
                    return (
                      <div
                        key={v.id}
                        style={{
                          background: v.status === 'completed' ? '#f9fafb' : isOverdue ? '#fef2f2' : 'white',
                          border: `1px solid ${isOverdue ? '#fecaca' : '#f0f0f0'}`,
                          borderRadius: '12px',
                          padding: '16px',
                          marginBottom: '12px',
                          opacity: v.status === 'completed' ? 0.7 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '16px' }}>{v.visit_type}</strong>
                              <span
                                className="tag"
                                style={{
                                  background: v.status === 'completed' ? '#22c55e20' : isOverdue ? '#ef444420' : '#3b82f620',
                                  color: v.status === 'completed' ? '#22c55e' : isOverdue ? '#ef4444' : '#3b82f6',
                                  border: 'none',
                                  fontSize: '12px',
                                }}
                              >
                                {v.status_label}
                              </span>
                              {isOverdue && (
                                <span
                                  className="tag"
                                  style={{ background: '#ef444420', color: '#ef4444', border: 'none', fontSize: '12px' }}
                                >
                                  已逾期{Math.abs(diff)}天
                                </span>
                              )}
                              {v.status === 'pending' && diff >= 0 && diff <= 3 && (
                                <span
                                  className="tag"
                                  style={{ background: '#f59e0b20', color: '#f59e0b', border: 'none', fontSize: '12px' }}
                                >
                                  {diff === 0 ? '今天' : `${diff}天后`}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '14px', color: '#555', lineHeight: 1.7 }}>
                              <div>📅 {formatDate(v.visit_date)}</div>
                              {v.hospital && <div>🏥 {v.hospital} {v.department}</div>}
                              {v.doctor_name && <div>👨‍⚕️ 主治医生：{v.doctor_name}</div>}
                            </div>
                            {v.check_items && (
                              <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                                <strong>检查项目：</strong>{v.check_items}
                              </div>
                            )}
                            {v.doctor_advice && (
                              <div style={{ marginTop: '6px', fontSize: '13px', color: '#666' }}>
                                <strong>医生建议：</strong>{v.doctor_advice}
                              </div>
                            )}
                            {v.result_note && v.status === 'completed' && (
                              <div style={{ marginTop: '6px', fontSize: '13px', color: '#22c55e' }}>
                                <strong>复诊结果：</strong>{v.result_note}
                              </div>
                            )}
                            {v.medication_count > 0 && (
                              <div style={{ marginTop: '6px', fontSize: '13px', color: '#8b5cf6' }}>
                                💊 关联用药 {v.medication_count} 项
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {v.status === 'pending' && (
                            <button
                              className="btn btn-primary"
                              style={{ fontSize: '12px', padding: '6px 14px' }}
                              onClick={() => openCompleteVisit(v)}
                            >
                              ✓ 标记完成
                            </button>
                          )}
                          <button
                            className="btn btn-outline"
                            style={{ fontSize: '12px', padding: '6px 14px' }}
                            onClick={() => openEditVisit(v)}
                          >
                            编辑
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 14px', color: '#ef4444' }}
                            onClick={() => deleteVisit(v.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">🏥</div>
                    <p>暂无复诊计划，点击上方"新增复诊"添加您的第一次产后复诊吧</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'medications' && (
            <div>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 className="card-title" style={{ marginBottom: 0 }}>💊 用药管理</h2>
                  <button className="btn btn-primary" onClick={openAddMed}>
                    + 新增用药
                  </button>
                </div>

                {medications.length > 0 ? (
                  medications.map(m => (
                    <div
                      key={m.id}
                      style={{
                        background: !m.is_active ? '#f9fafb' : 'white',
                        border: '1px solid #f0f0f0',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '12px',
                        opacity: !m.is_active ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '16px' }}>{m.name}</strong>
                            <span
                              className="tag"
                              style={{
                                background: '#60a5fa20',
                                color: '#3b82f6',
                                border: 'none',
                                fontSize: '12px',
                              }}
                            >
                              {m.category}
                            </span>
                            {!m.is_active && (
                              <span
                                className="tag"
                                style={{ background: '#9ca3af20', color: '#6b7280', border: 'none', fontSize: '12px' }}
                              >
                                已停用
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>
                            {m.dosage && <div>💊 剂量：{m.dosage}</div>}
                            <div>⏰ 每日 {m.frequency_per_day} 次
                              {m.specific_times && `（${m.specific_times}）`}
                            </div>
                            {m.meal_relation && m.meal_relation !== '无要求' && <div>🍽️ {m.meal_relation}服用</div>}
                            <div>
                              📅 服用周期：{m.start_date ? formatDate(m.start_date) : '开始'}
                              {m.end_date ? ` ~ ${formatDate(m.end_date)}` : ' ~ 持续'}
                            </div>
                            {m.visit && (
                              <div style={{ color: '#8b5cf6' }}>🏥 关联复诊：{m.visit.visit_type}（{formatDate(m.visit.visit_date)}）</div>
                            )}
                          </div>
                          {m.notes && (
                            <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fffbeb', borderRadius: '8px', fontSize: '13px', color: '#92400e' }}>
                              ⚠️ {m.notes}
                            </div>
                          )}
                          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', fontSize: '12px' }}>
                            <span style={{ color: '#22c55e' }}>✓ 今日已服 {m.today_taken}/{m.today_expected}</span>
                            {m.today_missed > 0 && <span style={{ color: '#ef4444' }}>✗ 漏服 {m.today_missed} 次</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: '12px', padding: '6px 14px' }}
                          onClick={() => openEditMed(m)}
                        >
                          编辑
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '6px 14px', color: m.is_active ? '#f59e0b' : '#22c55e' }}
                          onClick={() => toggleMedActive(m)}
                        >
                          {m.is_active ? '停用' : '启用'}
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '12px', padding: '6px 14px', color: '#ef4444' }}
                          onClick={() => deleteMed(m.id)}
                        >
                          删除
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: '12px', padding: '6px 14px', color: '#f97316' }}
                          onClick={() => openAddReaction(m.id)}
                        >
                          ⚠️ 记录不适
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">💊</div>
                    <p>暂无用药记录，点击上方"新增用药"添加处方或营养补充剂吧</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reactions' && (
            <div>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 className="card-title" style={{ marginBottom: 0 }}>⚠️ 不适反应记录</h2>
                  <button className="btn btn-primary" onClick={() => openAddReaction()}>
                    + 记录不适
                  </button>
                </div>

                {reactions.some(r => r.severity >= 4) && (
                  <div
                    style={{
                      padding: '12px',
                      background: '#fef2f2',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      border: '1px dashed #ef4444',
                    }}
                  >
                    <p style={{ fontSize: '14px', color: '#991b1b', lineHeight: 1.6 }}>
                      ⚠️ 您记录了较严重的不适反应，<strong>强烈建议尽快联系主治医生</strong>，
                      详细描述症状，切勿自行停药或调整剂量。
                    </p>
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: '8px', fontSize: '12px', padding: '6px 14px' }}
                      onClick={() => {
                        if (emergencyResources.length > 0) {
                          alert(`${emergencyResources[0].title}：${emergencyResources[0].contact}`)
                        }
                      }}
                    >
                      📞 查看紧急联系方式
                    </button>
                  </div>
                )}

                {reactions.length > 0 ? (
                  reactions.map(r => {
                    const sev = SEVERITY_OPTIONS.find(s => s.value === r.severity)
                    return (
                      <div
                        key={r.id}
                        style={{
                          background: r.severity >= 4 ? '#fef2f2' : 'white',
                          border: `1px solid ${r.severity >= 4 ? '#fecaca' : '#f0f0f0'}`,
                          borderRadius: '12px',
                          padding: '16px',
                          marginBottom: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '16px' }}>{r.symptom}</strong>
                              <span
                                className="tag"
                                style={{
                                  background: `${sev?.color || '#999'}20`,
                                  color: sev?.color || '#666',
                                  border: 'none',
                                  fontSize: '12px',
                                }}
                              >
                                {r.severity_label}
                              </span>
                              {r.consulted_doctor && (
                                <span
                                  className="tag"
                                  style={{ background: '#22c55e20', color: '#22c55e', border: 'none', fontSize: '12px' }}
                                >
                                  ✓ 已咨询医生
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>
                              <div>📅 {formatDate(r.reaction_date)}</div>
                              {r.medication_name && <div>💊 关联用药：{r.medication_name}</div>}
                              {r.duration_hours > 0 && <div>⏱️ 持续时间：约 {r.duration_hours} 小时</div>}
                            </div>
                            {r.description && (
                              <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>
                                <strong>详细描述：</strong>{r.description}
                              </div>
                            )}
                            {r.action_taken && (
                              <div style={{ marginTop: '6px', fontSize: '13px', color: '#666' }}>
                                <strong>处理方式：</strong>{r.action_taken}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 14px', color: '#ef4444' }}
                            onClick={() => deleteReaction(r.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">🌷</div>
                    <p>暂无不适反应记录，希望您一直身体健康！</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="card">
              <h2 className="card-title">📋 历史记录（近30天）</h2>
              {history.length > 0 ? (
                history.map((item, idx) => {
                  const typeInfo: Record<string, { icon: string; label: string; color: string }> = {
                    visit: { icon: '🏥', label: '复诊', color: '#3b82f6' },
                    med_log: { icon: '💊', label: '服药', color: '#8b5cf6' },
                    reaction: { icon: '⚠️', label: '不适', color: '#f97316' },
                  }
                  const info = typeInfo[item.type] || { icon: '📌', label: '记录', color: '#666' }
                  const data = item.data
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'white',
                        border: '1px solid #f0f0f0',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        marginBottom: '10px',
                        borderLeft: `4px solid ${info.color}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '18px' }}>{info.icon}</span>
                            <span
                              className="tag"
                              style={{
                                background: `${info.color}20`,
                                color: info.color,
                                border: 'none',
                                fontSize: '11px',
                                padding: '2px 8px',
                              }}
                            >
                              {info.label}
                            </span>
                            <span style={{ fontSize: '13px', color: '#888' }}>{formatDate(item.date)}</span>
                          </div>
                          <div style={{ fontSize: '14px', color: '#333', lineHeight: 1.6 }}>
                            {item.type === 'visit' && (
                              <>
                                <strong>{data.visit_type}</strong>
                                {data.hospital && ` · ${data.hospital}`}
                                <span
                                  style={{
                                    marginLeft: '8px',
                                    fontSize: '12px',
                                    color: data.status === 'completed' ? '#22c55e' : '#f59e0b',
                                  }}
                                >
                                  [{data.status_label}]
                                </span>
                              </>
                            )}
                            {item.type === 'med_log' && (
                              <>
                                <strong>{data.medication_name}</strong>
                                {data.scheduled_time && ` · 计划 ${data.scheduled_time}`}
                                {data.actual_time && ` · 实际 ${data.actual_time}`}
                                <span
                                  style={{
                                    marginLeft: '8px',
                                    fontSize: '12px',
                                    color: data.status === 'taken' ? '#22c55e' : data.status === 'missed' ? '#ef4444' : '#f59e0b',
                                  }}
                                >
                                  [{data.status_label}]
                                </span>
                              </>
                            )}
                            {item.type === 'reaction' && (
                              <>
                                <strong>{data.symptom}</strong>
                                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#f97316' }}>
                                  [{data.severity_label}]
                                </span>
                                {data.medication_name && <span style={{ fontSize: '12px', color: '#888' }}> · {data.medication_name}</span>}
                                {data.consulted_doctor && (
                                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#22c55e' }}>[已咨询医生]</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <p>暂无历史记录</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showVisitModal && (
        <div className="modal-overlay" onClick={() => setShowVisitModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingVisit ? '编辑复诊' : '新增复诊'}</h3>
              <button className="modal-close" onClick={() => setShowVisitModal(false)}>×</button>
            </div>

            <div className="form-group">
              <label className="form-label">复诊日期 *</label>
              <input
                type="date"
                className="form-input"
                value={visitForm.visit_date}
                onChange={e => setVisitForm({ ...visitForm, visit_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">复诊类型</label>
              <div className="tag-list">
                {VISIT_TYPES.map(t => (
                  <span
                    key={t}
                    className={`tag ${visitForm.visit_type === t ? 'selected' : ''}`}
                    onClick={() => setVisitForm({ ...visitForm, visit_type: t })}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">医院</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如：XX妇幼保健院"
                value={visitForm.hospital}
                onChange={e => setVisitForm({ ...visitForm, hospital: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">科室</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如：产后康复科"
                value={visitForm.department}
                onChange={e => setVisitForm({ ...visitForm, department: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">主治医生</label>
              <input
                type="text"
                className="form-input"
                placeholder="可选"
                value={visitForm.doctor_name}
                onChange={e => setVisitForm({ ...visitForm, doctor_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">检查项目</label>
              <textarea
                className="form-textarea"
                placeholder="例如：B超、血常规、盆底肌评估等"
                value={visitForm.check_items}
                onChange={e => setVisitForm({ ...visitForm, check_items: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">医生建议</label>
              <textarea
                className="form-textarea"
                placeholder="就诊后记录医生的建议"
                value={visitForm.doctor_advice}
                onChange={e => setVisitForm({ ...visitForm, doctor_advice: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowVisitModal(false)}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={submitVisit}
                disabled={submitting}
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompleteVisitModal && completingVisit && (
        <div className="modal-overlay" onClick={() => setShowCompleteVisitModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">完成复诊 - {completingVisit.visit_type}</h3>
              <button className="modal-close" onClick={() => setShowCompleteVisitModal(false)}>×</button>
            </div>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
              📅 原计划：{formatDate(completingVisit.visit_date)} ｜ {completingVisit.hospital || '医院'}
            </p>

            <div className="form-group">
              <label className="form-label">复诊结果 / 检查情况</label>
              <textarea
                className="form-textarea"
                placeholder="记录这次复诊的检查结果和情况"
                value={completeForm.result_note}
                onChange={e => setCompleteForm({ ...completeForm, result_note: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">医生建议 / 医嘱</label>
              <textarea
                className="form-textarea"
                placeholder="记录医生给出的建议和注意事项"
                value={completeForm.doctor_advice}
                onChange={e => setCompleteForm({ ...completeForm, doctor_advice: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowCompleteVisitModal(false)}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={submitCompleteVisit}
                disabled={submitting}
              >
                {submitting ? '提交中...' : '确认完成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMedModal && (
        <div className="modal-overlay" onClick={() => setShowMedModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingMed ? '编辑用药' : '新增用药 / 营养补充剂'}</h3>
              <button className="modal-close" onClick={() => setShowMedModal(false)}>×</button>
            </div>

            <div className="form-group">
              <label className="form-label">名称 *</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如：阿莫西林、钙片、维生素D等"
                value={medForm.name}
                onChange={e => setMedForm({ ...medForm, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">类别</label>
              <div className="tag-list">
                {MED_CATEGORIES.map(c => (
                  <span
                    key={c}
                    className={`tag ${medForm.category === c ? 'selected' : ''}`}
                    onClick={() => setMedForm({ ...medForm, category: c })}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">剂量</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如：每次1片（500mg）"
                value={medForm.dosage}
                onChange={e => setMedForm({ ...medForm, dosage: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">每日服用次数</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <input
                  type="range"
                  className="rating-slider"
                  min={1}
                  max={6}
                  value={medForm.frequency_per_day}
                  onChange={e => setMedForm({ ...medForm, frequency_per_day: parseInt(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <span className="rating-value" style={{ fontSize: '24px', minWidth: '40px' }}>
                  {medForm.frequency_per_day}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">具体时间（可选，用逗号分隔）</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如：08:00,12:00,20:00"
                value={medForm.specific_times}
                onChange={e => setMedForm({ ...medForm, specific_times: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">服用要求</label>
              <div className="tag-list">
                {MEAL_RELATIONS.map(m => (
                  <span
                    key={m}
                    className={`tag ${medForm.meal_relation === m ? 'selected' : ''}`}
                    onClick={() => setMedForm({ ...medForm, meal_relation: m })}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">开始日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={medForm.start_date}
                  onChange={e => setMedForm({ ...medForm, start_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">结束日期（可选）</label>
                <input
                  type="date"
                  className="form-input"
                  value={medForm.end_date}
                  onChange={e => setMedForm({ ...medForm, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">备注 / 注意事项</label>
              <textarea
                className="form-textarea"
                placeholder="例如：服药后避免开车、冷藏保存等"
                value={medForm.notes}
                onChange={e => setMedForm({ ...medForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowMedModal(false)}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={submitMed}
                disabled={submitting}
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReactionModal && (
        <div className="modal-overlay" onClick={() => setShowReactionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">记录不适反应</h3>
              <button className="modal-close" onClick={() => setShowReactionModal(false)}>×</button>
            </div>

            <div className="form-group">
              <label className="form-label">日期</label>
              <input
                type="date"
                className="form-input"
                value={reactionForm.reaction_date}
                onChange={e => setReactionForm({ ...reactionForm, reaction_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">关联用药（可选）</label>
              <select
                className="form-select"
                value={reactionForm.medication_id || ''}
                onChange={e => setReactionForm({ ...reactionForm, medication_id: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">不关联</option>
                {medications.filter(m => m.is_active).map(m => (
                  <option key={m.id} value={m.id}>{m.name}（{m.category}）</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">不适症状 *</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如：恶心、头晕、皮疹、胃痛等"
                value={reactionForm.symptom}
                onChange={e => setReactionForm({ ...reactionForm, symptom: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">严重程度</label>
              <div className="tag-list">
                {SEVERITY_OPTIONS.map(s => (
                  <span
                    key={s.value}
                    className={`tag ${reactionForm.severity === s.value ? 'selected' : ''}`}
                    onClick={() => setReactionForm({ ...reactionForm, severity: s.value })}
                    style={{
                      borderColor: reactionForm.severity === s.value ? s.color : undefined,
                      background: reactionForm.severity === s.value ? `${s.color}20` : undefined,
                      color: reactionForm.severity === s.value ? s.color : undefined,
                    }}
                  >
                    {s.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">持续时间（小时）</label>
              <input
                type="number"
                min="0"
                step="0.5"
                className="form-input"
                value={reactionForm.duration_hours}
                onChange={e => setReactionForm({ ...reactionForm, duration_hours: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">详细描述</label>
              <textarea
                className="form-textarea"
                placeholder="请详细描述不适的具体表现"
                value={reactionForm.description}
                onChange={e => setReactionForm({ ...reactionForm, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">采取的措施</label>
              <textarea
                className="form-textarea"
                placeholder="例如：停药观察、喝温水、休息等"
                value={reactionForm.action_taken}
                onChange={e => setReactionForm({ ...reactionForm, action_taken: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="support-toggle" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={reactionForm.consulted_doctor}
                  onChange={e => setReactionForm({ ...reactionForm, consulted_doctor: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#ff6b8a' }}
                />
                <span style={{ fontWeight: 500, color: '#555' }}>已咨询医生</span>
              </label>
            </div>

            {reactionForm.severity >= 4 && (
              <div
                style={{
                  padding: '12px',
                  background: '#fef2f2',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: '1px dashed #ef4444',
                }}
              >
                <p style={{ fontSize: '13px', color: '#991b1b', lineHeight: 1.6 }}>
                  ⚠️ 您选择的严重程度较高，<strong>强烈建议您尽快联系主治医生</strong>！
                  切勿自行判断或拖延，专业诊断很重要。
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowReactionModal(false)}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={submitReaction}
                disabled={submitting}
              >
                {submitting ? '保存中...' : '保存记录'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CareMedication
