import { useState, useEffect } from 'react'
import { stressAPI } from '../api'
import { StressRecord } from '../types'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const STRESS_COLORS = [
  '#ff6b8a',
  '#ff9a9e',
  '#fecfef',
  '#a8edea',
  '#fed6e3',
  '#ffecd2',
  '#fcb69f',
  '#d299c2',
  '#fef9d7',
]

function StressTypes() {
  const [stressRecords, setStressRecords] = useState<StressRecord[]>([])
  const [stressSummary, setStressSummary] = useState<any[]>([])
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [newSeverity, setNewSeverity] = useState(3)
  const [newDescription, setNewDescription] = useState('')
  const [newType, setNewType] = useState('喂奶')
  const [days, setDays] = useState(30)

  const stressTypes = ['喂奶', '哄睡', '健康担忧', '身体恢复', '情绪波动', '社交隔离', '家庭关系', '经济压力', '其他']

  useEffect(() => {
    loadData()
  }, [days])

  const loadData = async () => {
    try {
      const [recordsRes, summaryRes] = await Promise.all([
        stressAPI.getRecords(1, days),
        stressAPI.getSummary(1, days),
      ])

      if (recordsRes.data.success) {
        setStressRecords(recordsRes.data.data)
      }
      if (summaryRes.data.success) {
        setStressSummary(summaryRes.data.data)
      }
    } catch (e) {
      console.error('加载压力数据失败', e)
    }
  }

  const handleAddStress = async () => {
    if (!newType) return

    try {
      const res = await stressAPI.addRecord({
        user_id: 1,
        stress_type: newType,
        severity: newSeverity,
        description: newDescription,
      })

      if (res.data.success) {
        setNewDescription('')
        setNewSeverity(3)
        loadData()
        alert('压力记录已添加！')
      }
    } catch (e) {
      console.error('添加失败', e)
      alert('添加失败')
    }
  }

  const filteredRecords = selectedType
    ? stressRecords.filter(r => r.stress_type === selectedType)
    : stressRecords

  const pieData = stressSummary.map(s => ({
    name: s.type,
    value: s.count,
  }))

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  const getSeverityLabel = (severity: number) => {
    const labels = ['', '轻微', '较轻', '中等', '较重', '严重']
    return labels[severity] || '中等'
  }

  return (
    <div>
      <div className="card">
        <h2 className="card-title">压力类型分布</h2>

        <div className="tabs-row">
          <button
            className={`tab-btn ${days === 7 ? 'active' : ''}`}
            onClick={() => setDays(7)}
          >
            近7天
          </button>
          <button
            className={`tab-btn ${days === 30 ? 'active' : ''}`}
            onClick={() => setDays(30)}
          >
            近30天
          </button>
        </div>

        {stressSummary.length > 0 ? (
          <>
            <div className="chart-container" style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#999', strokeWidth: 1 }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STRESS_COLORS[index % STRESS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
              {stressSummary.map((s, index) => (
                <div
                  key={s.type}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: `${STRESS_COLORS[index % STRESS_COLORS.length]}20`,
                    borderLeft: `4px solid ${STRESS_COLORS[index % STRESS_COLORS.length]}`,
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onClick={() => setSelectedType(selectedType === s.type ? null : s.type)}
                >
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>{s.type}</div>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    {s.count} 次 · 平均严重度 {s.avg_severity}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p>暂无压力记录数据</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">添加压力记录</h2>

        <div className="form-group">
          <label className="form-label">压力类型</label>
          <select
            className="form-select"
            value={newType}
            onChange={e => setNewType(e.target.value)}
          >
            {stressTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">严重程度：{getSeverityLabel(newSeverity)}（{newSeverity}/5）</label>
          <input
            type="range"
            className="rating-slider"
            min="1"
            max="5"
            value={newSeverity}
            onChange={e => setNewSeverity(parseInt(e.target.value))}
          />
        </div>

        <div className="form-group">
          <label className="form-label">具体描述（选填）</label>
          <textarea
            className="form-textarea"
            placeholder="描述一下这次压力的具体情况..."
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleAddStress}>
          添加记录
        </button>
      </div>

      <div className="card">
        <h2 className="card-title">
          {selectedType ? `${selectedType} - 记录详情` : '全部压力记录'}
          {selectedType && (
            <button
              className="btn btn-secondary"
              style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: '12px' }}
              onClick={() => setSelectedType(null)}
            >
              查看全部
            </button>
          )}
        </h2>

        {filteredRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>暂无记录</p>
          </div>
        ) : (
          filteredRecords.map(record => (
            <div
              key={record.id}
              style={{
                padding: '12px',
                marginBottom: '8px',
                background: '#fafafa',
                borderRadius: '8px',
                borderLeft: `4px solid ${STRESS_COLORS[stressTypes.indexOf(record.stress_type) % STRESS_COLORS.length]}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 500 }}>{record.stress_type}</span>
                <span style={{ fontSize: '12px', color: '#888' }}>{formatDate(record.record_date)}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                严重程度：{getSeverityLabel(record.severity)}（{record.severity}/5）
              </div>
              {record.description && (
                <p style={{ fontSize: '13px', color: '#888', marginTop: '6px' }}>{record.description}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default StressTypes
