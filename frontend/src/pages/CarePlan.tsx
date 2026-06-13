import { useState, useEffect } from 'react'
import { careAPI } from '../api'
import { CareSuggestion } from '../types'

const CATEGORY_ICONS: Record<string, string> = {
  rest_reminder: '😴',
  stress_coping: '🧘',
  support_contact: '🤝',
  psych_resource: '💝',
  baby_schedule: '👶',
}

const CATEGORY_COLORS: Record<string, string> = {
  rest_reminder: '#a78bfa',
  stress_coping: '#f472b6',
  support_contact: '#4ade80',
  psych_resource: '#ef4444',
  baby_schedule: '#60a5fa',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待完成',
  completed: '已完成',
  skipped: '暂不需要',
}

function CarePlan() {
  const [suggestions, setSuggestions] = useState<CareSuggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadToday()
  }, [])

  const loadToday = async () => {
    try {
      setLoading(true)
      const res = await careAPI.getToday(1)
      if (res.data.success) {
        setSuggestions(res.data.data)
      }
    } catch (e) {
      console.error('加载关怀建议失败', e)
    } finally {
      setLoading(false)
    }
  }

  const handleMark = async (id: number, status: 'completed' | 'skipped' | 'pending') => {
    try {
      const res = await careAPI.markSuggestion(id, status)
      if (res.data.success) {
        setSuggestions(prev =>
          prev.map(s => (s.id === id ? { ...s, status } : s))
        )
      }
    } catch (e) {
      console.error('标记建议失败', e)
    }
  }

  const pendingCount = suggestions.filter(s => s.status === 'pending').length
  const completedCount = suggestions.filter(s => s.status === 'completed').length
  const urgentItems = suggestions.filter(s => s.priority === 'urgent')
  const normalItems = suggestions.filter(s => s.priority === 'normal')

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    return `${month}月${day}日 星期${weekDays[d.getDay()]}`
  }

  const renderSuggestion = (item: CareSuggestion) => (
    <div
      key={item.id}
      className="care-suggestion-item"
      style={{
        background: item.status === 'completed' ? '#f0fdf4' : item.status === 'skipped' ? '#f9fafb' : item.priority === 'urgent' ? '#fef2f2' : '#faf5ff',
        borderLeft: `4px solid ${item.priority === 'urgent' ? '#ef4444' : CATEGORY_COLORS[item.category] || '#d1d5db'}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '12px',
        opacity: item.status !== 'pending' ? 0.7 : 1,
        transition: 'all 0.3s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>{CATEGORY_ICONS[item.category] || '📌'}</span>
          <span
            className="tag"
            style={{
              background: `${CATEGORY_COLORS[item.category] || '#d1d5db'}20`,
              color: CATEGORY_COLORS[item.category] || '#666',
              border: 'none',
              fontSize: '12px',
            }}
          >
            {item.category_label}
          </span>
          {item.priority === 'urgent' && (
            <span
              className="tag"
              style={{
                background: '#ef444420',
                color: '#ef4444',
                border: 'none',
                fontSize: '12px',
              }}
            >
              ⚠️ 优先
            </span>
          )}
          {item.status !== 'pending' && (
            <span
              className="tag"
              style={{
                background: item.status === 'completed' ? '#22c55e20' : '#9ca3af20',
                color: item.status === 'completed' ? '#22c55e' : '#9ca3af',
                border: 'none',
                fontSize: '12px',
              }}
            >
              {STATUS_LABELS[item.status]}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          fontSize: '14px',
          lineHeight: 1.8,
          color: '#333',
          whiteSpace: 'pre-line',
          textDecoration: item.status === 'completed' ? 'line-through' : 'none',
        }}
      >
        {item.content}
      </div>

      {item.status === 'pending' && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: '13px', padding: '6px 16px' }}
            onClick={() => handleMark(item.id, 'completed')}
          >
            ✓ 已完成
          </button>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '13px', padding: '6px 16px' }}
            onClick={() => handleMark(item.id, 'skipped')}
          >
            暂不需要
          </button>
        </div>
      )}

      {item.status !== 'pending' && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button
            className="btn btn-outline"
            style={{ fontSize: '12px', padding: '4px 12px' }}
            onClick={() => handleMark(item.id, 'pending')}
          >
            撤回标记
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #a78bfa 0%, #c084fc 50%, #e879f9 100%)',
          color: 'white',
        }}
      >
        <h2 style={{ fontSize: '20px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          💜 个性化关怀计划
        </h2>
        <p style={{ fontSize: '14px', opacity: 0.95 }}>
          基于您近7天的情绪、睡眠、压力和支持数据，为您定制的今日关怀建议
        </p>
        <div style={{ marginTop: '12px', fontSize: '13px', opacity: 0.85 }}>
          📅 {formatDate(new Date().toISOString().split('T')[0])}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="card">
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div
              className="stat-card"
              style={{ background: '#faf5ff' }}
            >
              <div className="stat-value" style={{ color: '#a78bfa' }}>{suggestions.length}</div>
              <div className="stat-label">今日建议</div>
            </div>
            <div
              className="stat-card"
              style={{ background: '#f0fdf4' }}
            >
              <div className="stat-value" style={{ color: '#22c55e' }}>{completedCount}</div>
              <div className="stat-label">已完成</div>
            </div>
            <div
              className="stat-card"
              style={{ background: '#fefce8' }}
            >
              <div className="stat-value" style={{ color: '#f59e0b' }}>{pendingCount}</div>
              <div className="stat-label">待完成</div>
            </div>
          </div>
        </div>
      )}

      {urgentItems.length > 0 && (
        <div className="card">
          <h2 className="card-title">🚨 优先关注</h2>
          <div
            style={{
              padding: '12px',
              background: '#fef2f2',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#991b1b',
              lineHeight: 1.6,
            }}
          >
            ⚠️ 检测到您近期情绪持续偏低或睡眠严重不足，请优先关注以下建议，必要时请立即寻求专业帮助。
          </div>
          {urgentItems.map(renderSuggestion)}
        </div>
      )}

      {normalItems.length > 0 && (
        <div className="card">
          <h2 className="card-title">💡 今日关怀建议</h2>
          {normalItems.map(renderSuggestion)}
        </div>
      )}

      {loading && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <p>正在为您生成今日关怀建议...</p>
          </div>
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🌸</div>
            <p>暂无关怀建议，请先记录几天的情绪和睡眠数据</p>
          </div>
        </div>
      )}

      <div
        className="card"
        style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)' }}
      >
        <h3 style={{ fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🌷 温馨提示
        </h3>
        <p style={{ fontSize: '13px', lineHeight: 1.8, color: '#9d174d' }}>
          关怀建议基于您近7天的记录数据自动生成，每天更新一次。建议仅供参考，如有严重心理困扰请及时联系专业心理咨询师。您可以在统计页查看近7天的建议完成率和类型分布。
        </p>
      </div>
    </div>
  )
}

export default CarePlan
