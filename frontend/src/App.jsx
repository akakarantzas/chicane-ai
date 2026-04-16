import { useState } from 'react'
import Home from './pages/Home'
import Predictions from './pages/Predictions'
import H2H from './pages/H2H'
import History from './pages/History'
import Season from './pages/Season'
import Contact from './pages/Contact'
export default function App() {
  const [route, setRoute] = useState({ page: 'home', key: 0 })

  const navigate = (page) => {
    setRoute((current) => ({
      page,
      key: page === 'predictions' ? current.key + 1 : current.key,
    }))
  }

  if (route.page === 'predictions') return <Predictions key={`predictions-${route.key}`} animationKey={route.key} onNavigate={navigate} />
  if (route.page === 'h2h') return <H2H onNavigate={navigate} />
  if (route.page === 'history') return <History onNavigate={navigate} />
  if (route.page === 'season') return <Season onNavigate={navigate} />
  if (route.page === 'contact') return <Contact onNavigate={navigate} />
  return <Home onNavigate={navigate} />
}
