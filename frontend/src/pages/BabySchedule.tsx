import { useState, useEffect } from 'react'
import { babyAPI, statsAPI } from '../api'
import { BabySchedule as BabyScheduleType, CorrelationItem } from '../types'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

function BabySchedule() {
  const [schedules, setSchedules] = useState<BabyScheduleType[]>([])
  const [todaySchedule, setTodaySchedule] = useState<BabyScheduleType | null>(null)
  const [sleepHours, setSleepHours] = useState(14)
  const [feedCount, setFeedCount] = useState(8)
  const [cryingDuration, setCryingDuration] = useState(30)
  const [note, setNote] = useState('')
  const [summary, setSummary] = useState<any>(null)
  const [correlationData, setCorrelationData] = useState<CorrelationItem[]>([])
  const [activeTab, setActiveTab] = useState<'record' | 'history' | 'correlation'>('record')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [todayRes, schedulesRes, summaryRes, corrRes] = await Promise.all([
        babyAPI.getTodaySchedule(1),
        babyAPI.getSchedules(1, 14),
        babyAPI.getSummary(1, 7),
        statsAPI.getBabyEmotionCorrelation(1, 14),
      ])

      if (todayRes.data.success && todayRes.data.data) {
        const today = todayRes.data.data
        setTodaySchedule(today)
        setSleepHours(today.sleep_total_hours)
        setFeedCount(today.feed_count)
        setCryingDuration(today.crying_duration)
        setNote(today.note)
      }
      if (schedulesRes.data.success) {
        setSchedules(schedulesRes.data.data)
      }
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data)
      }
      if (corrRes.data.success) {
        setCorrelationData(corrRes.data.data)
      }
    } catch (e) {
      console.error('加载宝宝作息数据失败', e)
    }
  }

  const handleSave = async () => {
    setSubmitting(true)
    try {
      const res = await babyAPI.addSchedule({
        user_id: 1,
        sleep_total_hours: sleepHours,
        feed_count: feedCount,
        crying_duration: cryingDuration,
        note,
      })

      if (res.data.success) {
        alert(todaySchedule ? '今日作息已更新！' : '今日作息已保存！')
        loadData()
      }
    } catch (e) {
      console.error('保存失败', e)
      alert('保存失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  const chartData = correlationData.map(item => ({
    date: formatDate(item.date),
    情绪评分: item.emotion_score,
    宝宝睡眠: item.baby_sleep_hours ? item.baby_sleep_hours * 0.5 : null,
    哭闹时长: item.baby_crying_duration ? item.baby_crying_duration / 10 : null,
  }))

  return (
    <div>
      <div className="card">
        <h2 className="card-title">👶 宝宝作息记录</h2>

        <div className="tabs-row">
          <button
            className={`tab-btn ${activeTab === 'record' ? 'active' : ''}`}
            onClick={() => setActiveTab('record')}
          >
            今日记录
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            历史记录
          </button>
          <button
            className={`tab-btn ${activeTab === 'correlation' ? 'active' : ''}`}
            onClick={() => setActiveTab('correlation')}
          >
            情绪关联
          </button>
        </div>

        {activeTab === 'record' && (
          <div>
            {summary && (
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card">
                  <div className="stat-value">{summary.avg_sleep_hours}h</div>
                  <div className="stat-label">近7天日均睡眠</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{summary.avg_feed_count}</div>
                  <div className="stat-label">日均喂奶次数</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{summary.avg_crying_duration}分</div>
                  <div className="stat-label">日均哭闹时长</div>
                </div>
              </div>
            )}

            <div className="baby-schedule-form">
              <div className="form-group">
                <label className="form-label">今日总睡眠（小时）</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="24"
                  step="0.5"
                  value={sleepHours}
                  onChange={e => setSleepHours(parseFloat(e.target.value) || 0)}
                />
                <input
                  type="range"
                  className="rating-slider"
                  min="0"
                  max="20"
                  step="0.5"
                  value={sleepHours}
                  onChange={e => setSleepHours(parseFloat(e.target.value))}
                  style={{ marginTop: '8px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">喂奶次数</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="20"
                  value={feedCount}
                  onChange={e => setFeedCount(parseInt(e.target.value) || 0)}
                />
                <input
                  type="range"
                  className="rating-slider"
                  min="0"
                  max="15"
                  value={feedCount}
                  onChange={e => setFeedCount(parseInt(e.target.value))}
                  style={{ marginTop: '8px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">哭闹时长（分钟）</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="300"
                  step="5"
                  value={cryingDuration}
                  onChange={e => setCryingDuration(parseInt(e.target.value) || 0)}
                />
                <input
                  type="range"
                  className="rating-slider"
                  min="0"
                  max="180"
                  step="5"
                  value={cryingDuration}
                  onChange={e => setCryingDuration(parseInt(e.target.value))}
                  style={{ marginTop: '8px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">备注</label>
              <textarea
                className="form-textarea"
                placeholder="记录宝宝今天的特殊情况..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleSave}
              disabled={submitting}
            >
              {submitting ? '保存中...' : todaySchedule ? '更新今日记录' : '保存今日记录'}
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {schedules.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <p>还没有记录，开始记录宝宝的作息吧！</p>
              </div>
            ) : (
              schedules.map(schedule => (
                <div key={schedule.id} className="record-item">
                  <div className="record-details">
                    <div className="record-date">{formatDate(schedule.record_date)}</div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#666' }}>😴 {schedule.sleep_total_hours}h</span>
                      <span style={{ fontSize: '13px', color: '#666' }}>🍼 {schedule.feed_count}次</span>
                      <span style={{ fontSize: '13px', color: '#666' }}>😭 {schedule.crying_duration}分</span>
                    </div>
                    {schedule.note && (
                      <p style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>{schedule.note}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'correlation' && (
          <div>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '12px' }}>
              对比妈妈情绪与宝宝作息的关联，帮助你发现影响情绪的因素
            </p>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="情绪评分"
                    stroke="#ff6b8a"
                    strokeWidth={2}
                    dot={{ fill: '#ff6b8a', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="宝宝睡眠"
                    stroke="#4ade80"
                    strokeWidth={2}
                    dot={{ fill: '#4ade80', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="哭闹时长"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    dot={{ fill: '#fbbf24', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
              * 宝宝睡眠和哭闹时长已做比例调整，便于对比趋势
            </div>

            <div style={{ marginTop: '16px', padding: '16px', background: '#fdf2f8', borderRadius: '12px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#9d174d' }}>💡 小贴士</h4>
              <ul style={{ fontSize: '13px', color: '#9d174d', lineHeight: 1.8, marginLeft: '18px' }}>
                <li>宝宝睡眠不足时，妈妈的情绪也容易受影响，这很正常</li>
                <li>尝试在宝宝小睡的时候，你也跟着休息一会儿</li>
                <li>如果宝宝哭闹让你感到烦躁，可以把宝宝放在安全的地方，给自己5分钟冷静时间</li>
                <li>宝宝的作息会随着成长逐渐规律，耐心等待 💕</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BabySchedule
