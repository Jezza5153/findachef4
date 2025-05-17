
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout, type NavItem } from '@/components/dashboard-layout';
import { LayoutDashboard, NotebookText, UserCircle, MessageSquare, CalendarDays, FileText, Users, ShoppingBag, LayoutGrid, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

const chefNavItems: NavItem[] = [
  { href: '/chef/dashboard', label: 'Overview', icon: <LayoutDashboard />, matchExact: true },
  { href: '/chef/dashboard/profile', label: 'My Profile', icon: <UserCircle /> },
  { href: '/chef/dashboard/requests', label: 'Requests', icon: <MessageSquare /> },
  { href: '/chef/dashboard/calendar', label: 'Calendar & Events', icon: <CalendarDays /> },
  { href: '/chef/dashboard/wall', label: 'The Chef\'s Wall', icon: <LayoutGrid /> },
  { href: '/chef/dashboard/menus', label: 'Menus', icon: <NotebookText /> },
  { href: '/chef/dashboard/shopping-list', label: 'Shopping List', icon: <ShoppingBag /> },
  { href: '/chef/dashboard/chefs', label: 'Chef Directory', icon: <Users /> },
  { href: '/chef/dashboard/receipts', label: 'Receipts & Costs', icon: <FileText /> },
];

export default function ChefDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading, isChef, isChefApproved } = useAuth();
  
  const [statusChecked, setStatusChecked] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return; // Wait for Firebase auth state to resolve
    }

    if (!user) {
      router.push('/login');
      return;
    }

    if (!isChef) {
      toast({
          title: 'Access Denied',
          description: 'You must be logged in as a chef to access this page.',
          variant: 'destructive',
      });
      router.push('/login'); // Or perhaps to customer dashboard if role is customer
      return;
    }
    
    // At this point, user is authenticated and is a chef
    setStatusChecked(true);

  }, [user, authLoading, isChef, router, toast]);

  if (authLoading || !statusChecked) {
    return <div className="flex h-screen items-center justify-center">Loading chef dashboard...</div>;
  }
  
  if (!isChefApproved && isChef) { // Check if user is a chef but not approved
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600">
                <ShieldAlert className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Thank you for signing up! Your chef profile is currently under review by our team.
              You will be notified once your account is approved. This can take up to 48 hours.
            </p>
            <p className="text-sm text-muted-foreground">
              If you have any questions, please contact support.
            </p>
             <Button onClick={async () => {
                await signOut(auth);
                // localStorage items for user role etc. will be cleared naturally as AuthContext updates on logout
                router.push('/login'); 
             }}>
                Back to Login
             </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we reach here, user is an authenticated, chef, and approved
  return (
    <DashboardLayout 
      navItems={chefNavItems}
    >
      {children}
    </DashboardLayout>
  );
}
