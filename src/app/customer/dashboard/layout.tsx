
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// import { DashboardLayout, type NavItem } from '@/components/dashboard-layout'; // Dynamic import
import { LayoutDashboard, UserCircle, Send, CalendarCheck2, MessageSquare, Utensils, CalendarSearch, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { NavItem } from '@/components/dashboard-layout'; // Import type directly
import dynamic from 'next/dynamic';

const DashboardLayout = dynamic(() => 
  import('@/components/dashboard-layout').then(mod => mod.DashboardLayout),
  { ssr: false, loading: () => <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/> Loading Dashboard...</div> }
);

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
  const { user, loading: authLoading, isCustomer, profileLoading } = useAuth(); // Added profileLoading
  const { toast } = useToast();
  
  const isLoading = authLoading || profileLoading;

  useEffect(() => {
    if (isLoading) {
      return; 
    }

    if (!user) {
      console.log("CustomerDashboardLayout: No user, redirecting to login.");
      router.push('/login?redirect=/customer/dashboard');
      return;
    }

    if (!isCustomer) {
      toast({
        title: 'Access Denied',
        description: 'This dashboard is for customers.',
        variant: 'destructive',
      });
      console.log("CustomerDashboardLayout: Not a customer, redirecting to login.");
      router.push('/login');
      return;
    }
    
  }, [user, isLoading, isCustomer, router, toast]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" data-ai-hint="loading spinner" />
        <p className="ml-3 text-lg">Loading Customer Dashboard...</p>
      </div>
    );
  }

  // This check handles the case after loading but before potential redirection effect runs
  if (!user || !isCustomer) {
     return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg">Verifying access...</p>
      </div>
    );
  }
  
  return (
    <DashboardLayout 
      navItems={customerNavItems}
    >
      {children}
    </DashboardLayout>
  );
}
