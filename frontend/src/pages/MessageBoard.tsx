import { useState, useEffect } from 'react'
import { messageAPI } from '../api'
import { Message } from '../types'

interface MessageBoardProps {
  onRead?: () => void
}

function MessageBoard({ onRead }: MessageBoardProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [senderRole, setSenderRole] = useState<'partner' | 'mom'>('mom')
  const [submitting, setSubmitting] = useState(false)
  const [showCompose, setShowCompose] = useState(false)

  useEffect(() => {
    loadMessages()
  }, [senderRole])

  const loadMessages = async () => {
    try {
      if (senderRole === 'mom') {
        const res = await messageAPI.getInbox(1)
        if (res.data.success) {
          setMessages(res.data.data)
        }
      } else {
        const res = await messageAPI.getSentMessages(2)
        if (res.data.success) {
          setMessages(res.data.data)
        }
      }
    } catch (e) {
      console.error('加载消息失败', e)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      alert('请输入留言内容')
      return
    }

    setSubmitting(true)
    try {
      const res = await messageAPI.sendMessage({
        sender_id: 2,
        recipient_id: 1,
        content: newMessage,
        is_anonymous: isAnonymous,
      })

      if (res.data.success) {
        setNewMessage('')
        setShowCompose(false)
        loadMessages()
        alert('留言发送成功！')
      }
    } catch (e) {
      console.error('发送失败', e)
      alert('发送失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkViewed = async (messageId: number) => {
    try {
      await messageAPI.markViewed(messageId)
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId ? { ...m, is_viewed: true } : m
        )
      )
      if (onRead) onRead()
    } catch (e) {
      console.error('标记已读失败', e)
    }
  }

  const handleMarkAllViewed = async () => {
    try {
      await messageAPI.markAllViewed(1)
      setMessages(prev =>
        prev.map(m => ({ ...m, is_viewed: true }))
      )
      if (onRead) onRead()
    } catch (e) {
      console.error('全部已读失败', e)
    }
  }

  const formatTime = (timeStr: string) => {
    const d = new Date(timeStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`

    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  const unreadCount = messages.filter(m => !m.is_viewed).length

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            💕 伴侣留言板
          </h2>
          <div className="tabs-row" style={{ marginBottom: 0 }}>
            <button
              className={`tab-btn ${senderRole === 'mom' ? 'active' : ''}`}
              onClick={() => setSenderRole('mom')}
            >
              我收到的
            </button>
            <button
              className={`tab-btn ${senderRole === 'partner' ? 'active' : ''}`}
              onClick={() => setSenderRole('partner')}
            >
              我发出的
            </button>
          </div>
        </div>

        {senderRole === 'mom' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#888' }}>
                共 {messages.length} 条留言
                {unreadCount > 0 && <span style={{ color: '#ff6b8a', marginLeft: '8px' }}>{unreadCount} 条未读</span>}
              </span>
              {unreadCount > 0 && (
                <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={handleMarkAllViewed}>
                  全部已读
                </button>
              )}
            </div>

            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💌</div>
                <p>还没有留言，让伴侣给你写些鼓励的话吧~</p>
              </div>
            ) : (
              messages.map(message => (
                <div
                  key={message.id}
                  className={`message-item ${!message.is_viewed ? 'unread' : ''}`}
                  onClick={() => { if (!message.is_viewed) handleMarkViewed(message.id) }}
                >
                  <div className="message-header">
                    <span className="sender">
                      {message.is_anonymous ? '🎭 匿名的TA' : `💝 ${message.sender_name}`}
                    </span>
                    <span className="time">{formatTime(message.created_at)}</span>
                  </div>
                  <div className="message-content">{message.content}</div>
                  {!message.is_viewed && (
                    <div style={{ textAlign: 'right', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#ff6b8a' }}>● 新消息</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: '16px' }}
              onClick={() => setShowCompose(!showCompose)}
            >
              {showCompose ? '取消' : '✍️ 写一条鼓励的话'}
            </button>

            {showCompose && (
              <div style={{ marginBottom: '20px', padding: '16px', background: '#f9f9f9', borderRadius: '12px' }}>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">留言内容</label>
                  <textarea
                    className="form-textarea"
                    placeholder="写一些鼓励的话给她吧，哪怕只是一句'你辛苦了'..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    rows={4}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={e => setIsAnonymous(e.target.checked)}
                  />
                  <label htmlFor="anonymous" style={{ fontSize: '13px', color: '#666' }}>
                    匿名发送（不显示发送者身份）
                  </label>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={handleSendMessage}
                  disabled={submitting}
                >
                  {submitting ? '发送中...' : '发送留言 💕'}
                </button>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <p>还没有发送过留言，给她写第一句鼓励的话吧~</p>
              </div>
            ) : (
              messages.map(message => (
                <div key={message.id} className="message-item">
                  <div className="message-header">
                    <span className="sender">
                      发给妈妈 {message.is_anonymous && '（匿名）'}
                    </span>
                    <span className="time">{formatTime(message.created_at)}</span>
                  </div>
                  <div className="message-content">{message.content}</div>
                  <div style={{ textAlign: 'right', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: message.is_viewed ? '#4ade80' : '#aaa' }}>
                      {message.is_viewed ? '✓ 已读' : '未读'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>💡 给伴侣的话</h3>
        <div style={{ fontSize: '14px', lineHeight: 1.8, color: '#9d174d' }}>
          <p>亲爱的伴侣：</p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>产后妈妈的情绪波动很大，这是激素变化导致的，不是她"矫情"</li>
            <li>多听她说，少给建议。有时候她需要的只是一个拥抱</li>
            <li>主动承担家务和照顾宝宝的责任，让她有时间休息</li>
            <li>鼓励她寻求专业帮助，如果她需要的话</li>
            <li>照顾好你自己，你状态好才能更好地支持她</li>
          </ul>
          <p style={{ marginTop: '12px' }}>你的陪伴和理解，是她最好的良药。 💕</p>
        </div>
      </div>
    </div>
  )
}

export default MessageBoard
