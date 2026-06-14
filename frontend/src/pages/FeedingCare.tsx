import { useState, useEffect } from 'react'
import { feedingAPI } from '../api'
import {
  FeedingRecord,
  BreastCareRecord,
  LactationGoal,
  LactationAdvice,
  FeedingAlert,
  FeedingOverview,
} from '../types'

const FEED_TYPES = [
  { key: 'breast', label: '🤱 亲喂' },
  { key: 'bottle', label: '🍼 瓶喂' },
  { key: 'pump', label: '💧 吸奶' },
]

const BREAST_SIDES = [
  { key: 'left', label: '左侧' },
  { key: 'right', label: '右侧' },
  { key: 'both', label: '交替' },
]

const CARE_TYPES = [
  { key: 'engorgement', label: '乳房胀痛' },
  { key: 'blocked_duct', label: '堵奶' },
  { key: 'cracked_nipple', label: '乳头皲裂' },
  { key: 'mastitis', label: '乳腺炎' },
  { key: 'sore_nipple', label: '乳头疼痛' },
  { key: 'other', label: '其他不适' },
]

const ADVISOR_TYPES = [
  { key: 'doctor', label: '医生' },
  { key: 'lactation_consultant', label: '母乳顾问' },
  { key: 'nurse', label: '护士' },
  { key: 'other', label: '其他' },
]

const GOAL_TYPES = [
  { key: 'daily_feed_count', label: '每日喂养次数', unit: '次' },
  { key: 'daily_milk_amount', label: '每日产奶量', unit: 'ml' },
  { key: 'pump_frequency', label: '每日吸奶次数', unit: '次' },
  { key: 'water_intake', label: '每日饮水量', unit: 'ml' },
  { key: 'rest_hours', label: '每日休息时长', unit: '小时' },
]

