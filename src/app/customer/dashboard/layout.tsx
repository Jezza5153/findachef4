
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout, type NavItem } from '@/components/dashboard-layout';
import { LayoutDashboard, UserCircle, Send, CalendarCheck2, MessageSquare, Utensils, CalendarSearch } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const { user, userProfile, loading: authLoading, isCustomer } = useAuth();
  const { toast } = useToast();
  const [statusChecked, setStatusChecked] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return; // Wait for Firebase auth state to resolve
    }

    if (!user) {
      router.push('/login');
      return;
    }

    if (!isCustomer) {
      toast({
        title: 'Access Denied',
        description: 'This dashboard is for customers.',
        variant: 'destructive',
      });
      router.push('/login'); // Or perhaps to chef dashboard if role is chef
      return;
    }
    
    setStatusChecked(true);

  }, [user, authLoading, isCustomer, router, toast]);

  if (authLoading || !statusChecked) {
    return <div className="flex h-screen items-center justify-center">Loading customer dashboard...</div>;
  }
  
  // If we reach here, user is authenticated and is a customer
  return (
    <DashboardLayout 
      navItems={customerNavItems}
    >
      {children}
    </DashboardLayout>
  );
}
