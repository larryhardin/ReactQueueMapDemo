import  { useState, useEffect } from 'react'

interface QueueEntry {
  uuid: string
  jobId: string
  messageText: string
  hasInputChanged: boolean
  isProcessingRequest: boolean
}

interface WorkerState {
  id: number
  status: 'IDLE' | 'PROCESSING'
  currentMessage?: QueueEntry
  queue: QueueEntry[]
}

function WorkerQueuesDisplay() {
  const [workers, setWorkers] = useState<WorkerState[]>([])

  useEffect(() => {
    const interval = setInterval(fetchWorkers, 500)
    return () => clearInterval(interval)
  }, [])

  const fetchWorkers = async () => {
    try {
      const response = await fetch('http://localhost:2112/api/workers')
      const data = await response.json()
      setWorkers(data)
    } catch (err) {
      console.error('Failed to fetch workers:', err)
    }
  }

  return (
    <div className="worker-queues">
      {workers.map(worker => {
        let displayedItems = worker.queue
        if (displayedItems.length === 0 && worker.currentMessage) {
          displayedItems = [worker.currentMessage]
        }

        return (
        <div key={worker.id} className="worker-queue">
          <h3>Queue {worker.id}</h3>
          <div style={{ 
            marginBottom: '10px', 
            padding: '8px',
            backgroundColor: '#2a2a2a',
            borderRadius: '4px',
            fontSize: '13px'
          }}>
            Status: <strong>{worker.status}</strong>
          </div>
          <div className="list-container" style={{ flex: 1 }}>
            {displayedItems.length === 0 ? (
              <div className="list-empty">No items</div>
            ) : (
              displayedItems.map((item, idx) => (
                <div key={`${item.uuid}-${idx}`} className="list-item">
                  <div>
                    <strong>{item.jobId}</strong>
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '3px', color: '#aaa' }}>
                    {item.messageText}
                  </div>
                  <div style={{ fontSize: '10px', marginTop: '2px', color: '#666' }}>
                    Input Changed: {item.hasInputChanged ? 'Yes' : 'No'} | Processing Request: {item.isProcessingRequest ? 'Yes' : 'No'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )})}
    </div>
  )
}

export default WorkerQueuesDisplay
