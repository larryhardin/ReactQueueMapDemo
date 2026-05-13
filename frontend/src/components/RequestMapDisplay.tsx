import { useState, useEffect } from 'react'

interface RequestMapEntry {
  uuid: string
  jobId: string
  messageText: string
  hasInputChanged: boolean
  isProcessingRequest: boolean
  status: 'NEW' | 'PROCESSING' | 'COMPLETED' | 'CANCELLING' | 'DUPLICATE' | 'WAITING' | 'CANCELLED'
  createdAt: number
}

function RequestMapDisplay() {
  const [entries, setEntries] = useState<RequestMapEntry[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  useEffect(() => {
    const interval = setInterval(fetchRequestMap, 500)
    return () => clearInterval(interval)
  }, [])

  const fetchRequestMap = async () => {
    try {
      const response = await fetch('http://localhost:2112/api/request-map')
      const data = await response.json()
      setEntries(data)
      // Reset to first page if current page is out of range
      const maxPages = Math.ceil(data.length / itemsPerPage)
      if (currentPage > maxPages && maxPages > 0) {
        setCurrentPage(maxPages)
      }
    } catch (err) {
      console.error('Failed to fetch request map:', err)
    }
  }

  const totalPages = Math.ceil(entries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const visibleEntries = entries.slice(startIndex, startIndex + itemsPerPage)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'new'
      case 'PROCESSING': return 'processing'
      case 'COMPLETED': return 'completed'
      case 'CANCELLING': return 'cancelling'
      case 'DUPLICATE': return 'duplicate'
      case 'WAITING': return 'waiting'
      case 'CANCELLED': return 'cancelled'
      default: return 'new'
    }
  }

  return (
    <div>
      <div className="list-container" style={{ height: '200px' }}>
        {entries.length === 0 ? (
          <div className="list-empty">No requests yet</div>
        ) : (
          visibleEntries.map(entry => (
            <div key={entry.uuid} className="list-item">
              <div>
                <strong>{entry.uuid.slice(0, 8)}</strong>
                <span className={`status-badge ${getStatusColor(entry.status)}`}>
                  {entry.status}
                </span>
              </div>
              <div style={{ fontSize: '12px', marginTop: '5px', color: '#aaa' }}>
                {entry.jobId} - {entry.messageText}
              </div>
              <div style={{ fontSize: '10px', marginTop: '4px', color: '#666' }}>
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

export default RequestMapDisplay
