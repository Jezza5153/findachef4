
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout, type NavItem } from '@/components/dashboard-layout';
import { LayoutDashboard, NotebookText, UserCircle, MessageSquare, CalendarDays, FileText, Users, ShoppingBag, LayoutGrid, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase'; // Import auth for logout
import { signOut } from 'firebase/auth'; // Import signOut

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
  const { user, loading: authLoading } = useAuth();
  
  const [chefStatusLoading, setChefStatusLoading] = useState(true);
  const [isApproved, setIsApproved] = useState<boolean>(false); // Default to false

  useEffect(() => {
    if (authLoading) {
      // Still waiting for Firebase to determine authentication state
      return;
    }

    if (!user) {
      // No Firebase user, redirect to login
      router.push('/login');
      setChefStatusLoading(false); // No further checks needed
      return;
    }

    // Firebase user exists, now check role and approval from localStorage (temporary)
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'chef') {
      toast({
          title: 'Access Denied',
          description: 'You must be logged in as a chef to access this page.',
          variant: 'destructive',
      });
      router.push('/login');
      setChefStatusLoading(false);
      return;
    }

    const chefApprovedStatus = localStorage.getItem('isChefApproved');
    setIsApproved(chefApprovedStatus === 'true');
    setChefStatusLoading(false); // All checks complete
    
  }, [user, authLoading, router, toast]);

  if (authLoading || chefStatusLoading) {
    return <div className="flex h-screen items-center justify-center">Loading chef dashboard...</div>;
  }

  // At this point, if user is null or role is not chef, a redirect should have occurred.
  // If isApproved is false, show the pending approval card.
  
  if (!isApproved) {
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
                await signOut(auth); // Sign out from Firebase
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('userName');
                    localStorage.removeItem('userRole');
                    localStorage.removeItem('isChefApproved');
                    localStorage.removeItem('isChefSubscribed');
                }
                router.push('/login'); 
             }}>
                Back to Login
             </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we reach here, user is an authenticated and approved chef
  return (
    <DashboardLayout 
      navItems={chefNavItems}
      // userName will be handled by DashboardLayout from AuthContext or localStorage
      // userRole will be handled by DashboardLayout
    >
      {children}
    </DashboardLayout>
  );
}
