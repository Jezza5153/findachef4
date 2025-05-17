
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
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    if (authLoading) {
      // Still waiting for Firebase to determine authentication state
      return;
    }

    if (!user) {
      // No Firebase user, redirect to login
      router.push('/login');
      setRoleChecked(true); // No further checks needed
      return;
    }

    // Firebase user exists, now check role from localStorage (temporary)
    const userRole = localStorage.getItem('userRole');
    if (userRole && userRole !== 'customer') {
      toast({
        title: 'Access Denied',
        description: 'This dashboard is for customers.',
        variant: 'destructive',
      });
      router.push('/login'); 
    }
    setRoleChecked(true); // Role check complete

  }, [user, authLoading, router, toast]);

  if (authLoading || !roleChecked) {
    return <div className="flex h-screen items-center justify-center">Loading customer dashboard...</div>;
  }
  
  if (!user && !authLoading && roleChecked) {
    // This case handles if user becomes null after initial load but before redirect in useEffect
    // This should be rare if useEffect redirect is quick
    return <div className="flex h-screen items-center justify-center">Redirecting to login...</div>;
  }


  // If we reach here, user is authenticated and role check (if applicable) has passed
  return (
    <DashboardLayout 
      navItems={customerNavItems}
      // userName will be handled by DashboardLayout from AuthContext or localStorage
      // userRole will be handled by DashboardLayout
    >
      {children}
    </DashboardLayout>
  );
}
