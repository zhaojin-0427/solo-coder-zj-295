import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import EmotionDiary from './pages/EmotionDiary'
import StressTypes from './pages/StressTypes'
import EmergencyResources from './pages/EmergencyResources'
import MessageBoard from './pages/MessageBoard'
import BabySchedule from './pages/BabySchedule'
import Statistics from './pages/Statistics'
import CarePlan from './pages/CarePlan'
import { emotionAPI, messageAPI, userAPI } from './api'
import { LowMoodAlert } from './types'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [alerts, setAlerts] = useState<LowMoodAlert[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showAlert, setShowAlert] = useState(true)

  const tabs = [
    { key: 'diary', label: '情绪日记', path: '/diary' },
    { key: 'stress', label: '压力分类', path: '/stress' },
    { key: 'care', label: '关怀计划', path: '/care' },
    { key: 'emergency', label: '紧急求助', path: '/emergency' },
    { key: 'messages', label: '伴侣留言', path: '/messages' },
    { key: 'baby', label: '宝宝作息', path: '/baby' },
    { key: 'stats', label: '数据统计', path: '/stats' },
  ]

  const currentTab = tabs.find(t => location.pathname.startsWith(t.path))?.key || 'diary'

  useEffect(() => {
    loadAlerts()
    loadUnreadCount()
  }, [])

  const loadAlerts = async () => {
    try {
      const res = await emotionAPI.getAlerts(1)
      if (res.data.success) {
        const unacknowledged = res.data.data.filter((a: LowMoodAlert) => !a.is_acknowledged)
        setAlerts(unacknowledged)
      }
    } catch (e) {
      console.error('加载提醒失败', e)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const res = await messageAPI.getUnreadCount(1)
      if (res.data.success) {
        setUnreadCount(res.data.data.count)
      }
    } catch (e) {
      console.error('加载未读消息失败', e)
    }
  }

  const handleTabClick = (path: string) => {
    navigate(path)
  }

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await emotionAPI.acknowledgeAlert(alertId)
      setAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch (e) {
      console.error('确认提醒失败', e)
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>🌸 妈妈心情日记</h1>
        <div className="subtitle">记录每一刻，关爱你自己</div>
      </header>

      <main className="main-content">
        {alerts.length > 0 && showAlert && (
          <div className="alert-banner">
            <button className="alert-close" onClick={() => setShowAlert(false)}>×</button>
            <h3>💝 温馨提醒</h3>
            {alerts.slice(0, 1).map(alert => (
              <div key={alert.id}>
                <p>{alert.message}</p>
                <p style={{ fontSize: '13px', marginTop: '8px' }}>
                  您已连续 <strong>{alert.consecutive_low_days}</strong> 天情绪评分低于4分，
                  平均分为 <strong>{alert.average_score}</strong> 分。
                </p>
                {alert.resources && alert.resources.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <p style={{ fontWeight: 500, marginBottom: '8px' }}>推荐资源：</p>
                    {alert.resources.slice(0, 2).map((r, idx) => (
                      <div key={idx} style={{ fontSize: '13px', marginBottom: '4px' }}>
                        • {r.title}：{r.contact}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="btn btn-outline"
                  style={{ marginTop: '12px', background: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'white' }}
                  onClick={() => handleAcknowledgeAlert(alert.id)}
                >
                  我知道了
                </button>
              </div>
            ))}
          </div>
        )}

        <nav className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`nav-tab ${currentTab === tab.key ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.path)}
            >
              {tab.label}
              {tab.key === 'messages' && unreadCount > 0 && (
                <span style={{
                  marginLeft: '6px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '11px'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <Routes>
          <Route path="/" element={<Navigate to="/diary" replace />} />
          <Route path="/diary" element={<EmotionDiary onRefresh={() => { loadAlerts(); loadUnreadCount() }} />} />
          <Route path="/stress" element={<StressTypes />} />
          <Route path="/care" element={<CarePlan />} />
          <Route path="/emergency" element={<EmergencyResources />} />
          <Route path="/messages" element={<MessageBoard onRead={loadUnreadCount} />} />
          <Route path="/baby" element={<BabySchedule />} />
          <Route path="/stats" element={<Statistics />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
