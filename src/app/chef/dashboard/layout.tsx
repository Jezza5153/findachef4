
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout, type NavItem } from '@/components/dashboard-layout';
import { LayoutDashboard, NotebookText, UserCircle, MessageSquare, CalendarDays, FileText, Users, ShoppingBag, LayoutGrid, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth(); // Use AuthContext
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      setCheckingAuth(false);
      if (!user) {
        router.push('/login');
        return;
      }

      // Role and approval check (still using localStorage temporarily for these specifics)
      const userRole = localStorage.getItem('userRole');
      if (userRole !== 'chef') {
        toast({
            title: 'Access Denied',
            description: 'You must be logged in as a chef to access this page.',
            variant: 'destructive',
        });
        router.push('/login'); // Or a more appropriate page
        return;
      }

      const chefApprovedStatus = localStorage.getItem('isChefApproved');
      if (chefApprovedStatus === 'false') {
        setIsApproved(false);
      } else if (chefApprovedStatus === 'true') {
        setIsApproved(true);
      } else {
        // If not set (e.g., direct navigation after login but before localStorage fully syncs or unexpected state)
        // Treat as not approved or handle as an error. For now, show pending.
        setIsApproved(false); 
      }
    }
  }, [user, authLoading, router, toast]);

  if (authLoading || checkingAuth || (user && isApproved === null)) {
    // Show loading state while auth is resolving or approval status is being checked
    return <div className="flex h-screen items-center justify-center">Loading chef dashboard...</div>;
  }

  if (!user) {
    // Should have been redirected by useEffect, but as a fallback
    return null; 
  }
  
  if (isApproved === false) {
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
             <Button onClick={() => {
                if (typeof window !== 'undefined') {
                    // Keep Firebase Auth session, but clear local mock role data
                    localStorage.removeItem('userName');
                    localStorage.removeItem('userRole');
                    localStorage.removeItem('isChefApproved');
                    localStorage.removeItem('isChefSubscribed');
                }
                // Consider logging out from Firebase as well or redirecting to a generic logged-in landing page
                router.push('/login'); 
             }}>
                Back to Login
             </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // isApproved is true and user is authenticated
  return (
    <DashboardLayout 
      navItems={chefNavItems}
      userName="Chef FullName" // Placeholder, will be updated by DashboardLayout from localStorage or context
      userRole="Professional Chef" // Placeholder
      userAvatarUrl="https://placehold.co/100x100.png" 
    >
      {children}
    </DashboardLayout>
  );
}
