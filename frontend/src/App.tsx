import LeftPanel from './components/LeftPanel'
import RightPanel from './components/RightPanel'
import './App.css'

function App() {
  return (
    <div className="app-container">
      <div className="app-content">
        <LeftPanel />
        <RightPanel />
      </div>
    </div>
  )
}

export default App
