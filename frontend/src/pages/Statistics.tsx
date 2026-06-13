import { useState, useEffect } from 'react'
import { statsAPI, careAPI } from '../api'
import {
  StatsOverview,
  EmotionTrendItem,
  StressDistributionItem,
  SupportCountData,
  CareStats,
} from '../types'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'

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

const SUPPORT_COLORS = [
  '#4ade80',
  '#60a5fa',
  '#f472b6',
  '#fbbf24',
  '#a78bfa',
  '#fb923c',
]

const CARE_COLORS = [
  '#a78bfa',
  '#f472b6',
  '#4ade80',
  '#ef4444',
  '#60a5fa',
]

function Statistics() {
  const [overview, setOverview] = useState<StatsOverview | null>(null)
  const [emotionTrend, setEmotionTrend] = useState<EmotionTrendItem[]>([])
  const [stressDistribution, setStressDistribution] = useState<StressDistributionItem[]>([])
  const [supportCount, setSupportCount] = useState<SupportCountData | null>(null)
  const [recoveryCurve, setRecoveryCurve] = useState<any[]>([])
  const [careStats, setCareStats] = useState<CareStats | null>(null)
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = async () => {
    try {
      const [overviewRes, trendRes, stressRes, supportRes, recoveryRes, careRes] = await Promise.all([
        statsAPI.getOverview(1, period),
        statsAPI.getEmotionTrend(1, period),
        statsAPI.getStressDistribution(1, period),
        statsAPI.getSupportCount(1, period),
        statsAPI.getRecoveryCurve(1, period === 'week' ? 'month' : 'month'),
        careAPI.getStats(1, 7),
      ])

      if (overviewRes.data.success) setOverview(overviewRes.data.data)
      if (trendRes.data.success) setEmotionTrend(trendRes.data.data)
      if (stressRes.data.success) setStressDistribution(stressRes.data.data)
      if (supportRes.data.success) setSupportCount(supportRes.data.data)
      if (recoveryRes.data.success) setRecoveryCurve(recoveryRes.data.data)
      if (careRes.data.success) setCareStats(careRes.data.data)
    } catch (e) {
      console.error('加载统计数据失败', e)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  const trendData = emotionTrend.map(item => ({
    date: formatDate(item.date),
    情绪评分: item.emotion_score,
    睡眠质量: item.sleep_quality,
    睡眠时长: item.sleep_hours,
  }))

  const recoveryData = recoveryCurve.map(item => ({
    date: formatDate(item.date),
    自我评估: item.self_assessment,
    情绪评分: item.emotion_score,
  }))

  const stressPieData = stressDistribution.map(s => ({
    name: s.type,
    value: s.count,
  }))

  const supportBarData = supportCount?.by_type.map(s => ({
    name: s.type,
    次数: s.count,
    帮助度: s.avg_helpfulness,
  })) || []

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>📊 数据概览</h2>
          <div className="tabs-row" style={{ marginBottom: 0 }}>
            <button
              className={`tab-btn ${period === 'week' ? 'active' : ''}`}
              onClick={() => setPeriod('week')}
            >
              本周
            </button>
            <button
              className={`tab-btn ${period === 'month' ? 'active' : ''}`}
              onClick={() => setPeriod('month')}
            >
              本月
            </button>
          </div>
        </div>

        {overview && (
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <div className="stat-card">
              <div className="stat-value">{overview.avg_emotion}</div>
              <div className="stat-label">{period === 'week' ? '本周' : '本月'}平均情绪</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{overview.month_avg_emotion}</div>
              <div className="stat-label">本月平均情绪</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{overview.avg_sleep_hours}h</div>
              <div className="stat-label">{period === 'week' ? '本周' : '本月'}平均睡眠</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{overview.stress_count}</div>
              <div className="stat-label">{period === 'week' ? '本周' : '本月'}压力事件</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{overview.support_count}</div>
              <div className="stat-label">获得支持次数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{overview.record_days}天</div>
              <div className="stat-label">{period === 'week' ? '本周' : '本月'}记录天数</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">📈 情绪趋势</h2>
        <div className="chart-container" style={{ height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="情绪评分"
                stroke="#ff6b8a"
                strokeWidth={2}
                dot={{ fill: '#ff6b8a', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="睡眠质量"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={{ fill: '#a78bfa', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">🎯 压力事件分布</h2>
        {stressDistribution.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '50%', height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stressPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stressPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STRESS_COLORS[index % STRESS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1 }}>
              {stressDistribution.map((s, index) => (
                <div
                  key={s.type}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        background: STRESS_COLORS[index % STRESS_COLORS.length],
                      }}
                    />
                    <span style={{ fontSize: '13px' }}>{s.type}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{s.count}次</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>{s.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p>暂无压力记录数据</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">💕 获得支持统计</h2>
        {supportCount && supportCount.by_type.length > 0 ? (
          <div>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '20px' }}>
              <div style={{ textAlign: 'center', flex: 1, padding: '16px', background: '#f0fdf4', borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 600, color: '#22c55e' }}>
                  {supportCount.total_support_days}
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>获得支持的天数</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1, padding: '16px', background: '#fef3c7', borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 600, color: '#f59e0b' }}>
                  {supportCount.total_support_count}
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>支持总次数</div>
              </div>
            </div>
            <div className="chart-container" style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={supportBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="次数" fill="#4ade80" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💝</div>
            <p>暂无支持记录，记得记录下你获得的支持哦~</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">💪 自我恢复评估曲线</h2>
        {recoveryCurve.length > 0 ? (
          <div className="chart-container" style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={recoveryData}>
                <defs>
                  <linearGradient id="colorSelf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff6b8a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff6b8a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorEmotion" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="自我评估"
                  stroke="#ff6b8a"
                  fillOpacity={1}
                  fill="url(#colorSelf)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="情绪评分"
                  stroke="#a78bfa"
                  fillOpacity={1}
                  fill="url(#colorEmotion)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📈</div>
            <p>暂无足够数据，坚持记录才能看到恢复曲线哦~</p>
          </div>
        )}
        <div style={{ marginTop: '12px', padding: '12px', background: '#fdf2f8', borderRadius: '8px' }}>
          <p style={{ fontSize: '13px', color: '#9d174d', lineHeight: 1.6 }}>
            💡 小提示：自我恢复评估是你对自己整体状态的主观评价。
            随着时间推移，你会看到自己的进步！即使有波动也是正常的，
            恢复本来就是一个曲折的过程。坚持记录，你会看到变化的 💕
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">💜 关怀计划完成率</h2>
        {careStats && careStats.total > 0 ? (
          <div>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
              <div style={{ textAlign: 'center', flex: 1, padding: '16px', background: '#faf5ff', borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 600, color: '#a78bfa' }}>
                  {careStats.completion_rate}%
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>近7天完成率</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1, padding: '16px', background: '#f0fdf4', borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 600, color: '#22c55e' }}>
                  {careStats.completed}/{careStats.total}
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>已完成/总数</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1, padding: '16px', background: '#fef3c7', borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 600, color: '#f59e0b' }}>
                  {careStats.pending}
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>待完成</div>
              </div>
            </div>
            <div className="chart-container" style={{ height: '220px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={careStats.daily_rates.map(d => ({
                    date: formatDate(d.date),
                    完成率: d.rate,
                    建议数: d.total,
                    已完成: d.completed,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip formatter={(value: number, name: string) => name === '完成率' ? `${value}%` : value} />
                  <Legend />
                  <Bar dataKey="完成率" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💜</div>
            <p>暂无关怀计划数据，去关怀计划页面查看今日建议吧~</p>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">📋 建议类型分布</h2>
        {careStats && careStats.category_distribution.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '50%', height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={careStats.category_distribution.map(c => ({
                      name: c.category_label,
                      value: c.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {careStats.category_distribution.map((_, index) => (
                      <Cell key={`care-cell-${index}`} fill={CARE_COLORS[index % CARE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1 }}>
              {careStats.category_distribution.map((c, index) => (
                <div
                  key={c.category}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '3px',
                        background: CARE_COLORS[index % CARE_COLORS.length],
                      }}
                    />
                    <span style={{ fontSize: '13px' }}>{c.category_label}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{c.count}条</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      完成{c.completed}条 · {c.percentage}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>暂无建议类型数据</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Statistics
