import { useState, useEffect } from 'react'
import { resourceAPI } from '../api'
import { CounselingResource } from '../types'

function EmergencyResources() {
  const [resources, setResources] = useState<CounselingResource[]>([])
  const [emergencyResources, setEmergencyResources] = useState<CounselingResource[]>([])
  const [tips, setTips] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'emergency' | 'all' | 'tips'>('emergency')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [allRes, emergencyRes, tipsRes] = await Promise.all([
        resourceAPI.getResources(),
        resourceAPI.getEmergencyResources(),
        resourceAPI.getTips(),
      ])

      if (allRes.data.success) {
        setResources(allRes.data.data)
      }
      if (emergencyRes.data.success) {
        setEmergencyResources(emergencyRes.data.data)
      }
      if (tipsRes.data.success) {
        setTips(tipsRes.data.data)
      }
    } catch (e) {
      console.error('加载资源失败', e)
    }
  }

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      hotline: '📞',
      community: '👥',
      clinic: '🏥',
      app: '📱',
      other: '📌',
    }
    return icons[type] || '📌'
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hotline: '热线电话',
      community: '社区',
      clinic: '门诊',
      app: '应用',
      other: '其他',
    }
    return labels[type] || type
  }

  return (
    <div>
      <div className="card" style={{ background: 'linear-gradient(135deg, #ff6b8a 0%, #ff8a80 100%)', color: 'white' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🆘 紧急求助清单
        </h2>
        <p style={{ fontSize: '14px', opacity: 0.95 }}>
          如果你正在经历情绪危机，请立即寻求专业帮助。你不是一个人。
        </p>
      </div>

      <div className="card">
        <div className="tabs-row">
          <button
            className={`tab-btn ${activeTab === 'emergency' ? 'active' : ''}`}
            onClick={() => setActiveTab('emergency')}
          >
            紧急热线
          </button>
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            全部资源
          </button>
          <button
            className={`tab-btn ${activeTab === 'tips' ? 'active' : ''}`}
            onClick={() => setActiveTab('tips')}
          >
            自助小贴士
          </button>
        </div>

        {activeTab === 'emergency' && (
          <div>
            {emergencyResources.map(resource => (
              <div key={resource.id} className="resource-card emergency">
                <div className="resource-title">
                  {getTypeIcon(resource.type)} {resource.title}
                  <span className="emergency-badge">紧急</span>
                </div>
                <div className="resource-contact">📞 {resource.contact}</div>
                <div className="resource-desc">{resource.description}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'all' && (
          <div>
            {resources.map(resource => (
              <div
                key={resource.id}
                className={`resource-card ${resource.is_emergency ? 'emergency' : ''}`}
              >
                <div className="resource-title">
                  {getTypeIcon(resource.type)} {resource.title}
                  {resource.is_emergency && <span className="emergency-badge">紧急</span>}
                </div>
                <div className="resource-contact">{resource.contact}</div>
                <div className="resource-desc">{resource.description}</div>
                <div style={{ marginTop: '8px' }}>
                  <span className="tag" style={{ fontSize: '11px' }}>{getTypeLabel(resource.type)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tips' && (
          <div>
            {tips.map(tip => (
              <div key={tip.id} className="resource-card" style={{ borderLeftColor: '#a78bfa' }}>
                <div className="resource-title">
                  💡 {tip.title}
                </div>
                <div style={{ fontSize: '12px', color: '#a78bfa', marginBottom: '6px' }}>
                  {tip.category}
                </div>
                <div className="resource-desc">{tip.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          💝 给妈妈的话
        </h3>
        <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#92400e' }}>
          亲爱的妈妈，<br /><br />
          你已经很棒了。照顾一个小生命是世界上最辛苦也最伟大的工作。<br /><br />
          感到疲惫、焦虑、甚至抑郁，都不是你的错。产后激素的剧烈变化、睡眠不足、角色的转变，
          这些都会影响你的情绪。<br /><br />
          请记住：寻求帮助不是软弱的表现，而是对自己和宝宝负责的表现。
          专业的支持可以帮助你更快地走出困境。<br /><br />
          你值得被好好对待，包括被你自己。 💕
        </p>
      </div>
    </div>
  )
}

export default EmergencyResources
