import { useState, useEffect } from 'react'
import { rehabAPI } from '../api'
import {
  RehabTodayData,
  RehabTrainingRecord,
  RehabGoal,
  RehabContraindication,
  RehabAlert,
  RehabHistoryItem,
  RehabTrainingType,
} from '../types'

const INTENSITY_OPTIONS = [
  { value: 1, label: '非常轻松' },
  { value: 2, label: '轻松' },
  { value: 3, label: '适中' },
  { value: 4, label: '稍强' },
  { value: 5, label: '高强度' },
]

const PAIN_LEVEL_OPTIONS = [
  { value: 0, label: '无痛' },
  { value: 1, label: '轻微' },
  { value: 2, label: '轻度' },
  { value: 3, label: '中度' },
  { value: 4, label: '较重' },
  { value: 5, label: '严重' },
]

const GOAL_TYPE_OPTIONS = [
  { value: 'daily_training_minutes', label: '每日训练时长', unit: '分钟' },
  { value: 'weekly_training_days', label: '每周训练天数', unit: '天' },
  { value: 'pelvic_floor_strength', label: '盆底肌力量等级', unit: '级' },
  { value: 'diastasis_recti_gap', label: '腹直肌分离距离', unit: '指' },
  { value: 'daily_steps', label: '每日步数', unit: '步' },
  { value: 'pain_level', label: '疼痛程度控制', unit: '分' },
  { value: 'weekly_yoga_sessions', label: '每周瑜伽次数', unit: '次' },
  { value: 'sleep_quality', label: '睡眠质量提升', unit: '分' },
]

const SOURCE_OPTIONS = [
  { value: 'doctor', label: '医生' },
  { value: 'therapist', label: '康复师' },
  { value: 'nurse', label: '护士' },
  { value: 'self', label: '自我总结' },
  { value: 'other', label: '其他' },
]

