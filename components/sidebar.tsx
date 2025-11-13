'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Warehouse,
  Package,
  Wrench,
  Truck,
  FileText,
  CheckSquare,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Warehouses', href: '/warehouses', icon: Warehouse },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Spare Parts', href: '/spare-parts', icon: Wrench },
  { name: 'Sales & Dispatch', href: '/sales-dispatch', icon: Truck },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Task Manager', href: '/tasks', icon: CheckSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-md bg-white shadow-md text-slate-600 hover:text-slate-900 hover:bg-slate-50"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black/50" onClick={closeMobileMenu} />
          <div className="relative flex h-full w-64 flex-col bg-slate-900 text-white">
            <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-400" />
                <span className="ml-3 text-xl font-bold">WMS</span>
              </div>
              <button
                onClick={closeMobileMenu}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={cn(
                      'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-800 p-4">
              <button
                onClick={() => {}}
                className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className={cn('hidden lg:flex lg:h-screen lg:w-64 lg:flex-col lg:border-r lg:bg-slate-900 lg:text-white', className)}>
        <div className="flex h-16 items-center border-b border-slate-800 px-6">
          <Package className="h-8 w-8 text-blue-400" />
          <span className="ml-3 text-xl font-bold">WMS</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <button
            onClick={() => {}}
            className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
