import React from 'react'
import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="mb-6">
        <h2 className="text-lg font-bold">Menu</h2>
      </div>
      <nav className="flex flex-col gap-2">
        <NavLink to="/" className={({isActive})=> isActive? 'font-medium text-blue-600' : 'text-gray-700'}>Dashboard</NavLink>
      </nav>
    </aside>
  )
}
