import { useState, useEffect } from 'react'
import RequestMapDisplay from './RequestMapDisplay'
import EventQueueDisplay from './EventQueueDisplay'
import WorkerQueuesDisplay from './WorkerQueuesDisplay'

interface QueueStatus {
  paused: boolean
  concurrency: number
}

function RightPanel() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ paused: true, concurrency: 2 })
  const [notification, setNotification] = useState<string>('')

  useEffect(() => {
    // Fetch initial queue status
    fetchQueueStatus()
    
    // Poll for updates
    const interval = setInterval(fetchQueueStatus, 500)
    return () => clearInterval(interval)
  }, [])

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('http://localhost:2112/api/queue/status')
      const data = await response.json()
      setQueueStatus(data)
    } catch (err) {
      console.error('Failed to fetch queue status:', err)
    }
  }

  const handlePauseQueue = async () => {
    try {
      await fetch('http://localhost:2112/api/queue/pause', { method: 'POST' })
      setQueueStatus(prev => ({ ...prev, paused: true }))
      showNotification('Queue paused')
    } catch (err) {
      console.error('Failed to pause queue:', err)
    }
  }

  const handlePlayQueue = async () => {
    try {
      await fetch('http://localhost:2112/api/queue/play', { method: 'POST' })
      setQueueStatus(prev => ({ ...prev, paused: false }))
      showNotification('Queue resumed')
    } catch (err) {
      console.error('Failed to play queue:', err)
    }
  }

  const showNotification = (message: string) => {
    setNotification(message)
    setTimeout(() => setNotification(''), 3000)
  }

  return (
    <div className="right-panel">
      {notification && (
        <div className="notification">{notification}</div>
      )}

      <div className="panel-section">
        <h2>Event Request Map</h2>
        <RequestMapDisplay />
      </div>

      <div className="panel-section">
        <h2>Event Queue</h2>
        <EventQueueDisplay />
      </div>

      <div className="queue-status">
        Status: <strong>{queueStatus.paused ? 'PAUSED' : 'RUNNING'}</strong> | 
        Concurrency: <strong>{queueStatus.concurrency}</strong>
      </div>

      <div className="queue-controls">
        <button 
          className="queue-button"
          onClick={handlePauseQueue}
          disabled={queueStatus.paused}
          title="Pause event queueing"
        >
          ⏸ Pause
        </button>
        <button 
          className="queue-button"
          onClick={handlePlayQueue}
          disabled={!queueStatus.paused}
          title="Activate event queueing"
        >
          ▶ Play
        </button>
      </div>

      <div className="horizontal-divider"></div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <h2>Workers</h2>
        <WorkerQueuesDisplay />
      </div>
    </div>
  )
}

export default RightPanel

