import { useState } from 'react'
import Home from './pages/Home'
import Predictions from './pages/Predictions'

export default function App() {
  const [page, setPage] = useState('home')

  if (page === 'predictions') return <Predictions onNavigate={setPage} />
  return <Home onNavigate={setPage} />
}
