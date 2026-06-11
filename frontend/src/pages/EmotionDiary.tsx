import { useState, useEffect } from 'react'
import { emotionAPI } from '../api'
import { EmotionRecord } from '../types'

const EMOJI_OPTIONS = [
  { emoji: '😭', label: '很糟', score: 1 },
  { emoji: '😔', label: '较差', score: 2 },
  { emoji: '😐', label: '一般', score: 3 },
  { emoji: '🙂', label: '还好', score: 4 },
  { emoji: '😊', label: '不错', score: 5 },
  { emoji: '🥰', label: '很好', score: 6 },
  { emoji: '🌟', label: '超棒', score: 7 },
]

const SLEEP_OPTIONS = [
  { emoji: '😴', label: '很差', score: 1 },
  { emoji: '😫', label: '较差', score: 2 },
  { emoji: '😐', label: '一般', score: 3 },
  { emoji: '😌', label: '较好', score: 4 },
  { emoji: '😴', label: '很好', score: 5 },
]

interface EmotionDiaryProps {
  onRefresh?: () => void
}

function EmotionDiary({ onRefresh }: EmotionDiaryProps) {
  const [emotionScore, setEmotionScore] = useState(4)
  const [sleepQuality, setSleepQuality] = useState(3)
  const [sleepHours, setSleepHours] = useState(6)
  const [note, setNote] = useState('')
  const [selfAssessment, setSelfAssessment] = useState(5)
  const [stressTypes, setStressTypes] = useState<string[]>([])
  const [supportUsage, setSupportUsage] = useState<any[]>([])
  const [stressTypeList, setStressTypeList] = useState<string[]>([])
  const [supportTypeList, setSupportTypeList] = useState<string[]>([])
  const [records, setRecords] = useState<EmotionRecord[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [todayRecorded, setTodayRecorded] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [stressRes, supportRes, todayRes, recordsRes] = await Promise.all([
        emotionAPI.getStressTypes(),
        emotionAPI.getSupportTypes(),
        emotionAPI.getTodayRecord(1),
        emotionAPI.getRecords(1, 14),
      ])

      if (stressRes.data.success) {
        setStressTypeList(stressRes.data.data)
      }
      if (supportRes.data.success) {
        setSupportTypeList(supportRes.data.data)
        setSupportUsage(supportRes.data.data.map((t: string) => ({ type: t, used: false, helpfulness: 3 })))
      }
      if (todayRes.data.success && todayRes.data.data) {
        const today = todayRes.data.data
        setEmotionScore(today.emotion_score)
        setSleepQuality(today.sleep_quality)
        setSleepHours(today.sleep_hours)
        setNote(today.note)
        setSelfAssessment(today.self_assessment)
        setStressTypes(today.stress_types || [])
        if (today.support_usage && today.support_usage.length > 0) {
          setSupportUsage(today.support_usage)
        }
        setTodayRecorded(true)
      }
      if (recordsRes.data.success) {
        setRecords(recordsRes.data.data)
      }
    } catch (e) {
      console.error('加载数据失败', e)
    }
  }

  const toggleStressType = (type: string) => {
    setStressTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const toggleSupportType = (type: string) => {
    setSupportUsage(prev =>
      prev.map(s =>
        s.type === type ? { ...s, used: !s.used } : s
      )
    )
  }

  const updateHelpfulness = (type: string, value: number) => {
    setSupportUsage(prev =>
      prev.map(s =>
        s.type === type ? { ...s, helpfulness: value } : s
      )
    )
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await emotionAPI.addRecord({
        user_id: 1,
        emotion_score: emotionScore,
        sleep_quality: sleepQuality,
        sleep_hours: sleepHours,
        note,
        self_assessment: selfAssessment,
        stress_types: stressTypes,
        support_usage: supportUsage.filter(s => s.used),
      })

      if (res.data.success) {
        setTodayRecorded(true)
        alert(todayRecorded ? '今日记录已更新！' : '今日记录已保存！')
        loadData()
        if (onRefresh) onRefresh()
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
    const month = d.getMonth() + 1
    const day = d.getDate()
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `${month}月${day}日 ${weekdays[d.getDay()]}`
  }

  const getEmojiForScore = (score: number) => {
    const idx = Math.max(0, Math.min(6, score - 1))
    return EMOJI_OPTIONS[idx]?.emoji || '😐'
  }

  return (
    <div>
      <div className="card">
        <h2 className="card-title">今日心情记录</h2>

        <div className="form-group">
          <label className="form-label">今天的情绪怎么样？</label>
          <div className="emoji-row">
            {EMOJI_OPTIONS.map(opt => (
              <div
                key={opt.score}
                className={`emoji-item ${emotionScore === opt.score ? 'selected' : ''}`}
                onClick={() => setEmotionScore(opt.score)}
              >
                <div className="emoji">{opt.emoji}</div>
                <div className="label">{opt.label}</div>
              </div>
            ))}
          </div>
          <div className="rating-value">{emotionScore} / 7</div>
        </div>

        <div className="form-group">
          <label className="form-label">睡眠质量</label>
          <div className="emoji-row">
            {SLEEP_OPTIONS.map(opt => (
              <div
                key={opt.score}
                className={`emoji-item ${sleepQuality === opt.score ? 'selected' : ''}`}
                onClick={() => setSleepQuality(opt.score)}
              >
                <div className="emoji">{opt.emoji}</div>
                <div className="label">{opt.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">睡眠时长：{sleepHours} 小时</label>
          <input
            type="range"
            className="rating-slider"
            min="0"
            max="12"
            step="0.5"
            value={sleepHours}
            onChange={e => setSleepHours(parseFloat(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">今天的压力来源（可多选）</label>
          <div className="tag-list">
            {stressTypeList.map(type => (
              <span
                key={type}
                className={`tag ${stressTypes.includes(type) ? 'selected' : ''}`}
                onClick={() => toggleStressType(type)}
              >
                {type}
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">今天获得了哪些支持？</label>
          {supportTypeList.map(type => {
            const support = supportUsage.find(s => s.type === type)
            const used = support?.used || false
            const helpfulness = support?.helpfulness || 3
            return (
              <div key={type} style={{ marginBottom: '8px' }}>
                <div className="support-toggle">
                  <input
                    type="checkbox"
                    checked={used}
                    onChange={() => toggleSupportType(type)}
                  />
                  <span style={{ minWidth: '60px' }}>{type}</span>
                  {used && (
                    <div className="helpfulness-slider" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#888' }}>帮助程度：</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={helpfulness}
                        onChange={e => updateHelpfulness(type, parseInt(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ fontSize: '12px', color: '#ff6b8a', minWidth: '20px' }}>{helpfulness}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="form-group">
          <label className="form-label">自我恢复评估（1-10分）</label>
          <input
            type="range"
            className="rating-slider"
            min="1"
            max="10"
            value={selfAssessment}
            onChange={e => setSelfAssessment(parseInt(e.target.value))}
          />
          <div className="rating-value" style={{ fontSize: '20px' }}>{selfAssessment} / 10</div>
        </div>

        <div className="form-group">
          <label className="form-label">今天想说点什么？</label>
          <textarea
            className="form-textarea"
            placeholder="记录下今天的感受、想法或任何想写的东西..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '16px' }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? '保存中...' : (todayRecorded ? '更新今日记录' : '保存今日记录')}
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>历史记录</h2>
          <button className="btn btn-secondary" onClick={() => setShowHistory(!showHistory)}>
            {showHistory ? '收起' : '展开'}
          </button>
        </div>

        {showHistory && (
          <div>
            {records.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <p>还没有记录，开始记录你的第一篇日记吧！</p>
              </div>
            ) : (
              records.map(record => (
                <div key={record.id} className="record-item">
                  <div className="record-details">
                    <div className="record-date">{formatDate(record.record_date)}</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {record.stress_types?.map((s, i) => (
                        <span key={i} className="tag" style={{ fontSize: '12px' }}>{s}</span>
                      ))}
                    </div>
                    {record.note && (
                      <p style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>{record.note}</p>
                    )}
                  </div>
                  <div className="record-stats">
                    <div style={{ fontSize: '32px' }}>{getEmojiForScore(record.emotion_score)}</div>
                    <div className="record-score">{record.emotion_score}分</div>
                    <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
                      睡眠 {record.sleep_hours}h
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default EmotionDiary
