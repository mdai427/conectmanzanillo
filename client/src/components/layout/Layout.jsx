import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import BottomNav from './BottomNav.jsx'
import EmergencyBanner from '../ui/EmergencyBanner.jsx'
import NewsTicker from '../ui/NewsTicker.jsx'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#0D1117] flex flex-col">
      <EmergencyBanner />
      <Navbar />
      <NewsTicker />
      <main className="flex-1 pb-20 sm:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
