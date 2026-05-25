'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  Key,
  Globe,
  MapPin,
  Settings,
  LogOut,
  Pickaxe,
  Menu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Proyectos', href: '/dashboard/projects', icon: FolderKanban },
  { label: 'Keywords', href: '/dashboard/keywords', icon: Key },
  { label: 'Indexacion', href: '/dashboard/indexing', icon: Globe },
  { label: 'Ubicaciones', href: '/dashboard/locations', icon: MapPin },
  { label: 'Configuracion', href: '/dashboard/settings', icon: Settings },
]

function NavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  )
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5">
        <Pickaxe className="h-6 w-6 text-primary" aria-hidden="true" />
        <span className="text-lg font-bold text-sidebar-foreground tracking-tight">
          SEOImediato
        </span>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4" aria-label="Navegacion principal">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
            onClick={onNavClick}
          />
        ))}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Logout */}
      <div className="px-2 py-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Cerrar sesion
        </Button>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border lg:block"
        aria-label="Barra lateral"
      >
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center border-b border-border bg-background px-4 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menu de navegacion"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        <div className="ml-3 flex items-center gap-2">
          <Pickaxe className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="font-bold text-foreground">SEOImediato</span>
        </div>
      </div>
    </>
  )
}
