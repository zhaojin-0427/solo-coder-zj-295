import { useState, useEffect } from 'react'
import { statsAPI, careAPI, careMedAPI, feedingAPI, rehabAPI } from '../api'
import {
  StatsOverview,
  EmotionTrendItem,
  StressDistributionItem,
  SupportCountData,
  CareStats,
  CareMedStats,
  FeedingStats,
  RehabStats,
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

const FEEDING_COLORS = [
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#10b981',
]

const tooltipStyle = {
  backgroundColor: '#1e1e1e',
  border: '1px solid #333',
  borderRadius: '8px',
  color: '#f5f5f5',
}

function Statistics() {
  const [overview, setOverview] = useState<StatsOverview | null>(null)
  const [emotionTrend, setEmotionTrend] = useState<EmotionTrendItem[]>([])
  const [stressDistribution, setStressDistribution] = useState<StressDistributionItem[]>([])
  const [supportCount, setSupportCount] = useState<SupportCountData | null>(null)
  const [recoveryCurve, setRecoveryCurve] = useState<any[]>([])
  const [careStats, setCareStats] = useState<CareStats | null>(null)
  const [careMedStats, setCareMedStats] = useState<CareMedStats | null>(null)
  const [feedingStats, setFeedingStats] = useState<FeedingStats | null>(null)
  const [rehabStats, setRehabStats] = useState<RehabStats | null>(null)
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = async () => {
    try {
      const [overviewRes, trendRes, stressRes, supportRes, recoveryRes, careRes, careMedRes, feedingRes, rehabRes] = await Promise.all([
        statsAPI.getOverview(1, period),
        statsAPI.getEmotionTrend(1, period),
        statsAPI.getStressDistribution(1, period),
        statsAPI.getSupportCount(1, period),
        statsAPI.getRecoveryCurve(1, period === 'week' ? 'month' : 'month'),
        careAPI.getStats(1, 7),
        careMedAPI.getStats(1, 30),
        feedingAPI.getStats(1, 30),
        rehabAPI.getStats(1, 30),
      ])

      if (overviewRes.data.success) setOverview(overviewRes.data.data)
      if (trendRes.data.success) setEmotionTrend(trendRes.data.data)
      if (stressRes.data.success) setStressDistribution(stressRes.data.data)
      if (supportRes.data.success) setSupportCount(supportRes.data.data)
      if (recoveryRes.data.success) setRecoveryCurve(recoveryRes.data.data)
      if (careRes.data.success) setCareStats(careRes.data.data)
      if (careMedRes.data.success) setCareMedStats(careMedRes.data.data)
      if (feedingRes.data.success) setFeedingStats(feedingRes.data.data)
      if (rehabRes.data.success) setRehabStats(rehabRes.data.data)
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

      <div className="stats-section">
        <h2 className="stats-section-title">🏥 复诊与用药统计（近30天）</h2>

        {careMedStats ? (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">复诊完成率</div>
                <div className="stat-value" style={{ color: '#4ade80' }}>
                  {careMedStats.visits.completion_rate.toFixed(1)}%
                </div>
                <div className="stat-sub">
                  {careMedStats.visits.completed}/{careMedStats.visits.total} 次完成
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">用药依从率</div>
                <div className="stat-value" style={{ color: '#60a5fa' }}>
                  {careMedStats.medication.adherence_rate.toFixed(1)}%
                </div>
                <div className="stat-sub">
                  {careMedStats.medication.taken_total}/{careMedStats.medication.expected_total} 次服用
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">漏服总次数</div>
                <div className="stat-value" style={{ color: '#fb923c' }}>
                  {careMedStats.medication.missed_total}
                </div>
                <div className="stat-sub">共 {careMedStats.medication.daily_adherence.length} 天</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">不适反应次数</div>
                <div className="stat-value" style={{ color: '#f472b6' }}>
                  {careMedStats.reactions.total}
                </div>
                <div className="stat-sub">
                  严重 {careMedStats.reactions.severity_distribution.filter((s: any) => s.severity >= 4).reduce((a: number, b: any) => a + b.count, 0)} 次
                </div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="card chart-card">
                <h3>复诊完成情况</h3>
                {careMedStats.visits.daily_rates && careMedStats.visits.daily_rates.length > 0 ? (
                  <div className="chart-wrapper">
                    <BarChart data={careMedStats.visits.daily_rates} width={600} height={300}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                      <XAxis dataKey="date" stroke="#a3a3a3" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#a3a3a3" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey="total" name="计划" fill="#a78bfa" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="completed" name="完成" fill="#4ade80" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </div>
                ) : (
                  <div className="empty-state"><p>暂无复诊记录</p></div>
                )}
              </div>

              <div className="card chart-card">
                <h3>每日用药依从率</h3>
                {careMedStats.medication.daily_adherence.length > 0 ? (
                  <div className="chart-wrapper">
                    <LineChart data={careMedStats.medication.daily_adherence} width={600} height={300}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                      <XAxis dataKey="date" stroke="#a3a3a3" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#a3a3a3" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${v}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="rate" name="依从率" stroke="#60a5fa" strokeWidth={3} dot={{ fill: '#60a5fa' }} />
                    </LineChart>
                  </div>
                ) : (
                  <div className="empty-state"><p>暂无用药记录</p></div>
                )}
              </div>
            </div>

            <div className="stats-grid">
              <div className="card chart-card">
                <h3>漏服次数趋势</h3>
                {careMedStats.medication.missed_trend && careMedStats.medication.missed_trend.length > 0 ? (
                  <div className="chart-wrapper">
                    <AreaChart data={careMedStats.medication.missed_trend} width={600} height={300}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                      <XAxis dataKey="date" stroke="#a3a3a3" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#a3a3a3" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Area type="monotone" dataKey="missed" name="漏服次数" stroke="#fb923c" fill="#fb923c" fillOpacity={0.3} strokeWidth={2} />
                    </AreaChart>
                  </div>
                ) : (
                  <div className="empty-state"><p>暂无漏服记录</p></div>
                )}
              </div>

              <div className="card chart-card">
                <h3>不适反应分布</h3>
                {careMedStats.reactions.symptom_distribution.length > 0 ? (
                  <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <h4 style={{ marginBottom: '12px', fontSize: '14px', color: '#a3a3a3' }}>症状分布</h4>
                      <div className="chart-wrapper">
                        <PieChart width={300} height={260}>
                          <Pie
                            data={careMedStats.reactions.symptom_distribution}
                            dataKey="count"
                            nameKey="symptom"
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={90}
                            label={({ symptom, percentage }) => `${symptom} ${percentage.toFixed(0)}%`}
                          >
                            {careMedStats.reactions.symptom_distribution.map((_: any, idx: number) => (
                              <Cell key={idx} fill={SUPPORT_COLORS[idx % SUPPORT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ marginBottom: '12px', fontSize: '14px', color: '#a3a3a3' }}>严重程度分布</h4>
                      <div className="chart-wrapper">
                        <BarChart data={careMedStats.reactions.severity_distribution} width={300} height={260} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                          <XAxis type="number" stroke="#a3a3a3" />
                          <YAxis type="category" dataKey="severity_label" stroke="#a3a3a3" width={60} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="count" name="次数" radius={[0, 6, 6, 0]}>
                            {careMedStats.reactions.severity_distribution.map((item: any, idx: number) => (
                              <Cell key={idx} fill={item.severity >= 4 ? '#ef4444' : ['#4ade80', '#fbbf24', '#fb923c'][Math.min(item.severity - 1, 2)] || '#60a5fa'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state"><p>暂无不适反应记录</p></div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🏥</div>
            <p>暂无复诊用药统计数据</p>
          </div>
        )}
      </div>

      <div className="stats-section">
        <h2 className="stats-section-title">🤱 母乳喂养与泌乳统计（近30天）</h2>

        {feedingStats ? (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">总喂养次数</div>
                <div className="stat-value" style={{ color: '#ec4899' }}>
                  {feedingStats.overview.total_feed_count}
                </div>
                <div className="stat-sub">日均 {feedingStats.overview.avg_daily_count} 次</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">总产奶量</div>
                <div className="stat-value" style={{ color: '#3b82f6' }}>
                  {feedingStats.overview.total_milk_ml}ml
                </div>
                <div className="stat-sub">日均约 {Math.round(feedingStats.overview.total_milk_ml / 30)}ml</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">宝宝平均接受度</div>
                <div className="stat-value" style={{ color: '#10b981' }}>
                  {feedingStats.overview.avg_baby_acceptance}
                </div>
                <div className="stat-sub">满分 5 分</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">乳房不适事件</div>
                <div className="stat-value" style={{ color: '#f59e0b' }}>
                  {feedingStats.overview.care_record_count}
                </div>
                <div className="stat-sub">
                  严重 {feedingStats.overview.severe_care_count} 次
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">目标达成率</div>
                <div className="stat-value" style={{ color: '#8b5cf6' }}>
                  {feedingStats.overview.overall_goal_rate}%
                </div>
                <div className="stat-sub">
                  {feedingStats.overview.achieved_goals_count}/{feedingStats.overview.active_goals_count} 项达成
                </div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="card chart-card">
                <h3>📈 喂养次数趋势（近30天）</h3>
                {feedingStats.daily_trend && feedingStats.daily_trend.length > 0 ? (
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={feedingStats.daily_trend.map(d => ({
                        date: formatDate(d.date),
                        喂养次数: d.feed_count,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                        <XAxis dataKey="date" stroke="#a3a3a3" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#a3a3a3" />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Bar dataKey="喂养次数" fill="#ec4899" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="empty-state"><p>暂无喂养记录</p></div>
                )}
              </div>

              <div className="card chart-card">
                <h3>💧 奶量变化曲线</h3>
                {feedingStats.milk_curve && feedingStats.milk_curve.some(m => m.milk_ml > 0) ? (
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={feedingStats.milk_curve.map(m => ({
                        date: formatDate(m.date),
                        奶量_ml: m.milk_ml,
                      }))}>
                        <defs>
                          <linearGradient id="colorMilk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                        <XAxis dataKey="date" stroke="#a3a3a3" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#a3a3a3" />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="奶量_ml"
                          stroke="#3b82f6"
                          fill="url(#colorMilk)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="empty-state"><p>暂无吸奶量数据</p></div>
                )}
              </div>
            </div>

            <div className="stats-grid">
              <div className="card chart-card">
                <h3>🍼 喂养方式占比</h3>
                {feedingStats.type_distribution && feedingStats.type_distribution.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '50%', height: '250px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={feedingStats.type_distribution.map(t => ({
                              name: t.type_label,
                              value: t.count,
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {feedingStats.type_distribution.map((_, index) => (
                              <Cell key={`feed-type-${index}`} fill={FEEDING_COLORS[index % FEEDING_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ flex: 1 }}>
                      {feedingStats.type_distribution.map((t, index) => (
                        <div
                          key={t.type}
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
                                background: FEEDING_COLORS[index % FEEDING_COLORS.length],
                              }}
                            />
                            <span style={{ fontSize: '13px' }}>{t.type_label}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: 500 }}>{t.count}次</div>
                            <div style={{ fontSize: '11px', color: '#999' }}>{t.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state"><p>暂无喂养记录</p></div>
                )}
              </div>

              <div className="card chart-card">
                <h3>🎯 泌乳目标达成情况</h3>
                {feedingStats.goal_achievement && feedingStats.goal_achievement.length > 0 ? (
                  <div style={{ padding: '8px 0' }}>
                    {feedingStats.goal_achievement.map((goal, index) => (
                      <div key={goal.id} style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '13px', color: '#e5e7eb' }}>
                            {goal.goal_type_label}
                          </span>
                          <span style={{ fontSize: '13px', color: goal.achieved ? '#4ade80' : '#fbbf24', fontWeight: 500 }}>
                            {goal.current_value}/{goal.target_value}{goal.unit} ({goal.completion_rate}%)
                          </span>
                        </div>
                        <div style={{ height: '10px', background: '#374151', borderRadius: '5px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(goal.completion_rate, 100)}%`,
                              background: goal.achieved ? '#4ade80' : FEEDING_COLORS[index % FEEDING_COLORS.length],
                              borderRadius: '5px',
                              transition: 'width 0.3s',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state"><p>暂无泌乳目标，去喂养护理页面设置吧</p></div>
                )}
              </div>
            </div>

            <div className="stats-grid">
              <div className="card chart-card">
                <h3>🏥 乳房不适事件分布</h3>
                {feedingStats.breast_care_stats && feedingStats.breast_care_stats.total > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '50%', height: '250px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={feedingStats.breast_care_stats.type_distribution.map(t => ({
                              name: t.type_label,
                              value: t.count,
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {feedingStats.breast_care_stats.type_distribution.map((_, index) => (
                              <Cell key={`care-${index}`} fill={['#ef4444', '#f97316', '#f59e0b', '#eab308', '#8b5cf6', '#6b7280'][index % 6]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ flex: 1 }}>
                      {feedingStats.breast_care_stats.type_distribution.map((t, index) => (
                        <div
                          key={t.type}
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
                                background: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#8b5cf6', '#6b7280'][index % 6],
                              }}
                            />
                            <span style={{ fontSize: '13px' }}>{t.type_label}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: 500 }}>{t.count}次</div>
                            <div style={{ fontSize: '11px', color: '#999' }}>{t.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state"><p>暂无乳房护理记录</p></div>
                )}
              </div>

              <div className="card chart-card">
                <h3>📊 不适严重程度分布</h3>
                {feedingStats.breast_care_stats && feedingStats.breast_care_stats.severity_distribution.length > 0 ? (
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={feedingStats.breast_care_stats.severity_distribution.map(s => ({
                          严重程度: s.severity_label,
                          次数: s.count,
                        }))}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
                        <XAxis type="number" stroke="#a3a3a3" />
                        <YAxis type="category" dataKey="严重程度" stroke="#a3a3a3" width={70} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="次数" name="次数" radius={[0, 6, 6, 0]}>
                          {feedingStats.breast_care_stats.severity_distribution.map((item: any, idx: number) => (
                            <Cell
                              key={idx}
                              fill={item.severity >= 4 ? '#ef4444' : ['#4ade80', '#22c55e', '#fbbf24', '#fb923c'][Math.min(item.severity - 1, 3)] || '#60a5fa'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="empty-state"><p>暂无严重程度数据</p></div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '16px', background: '#fdf2f8', borderRadius: '12px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#9d174d' }}>💡 母乳喂养小贴士</h4>
              <ul style={{ fontSize: '13px', color: '#9d174d', lineHeight: 1.8, marginLeft: '18px' }}>
                <li>新生儿建议按需喂养，每天约 8-12 次，每次 15-30 分钟</li>
                <li>保持双侧乳房交替喂养，避免单侧过度充盈导致堵奶</li>
                <li>每天保持充足的水分摄入（2000-2500ml），有助于乳汁分泌</li>
                <li>充分休息、减少压力，良好的情绪有助于泌乳</li>
                <li>如出现乳房严重胀痛、堵奶超过24小时或伴随发烧，请及时就医 💕</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🤱</div>
            <p>暂无喂养统计数据，去喂养护理页面记录吧</p>
          </div>
        )}
      </div>

      <div className="stats-section">
        <h3 className="stats-title">🏃‍♀️ 产后康复训练统计</h3>
        {rehabStats ? (
          <>
            <div className="stats-grid">
              <div className="stats-card">
                <div className="stats-card-label">训练完成率</div>
                <div className="stats-card-value" style={{ color: '#f97316' }}>
                  {rehabStats.overview.completion_rate.toFixed(1)}%
                </div>
                <div className="stats-card-sub">近30天</div>
              </div>
              <div className="stats-card">
                <div className="stats-card-label">总训练时长</div>
                <div className="stats-card-value" style={{ color: '#8b5cf6' }}>
                  {rehabStats.overview.total_duration_minutes}
                  <span style={{ fontSize: '14px' }}> 分钟</span>
                </div>
                <div className="stats-card-sub">累计 {rehabStats.overview.total_training_count} 次训练</div>
              </div>
              <div className="stats-card">
                <div className="stats-card-label">目标达成率</div>
                <div className="stats-card-value" style={{ color: '#10b981' }}>
                  {rehabStats.goals.overall_rate.toFixed(1)}%
                </div>
                <div className="stats-card-sub">
                  {rehabStats.goals.achieved}/{rehabStats.goals.total} 个目标
                </div>
              </div>
              <div className="stats-card">
                <div className="stats-card-label">异常反馈</div>
                <div className="stats-card-value" style={{ color: '#ef4444' }}>
                  {rehabStats.daily_trend.reduce((sum: number, d: any) => sum + d.pain_count + d.leakage_count + d.dizziness_count, 0)}
                  <span style={{ fontSize: '14px' }}> 次</span>
                </div>
                <div className="stats-card-sub">需关注身体信号</div>
              </div>
            </div>

            <div className="chart-card">
              <h4 className="chart-title">训练类型分布</h4>
              {rehabStats.type_distribution && rehabStats.type_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={rehabStats.type_distribution}
                      dataKey="count"
                      nameKey="type_label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ type_label, percentage }) => `${type_label} ${percentage.toFixed(0)}%`}
                    >
                      {rehabStats.type_distribution.map((entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={['#f97316', '#8b5cf6', '#10b981', '#3b82f6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1'][index % 8]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><p>暂无训练类型数据</p></div>
              )}
            </div>

            <div className="chart-card">
              <h4 className="chart-title">近30天身体反馈趋势</h4>
              {rehabStats.body_feedback_trend && rehabStats.body_feedback_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={rehabStats.body_feedback_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avg_pain"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      name="平均疼痛等级"
                    />
                    <Line
                      type="monotone"
                      dataKey="leakage_count"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                      name="漏尿次数"
                    />
                    <Line
                      type="monotone"
                      dataKey="dizziness_count"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                      name="头晕次数"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><p>暂无反馈趋势数据</p></div>
              )}
            </div>

            <div className="chart-card">
              <h4 className="chart-title">每日训练时长与完成情况</h4>
              {rehabStats.daily_trend && rehabStats.daily_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={rehabStats.daily_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="duration_minutes" name="训练时长(分)" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="completion_rate" name="完成率(%)" stroke="#10b981" strokeWidth={2} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state"><p>暂无每日趋势数据</p></div>
              )}
            </div>

            <div style={{ marginTop: '16px', padding: '16px', background: '#fff7ed', borderRadius: '12px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#c2410c' }}>💡 产后康复小贴士</h4>
              <ul style={{ fontSize: '13px', color: '#c2410c', lineHeight: 1.8, marginLeft: '18px' }}>
                <li>产后6周内以轻柔的盆底肌训练和呼吸放松为主，避免剧烈运动</li>
                <li>腹直肌分离修复需在专业指导下进行，先评估分离程度再选择训练方式</li>
                <li>训练时如出现疼痛加重、漏尿增多、头晕乏力等情况请立即停止并休息</li>
                <li>循序渐进、持之以恒是产后康复的关键，不要急于求成</li>
                <li>建议定期复诊，根据医生评估调整康复计划 💕</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🏃‍♀️</div>
            <p>暂无康复训练统计数据，去康复训练页面开始记录吧</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Statistics
