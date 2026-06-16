import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import ClassList from './pages/ClassList'
import PublishClass from './pages/PublishClass'
import ClassDetail from './pages/ClassDetail'
import SuppliesList from './pages/SuppliesList'
import MyReservations from './pages/MyReservations'
import Pickup from './pages/Pickup'
import ReturnPage from './pages/ReturnPage'
import Sterilization from './pages/Sterilization'
import Overdue from './pages/Overdue'
import Waitlist from './pages/Waitlist'

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/classes" element={<ClassList />} />
        <Route path="/classes/publish" element={<PublishClass />} />
        <Route path="/classes/:id" element={<ClassDetail />} />
        <Route path="/supplies" element={<SuppliesList />} />
        <Route path="/my-reservations" element={<MyReservations />} />
        <Route path="/pickup" element={<Pickup />} />
        <Route path="/return" element={<ReturnPage />} />
        <Route path="/sterilization" element={<Sterilization />} />
        <Route path="/overdue" element={<Overdue />} />
        <Route path="/waitlist" element={<Waitlist />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  )
}
