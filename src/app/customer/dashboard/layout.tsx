
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout, type NavItem } from '@/components/dashboard-layout';
import { LayoutDashboard, UserCircle, Send, CalendarCheck2, MessageSquare, Utensils, CalendarSearch } from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
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
  const { user, loading: authLoading } = useAuth(); // Use AuthContext
  const { toast } = useToast();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      setCheckingAuth(false);
      if (!user) {
        router.push('/login');
        return;
      }
      // Temporary role check until Firestore profiles are in place
      const userRole = localStorage.getItem('userRole');
      if (user && userRole && userRole !== 'customer') {
        toast({
          title: 'Access Denied',
          description: 'This dashboard is for customers.',
          variant: 'destructive',
        });
        // Redirect to a generic page or their own dashboard if applicable
        router.push('/login'); 
        return;
      }
    }
  }, [user, authLoading, router, toast]);

  if (authLoading || checkingAuth) {
    return <div className="flex h-screen items-center justify-center">Loading customer dashboard...</div>;
  }

  if (!user) {
    // Should have been redirected by useEffect, but as a fallback
    return null;
  }

  return (
    <DashboardLayout 
      navItems={customerNavItems}
      userName="Customer Name" // Placeholder, will be updated by DashboardLayout from localStorage or context
      userRole="Valued Customer" // Placeholder
      userAvatarUrl="https://placehold.co/100x100.png" 
    >
      {children}
    </DashboardLayout>
  );
}
