
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout, type NavItem } from '@/components/dashboard-layout';
import { LayoutDashboard, NotebookText, UserCircle, MessageSquare, CalendarDays, FileText, Users, ShoppingBag, LayoutGrid } from 'lucide-react';

const chefNavItems: NavItem[] = [
  { href: '/chef/dashboard', label: 'Overview', icon: <LayoutDashboard />, matchExact: true },
  { href: '/chef/dashboard/profile', label: 'My Profile', icon: <UserCircle /> },
  { href: '/chef/dashboard/requests', label: 'Requests', icon: <MessageSquare /> },
  { href: '/chef/dashboard/calendar', label: 'Calendar', icon: <CalendarDays /> },
  { href: '/chef/dashboard/wall', label: 'The Wall', icon: <LayoutGrid /> },
  { href: '/chef/dashboard/menus', label: 'Menus', icon: <NotebookText /> },
  { href: '/chef/dashboard/shopping-list', label: 'Shopping List', icon: <ShoppingBag /> },
  { href: '/chef/dashboard/chefs', label: 'Chefs', icon: <Users /> },
  { href: '/chef/dashboard/receipts', label: 'Receipts & Costs', icon: <FileText /> },
];

export default function ChefDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // This check needs to be client-side aware
    if (typeof window !== 'undefined') {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      if (isLoggedIn !== 'true') {
        router.push('/login');
      }
    }
  }, [router]);

  return (
    <DashboardLayout 
      navItems={chefNavItems}
      userName="Chef FullName" // Placeholder, will be updated by DashboardLayout from localStorage
      userRole="Professional Chef" // Placeholder
      userAvatarUrl="https://placehold.co/100x100.png" // Placeholder
    >
      {children}
    </DashboardLayout>
  );
}
