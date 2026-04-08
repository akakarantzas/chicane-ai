import { useState } from 'react'
import Home from './pages/Home'
import Predictions from './pages/Predictions'
import History from './pages/History'

export default function App() {
  const [page, setPage] = useState('home')

  if (page === 'predictions') return <Predictions onNavigate={setPage} />
  if (page === 'history') return <History onNavigate={setPage} />
  return <Home onNavigate={setPage} />
}
