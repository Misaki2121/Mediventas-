'use client'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  CreditCard, 
  BarChart3, 
  LogOut,
  Stethoscope,
  Menu,
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  full_name: string | null
  is_active: boolean | null
}

interface DashboardSidebarProps {
  user: User
  profile: Profile
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Doctores', href: '/doctores', icon: Users },
  { name: 'Productos', href: '/productos', icon: Package },
  { name: 'Ventas', href: '/ventas', icon: ShoppingCart },
  { name: 'Pagos', href: '/pagos', icon: CreditCard },
  { name: 'Reportes', href: '/reportes', icon: BarChart3 },
]

export function DashboardSidebar({ user, profile }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center gap-2 px-6 border-b border-teal-700">
        <Stethoscope className="h-8 w-8 text-white" />
        <span className="text-xl font-bold text-white">MediVentas</span>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-teal-700 text-white'
                  : 'text-teal-100 hover:bg-teal-700/50 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      
      <div className="p-4 border-t border-teal-700">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">
            {profile.full_name || user.email}
          </p>
          <p className="text-xs text-teal-200 truncate">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-teal-100 hover:bg-teal-700/50 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden bg-teal-600 text-white hover:bg-teal-700"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-teal-800 flex flex-col">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col bg-teal-800">
        <SidebarContent />
      </div>
    </>
  )
}
