import React, { useState } from 'react'

interface SentMessage {
  jobId: string
  messageText: string
  hasInputChanged: boolean
  isProcessingRequest: boolean
  timestamp: number
}

function LeftPanel() {
  const [jobId, setJobId] = useState('')
  const [messageText, setMessageText] = useState('')
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([])
  const [error, setError] = useState('')
  const [hasInputChanged, setHasInputChanged] = useState(true)
  const [isProcessingRequest, setIsProcessingRequest] = useState(false)

  const handleSendMessage = async () => {
    // Validate inputs
    if (!jobId.trim()) {
      setError('JobId is required')
      return
    }
    if (jobId.length > 18) {
      setError('JobId must be 18 characters or less')
      return
    }
    if (!messageText.trim()) {
      setError('Message is required')
      return
    }
    if (messageText.length > 50) {
      setError('Message must be 50 characters or less')
      return
    }

    try {
      const response = await fetch('http://localhost:2112/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
          body: JSON.stringify({
            jobId: jobId.trim(),
            messageText: messageText.trim(),
            hasInputChanged,
            isProcessingRequest
          })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      await response.json()
      
      // Add message to sent list
      setSentMessages([
        {
          jobId: jobId.trim(),
          messageText: messageText.trim(),
          hasInputChanged,
          isProcessingRequest,
          timestamp: Date.now()
        },
        ...sentMessages
      ])

      // Clear inputs
      setJobId('')
      setMessageText('')
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage()
    }
  }

  return (
    <div className="left-panel">
      <div className="panel-section">
        <h2>Send Message</h2>
        
        <div className="form-group">
          <label htmlFor="jobId">JobId (max 18 characters)</label>
          <input
            id="jobId"
            type="text"
            maxLength={18}
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter JobId..."
          />
          <small style={{ marginTop: '3px', display: 'block', color: '#888' }}>
            {jobId.length}/18
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="message">Message (max 50 characters)</label>
          <input
            id="message"
            type="text"
            maxLength={50}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter message..."
          />
          <small style={{ marginTop: '3px', display: 'block', color: '#888' }}>
            {messageText.length}/50
          </small>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="checkbox" checked={hasInputChanged} onChange={(e) => setHasInputChanged(e.target.checked)} />
            Input Changed
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="checkbox" checked={isProcessingRequest} onChange={(e) => setIsProcessingRequest(e.target.checked)} />
            Processing
          </label>
        </div>

        {error && (
          <div style={{ color: '#ff6b6b', marginBottom: '10px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <button 
          onClick={handleSendMessage}
          style={{ width: '100%' }}
        >
          Send
        </button>
      </div>

      <div className="panel-section" style={{ flex: 1, overflow: 'auto' }}>
        <h2>Sent Messages</h2>
        {sentMessages.length === 0 ? (
          <div className="list-empty">No messages sent yet</div>
        ) : (
          <div className="list-container" style={{ height: 'auto' }}>
            {sentMessages.map((msg, idx) => (
              <div key={idx} className="list-item">
                <strong>{msg.jobId}</strong> - {msg.messageText}
                <br />
                <small style={{ color: '#888' }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </small>
                <br />
                <small style={{ color: msg.hasInputChanged ? '#4caf50' : '#888' }}>
                  Input Changed: {msg.hasInputChanged ? 'Yes' : 'No'}
                </small>
                <br />
                <small style={{ color: msg.isProcessingRequest ? '#ff9800' : '#888' }}>
                  Processing: {msg.isProcessingRequest ? 'Yes' : 'No'}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default LeftPanel
