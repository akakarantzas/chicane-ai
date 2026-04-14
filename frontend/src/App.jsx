import { useState } from 'react'
import Home from './pages/Home'
import Predictions from './pages/Predictions'
import History from './pages/History'
import Season from './pages/Season'
import Contact from './pages/Contact'
export default function App() {
  const [page, setPage] = useState('home')

  if (page === 'predictions') return <Predictions onNavigate={setPage} />
  if (page === 'history') return <History onNavigate={setPage} />
  if (page === 'season') return <Season onNavigate={setPage} />
  if (page === 'contact') return <Contact onNavigate={setPage} />
  return <Home onNavigate={setPage} />
}