function FeedingCare() {
  const [activeTab, setActiveTab] = useState<'today' | 'records' | 'care' | 'goals' | 'advices'>('today')
  const [overview, setOverview] = useState<FeedingOverview | null>(null)
  const [allRecords, setAllRecords] = useState<FeedingRecord[]>([])
  const [careRecords, setCareRecords] = useState<BreastCareRecord[]>([])
  const [goals, setGoals] = useState<LactationGoal[]>([])
  const [advices, setAdvices] = useState<LactationAdvice[]>([])

  const [showRecordModal, setShowRecordModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FeedingRecord | null>(null)
  const [recordForm, setRecordForm] = useState({
    feed_type: 'breast' as 'breast' | 'bottle' | 'pump',
    feed_time: '',
    duration_minutes: 15,
    breast_side: '' as '' | 'left' | 'right' | 'both',
    milk_amount_ml: 0,
    baby_acceptance: 3,
    note: '',
  })

  const [showCareModal, setShowCareModal] = useState(false)
  const [editingCare, setEditingCare] = useState<BreastCareRecord | null>(null)
  const [careForm, setCareForm] = useState({
    care_type: 'engorgement' as any,
    severity: 3,
    breast_side: 'both' as 'left' | 'right' | 'both',
    description: '',
    duration_hours: 0,
    action_taken: '',
    consulted_doctor: false,
  })

  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<LactationGoal | null>(null)
  const [goalForm, setGoalForm] = useState({
    goal_type: 'daily_feed_count',
    target_value: 8,
    unit: '次',
    note: '',
  })

  const [showAdviceModal, setShowAdviceModal] = useState(false)
  const [editingAdvice, setEditingAdvice] = useState<LactationAdvice | null>(null)
  const [adviceForm, setAdviceForm] = useState({
    advisor: '',
    advisor_type: 'doctor' as any,
    content: '',
    is_completed: false,
    note: '',
  })

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      const [todayRes, recordsRes, careRes, goalsRes, advicesRes] = await Promise.all([
        feedingAPI.getToday(1),
        feedingAPI.getRecords(1, 30),
        feedingAPI.getCareRecords(1, 30),
        feedingAPI.getGoals(1),
        feedingAPI.getAdvices(1),
      ])

      if (todayRes.data.success) setOverview(todayRes.data.data)
      if (recordsRes.data.success) setAllRecords(recordsRes.data.data)
      if (careRes.data.success) setCareRecords(careRes.data.data)
      if (goalsRes.data.success) setGoals(goalsRes.data.data)
      if (advicesRes.data.success) setAdvices(advicesRes.data.data)
    } catch (e) {
      console.error('加载喂养数据失败', e)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  const formatDateTime = (dtStr: string) => {
    const d = new Date(dtStr)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const openAddRecord = () => {
    setEditingRecord(null)
    const now = new Date()
    setRecordForm({
      feed_type: 'breast',
      feed_time: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      duration_minutes: 15,
      breast_side: '',
      milk_amount_ml: 0,
      baby_acceptance: 3,
      note: '',
    })
    setShowRecordModal(true)
  }

  const openEditRecord = (record: FeedingRecord) => {
    setEditingRecord(record)
    setRecordForm({
      feed_type: record.feed_type,
      feed_time: record.feed_time,
      duration_minutes: record.duration_minutes,
      breast_side: record.breast_side,
      milk_amount_ml: record.milk_amount_ml,
      baby_acceptance: record.baby_acceptance,
      note: record.note,
    })
    setShowRecordModal(true)
  }

  const handleSaveRecord = async () => {
    setSubmitting(true)
    try {
      if (editingRecord) {
        const res = await feedingAPI.updateRecord(editingRecord.id, {
          ...recordForm,
          user_id: 1,
        })
        if (res.data.success) {
          alert('记录已更新！')
        }
      } else {
        const res = await feedingAPI.addRecord({
          ...recordForm,
          user_id: 1,
        })
        if (res.data.success) {
          alert('记录已保存！')
        }
      }
      setShowRecordModal(false)
      loadAllData()
    } catch (e) {
      console.error('保存记录失败', e)
      alert('保存失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRecord = async (id: number) => {
    if (!confirm('确定要删除这条喂养记录吗？')) return
    try {
      const res = await feedingAPI.deleteRecord(id)
      if (res.data.success) {
        alert('已删除')
        loadAllData()
      }
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  const openAddCare = () => {
    setEditingCare(null)
    setCareForm({
      care_type: 'engorgement',
      severity: 3,
      breast_side: 'both',
      description: '',
      duration_hours: 0,
      action_taken: '',
      consulted_doctor: false,
    })
    setShowCareModal(true)
  }

  const openEditCare = (record: BreastCareRecord) => {
    setEditingCare(record)
    setCareForm({
      care_type: record.care_type,
      severity: record.severity,
      breast_side: record.breast_side,
      description: record.description,
      duration_hours: record.duration_hours,
      action_taken: record.action_taken,
      consulted_doctor: record.consulted_doctor,
    })
    setShowCareModal(true)
  }

  const handleSaveCare = async () => {
    setSubmitting(true)
    try {
      if (editingCare) {
        const res = await feedingAPI.updateCareRecord(editingCare.id, {
          ...careForm,
          user_id: 1,
        })
        if (res.data.success) alert('护理记录已更新！')
      } else {
        const res = await feedingAPI.addCareRecord({
          ...careForm,
          user_id: 1,
        })
        if (res.data.success) alert('护理记录已保存！')
      }
      setShowCareModal(false)
      loadAllData()
    } catch (e) {
      console.error('保存失败', e)
      alert('保存失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCare = async (id: number) => {
    if (!confirm('确定要删除这条护理记录吗？')) return
    try {
      const res = await feedingAPI.deleteCareRecord(id)
      if (res.data.success) {
        alert('已删除')
        loadAllData()
      }
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  const openAddGoal = () => {
    setEditingGoal(null)
    setGoalForm({
      goal_type: 'daily_feed_count',
      target_value: 8,
      unit: '次',
      note: '',
    })
    setShowGoalModal(true)
  }

  const openEditGoal = (goal: LactationGoal) => {
    setEditingGoal(goal)
    setGoalForm({
      goal_type: goal.goal_type,
      target_value: goal.target_value,
      unit: goal.unit,
      note: goal.note,
    })
    setShowGoalModal(true)
  }

  const handleSaveGoal = async () => {
    setSubmitting(true)
    try {
      if (editingGoal) {
        const res = await feedingAPI.updateGoal(editingGoal.id, {
          ...goalForm,
          user_id: 1,
        })
        if (res.data.success) alert('目标已更新！')
      } else {
        const res = await feedingAPI.addGoal({
          ...goalForm,
          user_id: 1,
        })
        if (res.data.success) alert('目标已保存！')
      }
      setShowGoalModal(false)
      loadAllData()
    } catch (e) {
      console.error('保存失败', e)
      alert('保存失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteGoal = async (id: number) => {
    if (!confirm('确定要删除这个目标吗？')) return
    try {
      const res = await feedingAPI.deleteGoal(id)
      if (res.data.success) {
        alert('已删除')
        loadAllData()
      }
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  const openAddAdvice = () => {
    setEditingAdvice(null)
    setAdviceForm({
      advisor: '',
      advisor_type: 'doctor',
      content: '',
      is_completed: false,
      note: '',
    })
    setShowAdviceModal(true)
  }

  const openEditAdvice = (advice: LactationAdvice) => {
    setEditingAdvice(advice)
    setAdviceForm({
      advisor: advice.advisor,
      advisor_type: advice.advisor_type,
      content: advice.content,
      is_completed: advice.is_completed,
      note: advice.note,
    })
    setShowAdviceModal(true)
  }

  const handleSaveAdvice = async () => {
    if (!adviceForm.advisor.trim() || !adviceForm.content.trim()) {
      alert('顾问姓名和建议内容不能为空')
      return
    }
    setSubmitting(true)
    try {
      if (editingAdvice) {
        const res = await feedingAPI.updateAdvice(editingAdvice.id, {
          ...adviceForm,
          user_id: 1,
        })
        if (res.data.success) alert('建议已更新！')
      } else {
        const res = await feedingAPI.addAdvice({
          ...adviceForm,
          user_id: 1,
        })
        if (res.data.success) alert('建议已保存！')
      }
      setShowAdviceModal(false)
      loadAllData()
    } catch (e) {
      console.error('保存失败', e)
      alert('保存失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteAdvice = async (id: number) => {
    if (!confirm('确定要删除这条建议吗？')) return
    try {
      const res = await feedingAPI.deleteAdvice(id)
      if (res.data.success) {
        alert('已删除')
        loadAllData()
      }
    } catch (e) {
      console.error('删除失败', e)
    }
  }

  const getAlertStyle = (level: string) => {
    switch (level) {
      case 'urgent':
        return { background: '#fef2f2', borderColor: '#ef4444', titleColor: '#991b1b' }
      case 'warn':
        return { background: '#fffbeb', borderColor: '#f59e0b', titleColor: '#92400e' }
      default:
        return { background: '#eff6ff', borderColor: '#3b82f6', titleColor: '#1e40af' }
    }
  }

  return (
    <div>
      <div className="card">
        <h2 className="card-title">🤱 母乳喂养与泌乳护理</h2>

        <div className="tabs-row">
          <button
            className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
            onClick={() => setActiveTab('today')}
          >
            今日概览
          </button>
          <button
            className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
            onClick={() => setActiveTab('records')}
          >
            喂养记录
          </button>
          <button
            className={`tab-btn ${activeTab === 'care' ? 'active' : ''}`}
            onClick={() => setActiveTab('care')}
          >
            乳房护理
          </button>
          <button
            className={`tab-btn ${activeTab === 'goals' ? 'active' : ''}`}
            onClick={() => setActiveTab('goals')}
          >
            泌乳目标
          </button>
          <button
            className={`tab-btn ${activeTab === 'advices' ? 'active' : ''}`}
            onClick={() => setActiveTab('advices')}
          >
            专业建议
          </button>
        </div>

        {activeTab === 'today' && overview && (
          <div>
            {overview.need_urgent && (
              <div
                style={{
                  padding: '16px',
                  background: '#fef2f2',
                  border: '2px solid #ef4444',
                  borderRadius: '12px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🚨</span>
                  <strong style={{ color: '#991b1b', fontSize: '16px' }}>需要紧急关注</strong>
                </div>
                <p style={{ color: '#991b1b', fontSize: '13px', lineHeight: 1.6 }}>
                  系统检测到需要您立即关注的喂养或健康问题，请查看下方提醒并及时处理。
                </p>
              </div>
            )}

            {overview.alerts.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '15px', marginBottom: '12px', color: '#374151' }}>
                  {overview.alerts.some(a => a.level === 'urgent') ? '⚠️ 重要提醒' : '💡 温馨提示'}
                </h3>
                {overview.alerts.map((alert: FeedingAlert, idx: number) => {
                  const style = getAlertStyle(alert.level)
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '14px',
                        background: style.background,
                        border: `1px solid ${style.borderColor}`,
                        borderRadius: '10px',
                        marginBottom: '10px',
                      }}
                    >
                      <h4 style={{ color: style.titleColor, fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>
                        {alert.title}
                      </h4>
                      <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{alert.content}</p>
                      {alert.action_hint && (
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', fontStyle: 'italic' }}>
                          💡 {alert.action_hint}
                        </p>
                      )}
                      {alert.resources && alert.resources.length > 0 && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                          <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>可联系的支持资源：</p>
                          {alert.resources.map((r, i) => (
                            <div key={i} style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>
                              • <strong>{r.title}</strong>：{r.contact}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', marginBottom: '20px' }}>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#ec4899' }}>{overview.today.summary.count}</div>
                <div className="stat-label">今日喂养次数</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#3b82f6' }}>{overview.today.summary.total_milk_ml}ml</div>
                <div className="stat-label">今日吸奶量</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#10b981' }}>{overview.today.summary.total_duration_min}分</div>
                <div className="stat-label">今日喂养时长</div>
              </div>
            </div>

            {overview.goals_today.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '15px', marginBottom: '12px', color: '#374151' }}>🎯 今日目标进度</h3>
                {overview.goals_today.map(goal => (
                  <div key={goal.id} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#374151' }}>{goal.goal_type_label}</span>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>
                        {goal.current_value}/{goal.target_value}{goal.unit}
                      </span>
                    </div>
                    <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(goal.completion_rate, 100)}%`,
                          background: goal.completion_rate >= 100 ? '#10b981' : '#ec4899',
                          borderRadius: '4px',
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={openAddRecord}
              >
                ➕ 新增喂养记录
              </button>
              <button
                className="btn btn-outline"
                onClick={openAddCare}
              >
                🏥 记录护理状态
              </button>
            </div>

            <div>
              <h3 style={{ fontSize: '15px', marginBottom: '12px', color: '#374151' }}>⏰ 今日喂养时间线</h3>
              {overview.today.records.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🤱</div>
                  <p>今天还没有喂养记录，点击"新增喂养记录"开始记录吧</p>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '15px',
                      top: '8px',
                      bottom: '8px',
                      width: '2px',
                      background: '#e5e7eb',
                    }}
                  />
                  {overview.today.records.map(record => {
                    const feedTypeInfo = FEED_TYPES.find(t => t.key === record.feed_type)
                    return (
                      <div
                        key={record.id}
                        style={{
                          display: 'flex',
                          gap: '12px',
                          padding: '12px 0',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#ec4899',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            zIndex: 1,
                            flexShrink: 0,
                          }}
                        >
                          {feedTypeInfo?.label.split(' ')[0]}
                        </div>
                        <div style={{ flex: 1, background: '#fafafa', borderRadius: '10px', padding: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                                {feedTypeInfo?.label}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                {record.time_label || formatDateTime(record.feed_time)}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn btn-text"
                                style={{ fontSize: '12px', padding: '4px 8px' }}
                                onClick={() => openEditRecord(record)}
                              >
                                编辑
                              </button>
                              <button
                                className="btn btn-text"
                                style={{ fontSize: '12px', padding: '4px 8px', color: '#ef4444' }}
                                onClick={() => handleDeleteRecord(record.id)}
                              >
                                删除
                              </button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px', fontSize: '12px', color: '#4b5563' }}>
                            {record.duration_minutes > 0 && <span>⏱ {record.duration_minutes}分钟</span>}
                            {record.breast_side && (
                              <span>
                                📍 {record.breast_side === 'left' ? '左侧' : record.breast_side === 'right' ? '右侧' : '交替'}
                              </span>
                            )}
                            {record.milk_amount_ml > 0 && <span>💧 {record.milk_amount_ml}ml</span>}
                            {record.baby_acceptance > 0 && (
                              <span>
                                👶 接受度：{'⭐'.repeat(record.baby_acceptance)}
                              </span>
                            )}
                          </div>
                          {record.note && (
                            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px', fontStyle: 'italic' }}>
                              {record.note}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', color: '#374151' }}>📋 喂养历史记录</h3>
              <button className="btn btn-primary" onClick={openAddRecord}>
                ➕ 新增记录
              </button>
            </div>
            {allRecords.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>还没有喂养记录</p>
              </div>
            ) : (
              allRecords.map(record => {
                const feedTypeInfo = FEED_TYPES.find(t => t.key === record.feed_type)
                return (
                  <div key={record.id} className="record-item">
                    <div className="record-details" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div className="record-date">{formatDateTime(record.feed_time)}</div>
                          <div style={{ marginTop: '4px', fontWeight: 500, color: '#374151' }}>
                            {feedTypeInfo?.label}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-text"
                            style={{ fontSize: '12px' }}
                            onClick={() => openEditRecord(record)}
                          >
                            编辑
                          </button>
                          <button
                            className="btn btn-text"
                            style={{ fontSize: '12px', color: '#ef4444' }}
                            onClick={() => handleDeleteRecord(record.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                        {record.duration_minutes > 0 && <span>⏱ {record.duration_minutes}分钟</span>}
                        {record.breast_side && (
                          <span>
                            📍 {record.breast_side === 'left' ? '左侧' : record.breast_side === 'right' ? '右侧' : '交替'}
                          </span>
                        )}
                        {record.milk_amount_ml > 0 && <span>💧 {record.milk_amount_ml}ml</span>}
                        {record.baby_acceptance > 0 && (
                          <span>👶 接受度：{record.baby_acceptance}/5</span>
                        )}
                      </div>
                      {record.note && (
                        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>{record.note}</p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'care' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', color: '#374151' }}>🏥 乳房护理记录</h3>
              <button className="btn btn-primary" onClick={openAddCare}>
                ➕ 新增记录
              </button>
            </div>
            {careRecords.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏥</div>
                <p>还没有护理记录</p>
              </div>
            ) : (
              careRecords.map(record => {
                const sevColor = record.severity >= 4 ? '#ef4444' : record.severity >= 3 ? '#f59e0b' : '#10b981'
                return (
                  <div key={record.id} className="record-item">
                    <div className="record-details" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div className="record-date">{formatDate(record.record_date)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span style={{ fontWeight: 500, color: '#374151' }}>{record.care_type_label}</span>
                            <span
                              style={{
                                padding: '2px 8px',
                                background: sevColor + '20',
                                color: sevColor,
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                            >
                              {record.severity_label}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-text"
                            style={{ fontSize: '12px' }}
                            onClick={() => openEditCare(record)}
                          >
                            编辑
                          </button>
                          <button
                            className="btn btn-text"
                            style={{ fontSize: '12px', color: '#ef4444' }}
                            onClick={() => handleDeleteCare(record.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                        <span>
                          📍 {record.breast_side === 'left' ? '左侧' : record.breast_side === 'right' ? '右侧' : '双侧'}
                        </span>
                        {record.duration_hours > 0 && <span>⏱ 持续{record.duration_hours}小时</span>}
                        {record.consulted_doctor && <span style={{ color: '#3b82f6' }}>👨‍⚕️ 已咨询医生</span>}
                      </div>
                      {record.description && (
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>{record.description}</p>
                      )}
                      {record.action_taken && (
                        <p style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
                          已采取措施：{record.action_taken}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'goals' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', color: '#374151' }}>🎯 泌乳目标</h3>
              <button className="btn btn-primary" onClick={openAddGoal}>
                ➕ 新增目标
              </button>
            </div>
            {goals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <p>还没有设置泌乳目标</p>
              </div>
            ) : (
              goals.map(goal => (
                <div key={goal.id} className="record-item">
                  <div className="record-details" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{goal.goal_type_label}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          目标：{goal.target_value}{goal.unit} · 当前：{goal.current_value}{goal.unit}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-text"
                          style={{ fontSize: '12px' }}
                          onClick={() => openEditGoal(goal)}
                        >
                          编辑
                        </button>
                        <button
                          className="btn btn-text"
                          style={{ fontSize: '12px', color: '#ef4444' }}
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                        <span>完成进度</span>
                        <span style={{ fontWeight: 600, color: goal.completion_rate >= 100 ? '#10b981' : '#ec4899' }}>
                          {goal.completion_rate}%
                        </span>
                      </div>
                      <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(goal.completion_rate, 100)}%`,
                            background: goal.completion_rate >= 100 ? '#10b981' : '#ec4899',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>
                    {goal.note && (
                      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px', fontStyle: 'italic' }}>{goal.note}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'advices' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '15px', color: '#374151' }}>💬 医生/母乳顾问建议</h3>
              <button className="btn btn-primary" onClick={openAddAdvice}>
                ➕ 新增建议
              </button>
            </div>
            {advices.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <p>还没有记录专业建议</p>
              </div>
            ) : (
              advices.map(advice => (
                <div key={advice.id} className="record-item">
                  <div className="record-details" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{advice.advisor}</span>
                          <span
                            style={{
                              padding: '2px 8px',
                              background: '#dbeafe',
                              color: '#1e40af',
                              borderRadius: '10px',
                              fontSize: '11px',
                            }}
                          >
                            {advice.advisor_type_label}
                          </span>
                          {advice.is_completed && (
                            <span
                              style={{
                                padding: '2px 8px',
                                background: '#d1fae5',
                                color: '#065f46',
                                borderRadius: '10px',
                                fontSize: '11px',
                              }}
                            >
                              已完成
                            </span>
                          )}
                        </div>
                        {advice.advice_date && (
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            {formatDate(advice.advice_date)}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-text"
                          style={{ fontSize: '12px' }}
                          onClick={() => openEditAdvice(advice)}
                        >
                          编辑
                        </button>
                        <button
                          className="btn btn-text"
                          style={{ fontSize: '12px', color: '#ef4444' }}
                          onClick={() => handleDeleteAdvice(advice.id)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: '#374151', marginTop: '10px', lineHeight: 1.6 }}>{advice.content}</p>
                    {advice.note && (
                      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px', fontStyle: 'italic' }}>备注：{advice.note}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showRecordModal && (
        <div className="modal-overlay" onClick={() => setShowRecordModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>{editingRecord ? '编辑喂养记录' : '新增喂养记录'}</h3>

            <div className="form-group">
              <label className="form-label">喂养类型</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {FEED_TYPES.map(type => (
                  <button
                    key={type.key}
                    className={`btn ${recordForm.feed_type === type.key ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1 }}
                    onClick={() => setRecordForm({ ...recordForm, feed_type: type.key as any })}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">喂养时间</label>
              <input
                type="datetime-local"
                className="form-input"
                value={recordForm.feed_time.replace(' ', 'T').slice(0, 16)}
                onChange={e => setRecordForm({ ...recordForm, feed_time: e.target.value.replace('T', ' ') })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">持续时长（分钟）</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="180"
                value={recordForm.duration_minutes}
                onChange={e => setRecordForm({ ...recordForm, duration_minutes: parseInt(e.target.value) || 0 })}
              />
            </div>

            {recordForm.feed_type !== 'bottle' && (
              <div className="form-group">
                <label className="form-label">乳房侧</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className={`btn ${recordForm.breast_side === '' ? 'btn-outline' : 'btn-outline'}`}
                    style={{ opacity: recordForm.breast_side === '' ? 1 : 0.6 }}
                    onClick={() => setRecordForm({ ...recordForm, breast_side: '' })}
                  >
                    不限
                  </button>
                  {BREAST_SIDES.map(side => (
                    <button
                      key={side.key}
                      className={`btn ${recordForm.breast_side === side.key ? 'btn-primary' : 'btn-outline'}`}
                      style={{ flex: 1 }}
                      onClick={() => setRecordForm({ ...recordForm, breast_side: side.key as any })}
                    >
                      {side.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">奶量（ml）</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="500"
                value={recordForm.milk_amount_ml}
                onChange={e => setRecordForm({ ...recordForm, milk_amount_ml: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">宝宝接受度</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: `2px solid ${recordForm.baby_acceptance >= n ? '#ec4899' : '#e5e7eb'}`,
                      background: recordForm.baby_acceptance >= n ? '#fdf2f8' : 'white',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '20px',
                    }}
                    onClick={() => setRecordForm({ ...recordForm, baby_acceptance: n })}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', textAlign: 'center' }}>
                {recordForm.baby_acceptance === 1 && '非常抗拒'}
                {recordForm.baby_acceptance === 2 && '不太接受'}
                {recordForm.baby_acceptance === 3 && '一般'}
                {recordForm.baby_acceptance === 4 && '比较配合'}
                {recordForm.baby_acceptance === 5 && '非常配合'}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">备注</label>
              <textarea
                className="form-textarea"
                placeholder="记录特殊情况..."
                value={recordForm.note}
                onChange={e => setRecordForm({ ...recordForm, note: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowRecordModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveRecord} disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCareModal && (
        <div className="modal-overlay" onClick={() => setShowCareModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>{editingCare ? '编辑护理记录' : '新增护理记录'}</h3>

            <div className="form-group">
              <label className="form-label">不适类型</label>
              <select
                className="form-input"
                value={careForm.care_type}
                onChange={e => setCareForm({ ...careForm, care_type: e.target.value })}
              >
                {CARE_TYPES.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">严重程度</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map(n => {
                  const colors = ['#10b981', '#34d399', '#fbbf24', '#f97316', '#ef4444']
                  const labels = ['轻微', '较轻', '一般', '较重', '严重']
                  return (
                    <button
                      key={n}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        border: `2px solid ${careForm.severity === n ? colors[n - 1] : '#e5e7eb'}`,
                        background: careForm.severity === n ? colors[n - 1] + '20' : 'white',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                      onClick={() => setCareForm({ ...careForm, severity: n })}
                    >
                      <div style={{ fontWeight: 600 }}>{labels[n - 1]}</div>
                      <div style={{ fontSize: '18px' }}>{'●'.repeat(n)}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">乳房侧</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {BREAST_SIDES.map(side => (
                  <button
                    key={side.key}
                    className={`btn ${careForm.breast_side === side.key ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1 }}
                    onClick={() => setCareForm({ ...careForm, breast_side: side.key as any })}
                  >
                    {side.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">持续时长（小时）</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="168"
                step="0.5"
                value={careForm.duration_hours}
                onChange={e => setCareForm({ ...careForm, duration_hours: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">症状描述</label>
              <textarea
                className="form-textarea"
                placeholder="详细描述您的症状..."
                value={careForm.description}
                onChange={e => setCareForm({ ...careForm, description: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">已采取的措施</label>
              <input
                type="text"
                className="form-input"
                placeholder="如：温热敷、按摩、冷敷等"
                value={careForm.action_taken}
                onChange={e => setCareForm({ ...careForm, action_taken: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <input
                type="checkbox"
                id="consulted_doctor"
                checked={careForm.consulted_doctor}
                onChange={e => setCareForm({ ...careForm, consulted_doctor: e.target.checked })}
              />
              <label htmlFor="consulted_doctor" style={{ fontSize: '13px', color: '#374151' }}>已咨询医生</label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowCareModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveCare} disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGoalModal && (
        <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <h3>{editingGoal ? '编辑目标' : '新增目标'}</h3>

            <div className="form-group">
              <label className="form-label">目标类型</label>
              <select
                className="form-input"
                value={goalForm.goal_type}
                onChange={e => {
                  const info = GOAL_TYPES.find(t => t.key === e.target.value)
                  setGoalForm({ ...goalForm, goal_type: e.target.value, unit: info?.unit || '' })
                }}
              >
                {GOAL_TYPES.map(t => (
                  <option key={t.key} value={t.key}>{t.label}（{t.unit}）</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">目标值（{goalForm.unit}）</label>
              <input
                type="number"
                className="form-input"
                min="0"
                value={goalForm.target_value}
                onChange={e => setGoalForm({ ...goalForm, target_value: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">备注</label>
              <textarea
                className="form-textarea"
                placeholder="可选..."
                value={goalForm.note}
                onChange={e => setGoalForm({ ...goalForm, note: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowGoalModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveGoal} disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdviceModal && (
        <div className="modal-overlay" onClick={() => setShowAdviceModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>{editingAdvice ? '编辑建议' : '新增建议'}</h3>

            <div className="form-group">
              <label className="form-label">顾问姓名</label>
              <input
                type="text"
                className="form-input"
                placeholder="如：张医生、李顾问"
                value={adviceForm.advisor}
                onChange={e => setAdviceForm({ ...adviceForm, advisor: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">顾问类型</label>
              <select
                className="form-input"
                value={adviceForm.advisor_type}
                onChange={e => setAdviceForm({ ...adviceForm, advisor_type: e.target.value })}
              >
                {ADVISOR_TYPES.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">建议内容</label>
              <textarea
                className="form-textarea"
                placeholder="记录医生或母乳顾问的专业建议..."
                value={adviceForm.content}
                onChange={e => setAdviceForm({ ...adviceForm, content: e.target.value })}
                style={{ minHeight: '120px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <input
                type="checkbox"
                id="advice_completed"
                checked={adviceForm.is_completed}
                onChange={e => setAdviceForm({ ...adviceForm, is_completed: e.target.checked })}
              />
              <label htmlFor="advice_completed" style={{ fontSize: '13px', color: '#374151' }}>已完成/已采纳</label>
            </div>

            <div className="form-group">
              <label className="form-label">备注</label>
              <textarea
                className="form-textarea"
                placeholder="执行情况或补充说明..."
                value={adviceForm.note}
                onChange={e => setAdviceForm({ ...adviceForm, note: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAdviceModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveAdvice} disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FeedingCare
