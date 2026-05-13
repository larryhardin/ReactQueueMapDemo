import { useState, useEffect } from 'react'

interface QueueEntry {
  uuid: string
  jobId: string
  messageText: string
  hasInputChanged: boolean
  isProcessingRequest: boolean
}

function EventQueueDisplay() {
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  useEffect(() => {
    const interval = setInterval(fetchEventQueue, 500)
    return () => clearInterval(interval)
  }, [])

  const fetchEventQueue = async () => {
    try {
      const response = await fetch('http://localhost:2112/api/event-queue')
      const data = await response.json()
      setEntries(data)
      // Reset to first page if current page is out of range
      const maxPages = Math.ceil(data.length / itemsPerPage)
      if (currentPage > maxPages && maxPages > 0) {
        setCurrentPage(maxPages)
      }
    } catch (err) {
      console.error('Failed to fetch event queue:', err)
    }
  }

  const totalPages = Math.ceil(entries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const visibleEntries = entries.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div>
      <div className="list-container" style={{ height: '200px' }}>
        {entries.length === 0 ? (
          <div className="list-empty">Queue is empty</div>
        ) : (
          visibleEntries.map((entry, idx) => (
            <div key={`${entry.uuid}-${idx}`} className="list-item">
              <div>
                <strong>#{startIndex + idx + 1}</strong> {entry.jobId}
              </div>
              <div style={{ fontSize: '12px', marginTop: '3px', color: '#aaa' }}>
                {entry.messageText}
              </div>
              <div style={{ fontSize: '11px', marginTop: '3px', color: '#666' }}>
                UUID: {entry.uuid.slice(0, 13)}...
              </div>
              <div style={{ fontSize: '10px', marginTop: '2px', color: '#555' }}>
                Input Changed: {entry.hasInputChanged ? 'Yes' : 'No'} | Processing Request: {entry.isProcessingRequest ? 'Yes' : 'No'}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            {'<<'}
          </button>
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            {'<'}
          </button>
          <span style={{ padding: '5px 10px', color: '#888' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            {'>'}
          </button>
          <button 
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            {'>>'}
          </button>
        </div>
      )}
    </div>
  )
}

export default EventQueueDisplay