function RehabTraining() {
  const [activeTab, setActiveTab] = useState<'today' | 'goals' | 'contra' | 'history'>('today')
  const [todayData, setTodayData] = useState<RehabTodayData | null>(null)
  const [history, setHistory] = useState<RehabHistoryItem[]>([])
  const [goals, setGoals] = useState<RehabGoal[]>([])
  const [contraindications, setContraindications] = useState<RehabContraindication[]>([])
  const [loading, setLoading] = useState(false)

  const [showRecordModal, setShowRecordModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RehabTrainingRecord | null>(null)
  const [recordForm, setRecordForm] = useState({
    training_type: 'pelvic_floor',
    duration_minutes: 15,
    intensity: 2,
    completed: true,
    pain_level: 0,
    has_leakage: false,
    leakage_severity: 0,
    has_dizziness: false,
    has_fatigue: false,
    other_symptoms: '',
    note: '',
    record_date: '',
  })

  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<RehabGoal | null>(null)
  const [goalForm, setGoalForm] = useState({
    goal_type: 'daily_training_minutes',
    target_value: 30,
    current_value: 0,
    unit: '分钟',
    description: '',
    start_date: '',
    target_date: '',
  })

  const [showContraModal, setShowContraModal] = useState(false)
  const [editingContra, setEditingContra] = useState<RehabContraindication | null>(null)
  const [contraForm, setContraForm] = useState({
    content: '',
    source: 'doctor',
    source_name: '',
    note: '',
    is_active: true,
  })

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [todayRes, historyRes, goalsRes, contraRes] = await Promise.all([
        rehabAPI.getToday(1),
        rehabAPI.getHistory(1, 30),
        rehabAPI.getGoals(1),
        rehabAPI.getContraindications(1),
      ])

      if (todayRes.data.success) setTodayData(todayRes.data.data)
      if (historyRes.data.success) setHistory(historyRes.data.data)
      if (goalsRes.data.success) setGoals(goalsRes.data.data)
      if (contraRes.data.success) setContraindications(contraRes.data.data)
    } catch (e) {
      console.error('加载康复训练数据失败', e)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  const getTrainingTypeInfo = (type: string): RehabTrainingType | undefined => {
    return todayData?.training_types.find(t => t.type === type)
  }

  const openAddRecord = (type?: string) => {
    setEditingRecord(null)
    const today = new Date().toISOString().split('T')[0]
    const defaultType = type || 'pelvic_floor'
    const typeInfo = getTrainingTypeInfo(defaultType)
    setRecordForm({
      training_type: defaultType,
      duration_minutes: typeInfo?.default_duration || 15,
      intensity: typeInfo?.default_intensity || 2,
      completed: true,
      pain_level: 0,
      has_leakage: false,
      leakage_severity: 0,
      has_dizziness: false,
      has_fatigue: false,
      other_symptoms: '',
      note: '',
      record_date: today,
    })
    setShowRecordModal(true)
  }

  const openEditRecord = (record: RehabTrainingRecord) => {
    setEditingRecord(record)
    setRecordForm({
      training_type: record.training_type,
      duration_minutes: record.duration_minutes,
      intensity: record.intensity,
      completed: record.completed,
      pain_level: record.pain_level,
      has_leakage: record.has_leakage,
      leakage_severity: record.leakage_severity,
      has_dizziness: record.has_dizziness,
      has_fatigue: record.has_fatigue,
      other_symptoms: record.other_symptoms,
      note: record.note,
      record_date: record.record_date || new Date().toISOString().split('T')[0],
    })
    setShowRecordModal(true)
  }

  const handleSaveRecord = async () => {
    setSubmitting(true)
    try {
      if (editingRecord) {
        const res = await rehabAPI.updateRecord(editingRecord.id, {
          ...recordForm,
          user_id: 1,
        })
        if (res.data.success) {
          alert('训练记录已更新！')
        }
      } else {
        const res = await rehabAPI.addRecord({
          ...recordForm,
          user_id: 1,
        })
        if (res.data.success) {
          alert('训练记录已保存！')
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
    if (!confirm('确定要删除这条训练记录吗？')) return
    try {
      const res = await rehabAPI.deleteRecord(id)
      if (res.data.success) {
        alert('已删除')
        loadAllData()
      }
    } catch (e) {
      console.error('删除失败', e)
      alert('删除失败')
    }
  }

  const openAddGoal = () => {
    setEditingGoal(null)
    const today = new Date().toISOString().split('T')[0]
    const targetDate = new Date()
    targetDate.setMonth(targetDate.getMonth() + 1)
    setGoalForm({
      goal_type: 'daily_training_minutes',
      target_value: 30,
      current_value: 0,
      unit: '分钟',
      description: '',
      start_date: today,
      target_date: targetDate.toISOString().split('T')[0],
    })
    setShowGoalModal(true)
  }

  const openEditGoal = (goal: RehabGoal) => {
    setEditingGoal(goal)
    setGoalForm({
      goal_type: goal.goal_type,
      target_value: goal.target_value,
      current_value: goal.current_value,
      unit: goal.unit,
      description: goal.description,
      start_date: goal.start_date || '',
      target_date: goal.target_date || '',
    })
    setShowGoalModal(true)
  }

  const handleSaveGoal = async () => {
    setSubmitting(true)
    try {
      if (editingGoal) {
        const res = await rehabAPI.updateGoal(editingGoal.id, {
          ...goalForm,
          user_id: 1,
        })
        if (res.data.success) {
          alert('目标已更新！')
        }
      } else {
        const res = await rehabAPI.addGoal({
          ...goalForm,
          user_id: 1,
        })
        if (res.data.success) {
          alert('目标已添加！')
        }
      }
      setShowGoalModal(false)
      loadAllData()
    } catch (e) {
      console.error('保存目标失败', e)
      alert('保存失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteGoal = async (id: number) => {
    if (!confirm('确定要删除这个目标吗？')) return
    try {
      const res = await rehabAPI.deleteGoal(id)
      if (res.data.success) {
        alert('已删除')
        loadAllData()
      }
    } catch (e) {
      console.error('删除失败', e)
      alert('删除失败')
    }
  }

  const openAddContra = () => {
    setEditingContra(null)
    setContraForm({
      content: '',
      source: 'doctor',
      source_name: '',
      note: '',
      is_active: true,
    })
    setShowContraModal(true)
  }

  const openEditContra = (item: RehabContraindication) => {
    setEditingContra(item)
    setContraForm({
      content: item.content,
      source: item.source,
      source_name: item.source_name,
      note: item.note,
      is_active: item.is_active,
    })
    setShowContraModal(true)
  }

  const handleSaveContra = async () => {
    if (!contraForm.content.trim()) {
      alert('请输入禁忌事项内容')
      return
    }
    setSubmitting(true)
    try {
      if (editingContra) {
        const res = await rehabAPI.updateContraindication(editingContra.id, {
          ...contraForm,
          user_id: 1,
        })
        if (res.data.success) {
          alert('禁忌事项已更新！')
        }
      } else {
        const res = await rehabAPI.addContraindication({
          ...contraForm,
          user_id: 1,
        })
        if (res.data.success) {
          alert('禁忌事项已添加！')
        }
      }
      setShowContraModal(false)
      loadAllData()
    } catch (e) {
      console.error('保存失败', e)
      alert('保存失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteContra = async (id: number) => {
    if (!confirm('确定要删除这条禁忌事项吗？')) return
    try {
      const res = await rehabAPI.deleteContraindication(id)
      if (res.data.success) {
        alert('已删除')
        loadAllData()
      }
    } catch (e) {
      console.error('删除失败', e)
      alert('删除失败')
    }
  }

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await rehabAPI.acknowledgeAlert(alertId)
      loadAllData()
    } catch (e) {
      console.error('确认提醒失败', e)
    }
  }

  const hasAbnormal = (record: RehabTrainingRecord) => {
    return record.pain_level >= 3 || record.has_leakage || record.has_dizziness || record.has_fatigue
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>🏋️ 产后康复训练</h2>
        </div>

        <div className="tabs-row">
          <button
            className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
            onClick={() => setActiveTab('today')}
          >
            今日训练
          </button>
          <button
            className={`tab-btn ${activeTab === 'goals' ? 'active' : ''}`}
            onClick={() => setActiveTab('goals')}
          >
            阶段目标
          </button>
          <button
            className={`tab-btn ${activeTab === 'contra' ? 'active' : ''}`}
            onClick={() => setActiveTab('contra')}
          >
            禁忌事项
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            历史记录
          </button>
        </div>
      </div>

      {todayData?.alerts && todayData.alerts.length > 0 && activeTab === 'today' && (
        <div className="card" style={{ borderLeft: `4px solid ${todayData.alerts.some(a => a.level === 'urgent') ? '#ef4444' : '#f59e0b'}` }}>
          <h3 className="card-title">
            {todayData.alerts.some(a => a.level === 'urgent') ? '⚠️ 重要提醒' : '⚡ 温馨提醒'}
          </h3>
          {todayData.alerts.slice(0, 3).map(alert => (
            <div
              key={alert.id}
              style={{
                padding: '12px',
                background: alert.level === 'urgent' ? '#fef2f2' : '#fffbeb',
                borderRadius: '8px',
                marginBottom: '10px',
              }}
            >
              <h4 style={{ fontSize: '14px', marginBottom: '6px', color: alert.level === 'urgent' ? '#dc2626' : '#d97706' }}>
                {alert.title}
              </h4>
              <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, marginBottom: '8px' }}>
                {alert.content}
              </p>
              {alert.support_contacts && alert.support_contacts.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>可联系支持：</p>
                  {alert.support_contacts.map((s, idx) => (
                    <div key={idx} style={{ fontSize: '12px', color: '#555', marginBottom: '2px' }}>
                      • {s.title}：{s.contact}
                    </div>
                  ))}
                </div>
              )}
              <button
                className="btn btn-outline btn-sm"
                onClick={() => handleAcknowledgeAlert(alert.id)}
              >
                我知道了
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'today' && todayData && (
        <>
          <div className="card">
            <h3 className="card-title">💡 今日训练建议</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '14px', background: '#f0fdf4', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#22c55e' }}>
                  {todayData.suggestions.intensity_label}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>建议训练强度</div>
              </div>
              <div style={{ padding: '14px', background: '#fef3c7', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#f59e0b' }}>
                  {todayData.summary.completed_count}/{todayData.summary.total_count}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>今日已完成/计划</div>
              </div>
              <div style={{ padding: '14px', background: '#dbeafe', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#3b82f6' }}>
                  {todayData.summary.total_duration}分钟
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>今日训练时长</div>
              </div>
            </div>

            {todayData.suggestions.rest_reminders.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#555' }}>⏰ 休息提醒</h4>
                <ul style={{ fontSize: '13px', color: '#666', lineHeight: 1.8, paddingLeft: '18px' }}>
                  {todayData.suggestions.rest_reminders.map((reminder, idx) => (
                    <li key={idx}>{reminder}</li>
                  ))}
                </ul>
              </div>
            )}

            {todayData.suggestions.risk_warnings.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#dc2626' }}>⚠️ 风险预警</h4>
                {todayData.suggestions.risk_warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px',
                      background: warning.level === 'urgent' ? '#fef2f2' : '#fffbeb',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <strong style={{ color: warning.level === 'urgent' ? '#dc2626' : '#d97706' }}>
                      {warning.title}
                    </strong>
                    <p style={{ marginTop: '4px', color: '#666' }}>{warning.content}</p>
                  </div>
                ))}
              </div>
            )}

            {todayData.suggestions.training_recommendations.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#555' }}>🎯 推荐训练</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {todayData.suggestions.training_recommendations.map((rec, idx) => {
                    const typeInfo = getTrainingTypeInfo(rec.type)
                    return (
                      <button
                        key={idx}
                        className="btn btn-primary btn-sm"
                        onClick={() => openAddRecord(rec.type)}
                        style={{ fontSize: '12px' }}
                      >
                        {typeInfo?.icon} {typeInfo?.label || rec.type}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {todayData.suggestions.support_contacts.length > 0 && (
              <div>
                <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#555' }}>📞 支持资源</h4>
                {todayData.suggestions.support_contacts.map((s, idx) => (
                  <div key={idx} style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    • {s.title}：{s.contact}
                  </div>
                ))}
              </div>
            )}
          </div>

          {todayData.contraindications.length > 0 && (
            <div className="card">
              <h3 className="card-title">🚫 注意事项（禁忌）</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {todayData.contraindications.slice(0, 3).map(item => (
                  <div
                    key={item.id}
                    style={{
                      padding: '10px 12px',
                      background: '#fef2f2',
                      borderRadius: '8px',
                      fontSize: '13px',
                      borderLeft: '3px solid #ef4444',
                    }}
                  >
                    <div style={{ color: '#333', marginBottom: '4px' }}>{item.content}</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      来源：{item.source_label}{item.source_name ? ` - ${item.source_name}` : ''}
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-outline btn-sm"
                style={{ marginTop: '12px' }}
                onClick={() => setActiveTab('contra')}
              >
                管理全部禁忌事项
              </button>
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="card-title" style={{ marginBottom: 0 }}>📝 今日训练记录</h3>
              <button className="btn btn-primary btn-sm" onClick={() => openAddRecord()}>
                + 添加训练
              </button>
            </div>

            {todayData.records.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {todayData.records.map(record => {
                  const typeInfo = getTrainingTypeInfo(record.training_type)
                  return (
                    <div
                      key={record.id}
                      style={{
                        padding: '14px',
                        background: record.completed ? '#f9fafb' : '#fef3c7',
                        borderRadius: '10px',
                        border: hasAbnormal(record) ? '1px solid #fecaca' : '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>{typeInfo?.icon || '✨'}</span>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: '14px' }}>
                              {record.training_type_label}
                              {!record.completed && (
                                <span style={{ fontSize: '11px', color: '#d97706', marginLeft: '6px' }}>未完成</span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: '#888' }}>
                              {record.duration_minutes}分钟 · {record.intensity_label}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => openEditRecord(record)}
                          >
                            编辑
                          </button>
                          <button
                            className="btn btn-outline btn-xs"
                            style={{ color: '#ef4444', borderColor: '#fecaca' }}
                            onClick={() => handleDeleteRecord(record.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>

                      {hasAbnormal(record) && (
                        <div
                          style={{
                            padding: '8px 10px',
                            background: '#fff1f2',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#be123c',
                            marginTop: '8px',
                          }}
                        >
                          <strong>身体反馈：</strong>
                          {record.pain_level > 0 && `疼痛${record.pain_level}分 `}
                          {record.has_leakage && '漏尿 '}
                          {record.has_dizziness && '头晕 '}
                          {record.has_fatigue && '乏力 '}
                          {record.other_symptoms && ` · ${record.other_symptoms}`}
                        </div>
                      )}

                      {record.note && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                          💭 {record.note}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🏋️</div>
                <p>今天还没有训练记录哦~</p>
                <p style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
                  点击上方按钮添加今天的训练吧
                </p>
              </div>
            )}
          </div>

          {todayData.active_goals.length > 0 && (
            <div className="card">
              <h3 className="card-title">🎯 当前阶段目标</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {todayData.active_goals.slice(0, 3).map(goal => (
                  <div key={goal.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#555' }}>{goal.goal_type_label}</span>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: goal.achieved ? '#22c55e' : '#f59e0b' }}>
                        {goal.current_value}/{goal.target_value}{goal.unit} ({goal.completion_rate}%)
                      </span>
                    </div>
                    <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(goal.completion_rate, 100)}%`,
                          background: goal.achieved ? '#22c55e' : '#f59e0b',
                          borderRadius: '4px',
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-outline btn-sm"
                style={{ marginTop: '12px' }}
                onClick={() => setActiveTab('goals')}
              >
                管理全部目标
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'goals' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="card-title" style={{ marginBottom: 0 }}>🎯 阶段目标</h3>
            <button className="btn btn-primary btn-sm" onClick={openAddGoal}>
              + 添加目标
            </button>
          </div>

          {goals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {goals.map(goal => (
                <div
                  key={goal.id}
                  style={{
                    padding: '14px',
                    background: goal.status === 'active' ? '#f9fafb' : '#f3f4f6',
                    borderRadius: '10px',
                    opacity: goal.status === 'active' ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, marginBottom: '6px' }}>
                        {goal.goal_type_label}
                        <span
                          style={{
                            fontSize: '11px',
                            marginLeft: '8px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: goal.status === 'active' ? '#dcfce7' : '#e5e7eb',
                            color: goal.status === 'active' ? '#166534' : '#6b7280',
                          }}
                        >
                          {goal.status === 'active' ? '进行中' : goal.status === 'completed' ? '已完成' : '已暂停'}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                        目标：{goal.target_value}{goal.unit} · 当前：{goal.current_value}{goal.unit}
                      </div>
                      <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(goal.completion_rate, 100)}%`,
                            background: goal.achieved ? '#22c55e' : '#f59e0b',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        完成度：{goal.completion_rate}%
                        {goal.start_date && ` · 开始于 ${formatDate(goal.start_date)}`}
                        {goal.target_date && ` · 目标日期 ${formatDate(goal.target_date)}`}
                      </div>
                      {goal.description && (
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
                          💭 {goal.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '12px' }}>
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => openEditGoal(goal)}
                      >
                        编辑
                      </button>
                      <button
                        className="btn btn-outline btn-xs"
                        style={{ color: '#ef4444', borderColor: '#fecaca' }}
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <p>还没有设置康复目标</p>
              <p style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
                设定目标，让康复训练更有动力
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contra' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="card-title" style={{ marginBottom: 0 }}>🚫 禁忌事项</h3>
            <button className="btn btn-primary btn-sm" onClick={openAddContra}>
              + 添加禁忌
            </button>
          </div>

          {contraindications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {contraindications.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 14px',
                    background: item.is_active ? '#fef2f2' : '#f3f4f6',
                    borderRadius: '10px',
                    borderLeft: '3px solid #ef4444',
                    opacity: item.is_active ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', color: '#333', marginBottom: '6px' }}>{item.content}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        来源：{item.source_label}
                        {item.source_name && ` - ${item.source_name}`}
                        {!item.is_active && ' · 已失效'}
                      </div>
                      {item.note && (
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                          💭 {item.note}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '12px' }}>
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => openEditContra(item)}
                      >
                        编辑
                      </button>
                      <button
                        className="btn btn-outline btn-xs"
                        style={{ color: '#ef4444', borderColor: '#fecaca' }}
                        onClick={() => handleDeleteContra(item.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🚫</div>
              <p>还没有添加禁忌事项</p>
              <p style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
                记录医生或康复师的嘱咐，避免不当运动
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <h3 className="card-title">📅 历史训练记录</h3>

          {history.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {history.map(day => (
                <div key={day.date}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 500 }}>{formatDate(day.date)}</h4>
                    <span style={{ fontSize: '12px', color: '#888' }}>
                      {day.summary.completed_count}/{day.summary.total_count} 项完成 · {day.summary.total_duration}分钟
                    </span>
                    {day.summary.has_abnormal && (
                      <span style={{ fontSize: '11px', color: '#dc2626', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
                        有异常反馈
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {day.records.map(record => (
                      <div
                        key={record.id}
                        style={{
                          padding: '10px 12px',
                          background: record.completed ? '#f9fafb' : '#fef3c7',
                          borderRadius: '8px',
                          fontSize: '13px',
                          border: record.pain_level >= 3 || record.has_leakage || record.has_dizziness
                            ? '1px solid #fecaca'
                            : '1px solid #e5e7eb',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{record.icon || '✨'}</span>
                            <span>{record.training_type_label}</span>
                            <span style={{ color: '#888', fontSize: '12px' }}>
                              · {record.duration_minutes}分钟 · {record.intensity_label}
                            </span>
                            {!record.completed && (
                              <span style={{ fontSize: '11px', color: '#d97706' }}>未完成</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="btn btn-outline btn-xs"
                              onClick={() => openEditRecord(record)}
                            >
                              编辑
                            </button>
                            <button
                              className="btn btn-outline btn-xs"
                              style={{ color: '#ef4444', borderColor: '#fecaca' }}
                              onClick={() => handleDeleteRecord(record.id)}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                        {(record.pain_level > 0 || record.has_leakage || record.has_dizziness || record.has_fatigue) && (
                          <div style={{ fontSize: '11px', color: '#be123c', marginTop: '4px' }}>
                            身体反馈：
                            {record.pain_level > 0 && `疼痛${record.pain_level}分 `}
                            {record.has_leakage && '漏尿 '}
                            {record.has_dizziness && '头晕 '}
                            {record.has_fatigue && '乏力 '}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <p>还没有历史训练记录</p>
            </div>
          )}
        </div>
      )}

      {showRecordModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowRecordModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editingRecord ? '编辑训练记录' : '添加训练记录'}</h3>

            <div className="form-group">
              <label>训练类型</label>
              <select
                value={recordForm.training_type}
                onChange={e => {
                  const typeInfo = getTrainingTypeInfo(e.target.value)
                  setRecordForm(prev => ({
                    ...prev,
                    training_type: e.target.value,
                    duration_minutes: typeInfo?.default_duration || prev.duration_minutes,
                    intensity: typeInfo?.default_intensity || prev.intensity,
                  }))
                }}
              >
                {todayData?.training_types.map(t => (
                  <option key={t.type} value={t.type}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>训练时长（分钟）</label>
                <input
                  type="number"
                  value={recordForm.duration_minutes}
                  onChange={e => setRecordForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 0 }))}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>训练强度</label>
                <select
                  value={recordForm.intensity}
                  onChange={e => setRecordForm(prev => ({ ...prev, intensity: parseInt(e.target.value) }))}
                >
                  {INTENSITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={recordForm.completed}
                  onChange={e => setRecordForm(prev => ({ ...prev, completed: e.target.checked }))}
                  style={{ marginRight: '6px' }}
                />
                已完成训练
              </label>
            </div>

            <h4 style={{ fontSize: '14px', margin: '12px 0 8px', color: '#555' }}>身体反馈</h4>

            <div className="form-group">
              <label>疼痛程度</label>
              <select
                value={recordForm.pain_level}
                onChange={e => setRecordForm(prev => ({ ...prev, pain_level: parseInt(e.target.value) }))}
              >
                {PAIN_LEVEL_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={recordForm.has_leakage}
                  onChange={e => setRecordForm(prev => ({ ...prev, has_leakage: e.target.checked }))}
                />
                有漏尿
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={recordForm.has_dizziness}
                  onChange={e => setRecordForm(prev => ({ ...prev, has_dizziness: e.target.checked }))}
                />
                头晕
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={recordForm.has_fatigue}
                  onChange={e => setRecordForm(prev => ({ ...prev, has_fatigue: e.target.checked }))}
                />
                乏力
              </label>
            </div>

            {recordForm.has_leakage && (
              <div className="form-group">
                <label>漏尿严重程度</label>
                <select
                  value={recordForm.leakage_severity}
                  onChange={e => setRecordForm(prev => ({ ...prev, leakage_severity: parseInt(e.target.value) }))}
                >
                  {PAIN_LEVEL_OPTIONS.slice(0, 4).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>其他症状</label>
              <input
                type="text"
                value={recordForm.other_symptoms}
                onChange={e => setRecordForm(prev => ({ ...prev, other_symptoms: e.target.value }))}
                placeholder="描述其他身体不适..."
              />
            </div>

            <div className="form-group">
              <label>备注</label>
              <textarea
                value={recordForm.note}
                onChange={e => setRecordForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder="记录训练感受..."
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowRecordModal(false)}
                disabled={submitting}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveRecord}
                disabled={submitting}
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGoalModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowGoalModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editingGoal ? '编辑目标' : '添加阶段目标'}</h3>

            <div className="form-group">
              <label>目标类型</label>
              <select
                value={goalForm.goal_type}
                onChange={e => {
                  const opt = GOAL_TYPE_OPTIONS.find(o => o.value === e.target.value)
                  setGoalForm(prev => ({ ...prev, goal_type: e.target.value, unit: opt?.unit || '' }))
                }}
              >
                {GOAL_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>目标值（{goalForm.unit}）</label>
                <input
                  type="number"
                  value={goalForm.target_value}
                  onChange={e => setGoalForm(prev => ({ ...prev, target_value: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="form-group">
                <label>当前值（{goalForm.unit}）</label>
                <input
                  type="number"
                  value={goalForm.current_value}
                  onChange={e => setGoalForm(prev => ({ ...prev, current_value: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>开始日期</label>
                <input
                  type="date"
                  value={goalForm.start_date}
                  onChange={e => setGoalForm(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>目标日期</label>
                <input
                  type="date"
                  value={goalForm.target_date}
                  onChange={e => setGoalForm(prev => ({ ...prev, target_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label>描述</label>
              <textarea
                value={goalForm.description}
                onChange={e => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="描述你的康复目标..."
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowGoalModal(false)}
                disabled={submitting}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveGoal}
                disabled={submitting}
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showContraModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowContraModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editingContra ? '编辑禁忌事项' : '添加禁忌事项'}</h3>

            <div className="form-group">
              <label>禁忌内容</label>
              <textarea
                value={contraForm.content}
                onChange={e => setContraForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="例如：避免剧烈运动、避免深蹲等增加腹压的动作..."
                rows={3}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label>来源</label>
                <select
                  value={contraForm.source}
                  onChange={e => setContraForm(prev => ({ ...prev, source: e.target.value }))}
                >
                  {SOURCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>来源人姓名</label>
                <input
                  type="text"
                  value={contraForm.source_name}
                  onChange={e => setContraForm(prev => ({ ...prev, source_name: e.target.value }))}
                  placeholder="医生/康复师姓名"
                />
              </div>
            </div>

            <div className="form-group">
              <label>备注</label>
              <textarea
                value={contraForm.note}
                onChange={e => setContraForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder="补充说明..."
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={contraForm.is_active}
                  onChange={e => setContraForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  style={{ marginRight: '6px' }}
                />
                当前有效
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowContraModal(false)}
                disabled={submitting}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveContra}
                disabled={submitting}
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RehabTraining
