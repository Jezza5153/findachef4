
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout, type NavItem } from '@/components/dashboard-layout';
import { LayoutDashboard, UserCircle, Send, CalendarCheck2, MessageSquare, Utensils, CalendarSearch } from 'lucide-react';

const customerNavItems: NavItem[] = [
  { href: '/customer/dashboard', label: 'Overview', icon: <LayoutDashboard />, matchExact: true },
  { href: '/customer/dashboard/profile', label: 'My Profile', icon: <UserCircle /> },
  { href: '/customer/requests/new', label: 'Make a Request', icon: <Send /> },
  { href: '/customer/menus', label: 'Browse Chef Menus', icon: <Utensils /> }, 
  { href: '/customer/wall', label: 'Browse Chef Events', icon: <CalendarSearch /> },
  { href: '/customer/dashboard/events', label: 'My Booked Events', icon: <CalendarCheck2 /> },
  { href: '/customer/dashboard/messages', label: 'Messages', icon: <MessageSquare /> },
];

export default function CustomerDashboardLayout({
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
      navItems={customerNavItems}
      userName="Customer Name" // Placeholder, will be updated by DashboardLayout from localStorage
      userRole="Valued Customer" // Placeholder
      userAvatarUrl="https://placehold.co/100x100.png" // Placeholder
    >
      {children}
    </DashboardLayout>
  );
}
