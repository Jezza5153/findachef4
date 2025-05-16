
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout, type NavItem } from '@/components/dashboard-layout';
import { LayoutDashboard, NotebookText, UserCircle, MessageSquare, CalendarDays, FileText, Users, ShoppingBag, LayoutGrid, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const [isApproved, setIsApproved] = useState<boolean | null>(null); // null initially, then true/false

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const userRole = localStorage.getItem('userRole');
      const chefApprovedStatus = localStorage.getItem('isChefApproved');

      if (isLoggedIn !== 'true') {
        router.push('/login');
        return;
      }

      if (userRole !== 'chef') {
        // This layout is for chefs, redirect if not a chef
        toast({
            title: 'Access Denied',
            description: 'You must be logged in as a chef to access this page.',
            variant: 'destructive',
        });
        router.push('/login');
        return;
      }

      if (chefApprovedStatus === 'false') {
        setIsApproved(false);
        // No immediate redirect here, show message instead
      } else if (chefApprovedStatus === 'true') {
        setIsApproved(true);
      } else {
        // If status is not set, treat as not approved for safety
        setIsApproved(false);
        // Consider redirecting to login or showing a generic error if this state is unexpected
        // For now, will also show "awaiting approval"
      }
    }
  }, [router, toast]);

  if (isApproved === null) {
    // Still checking approval status, show a loading state or nothing
    return <div className="flex h-screen items-center justify-center">Loading chef dashboard...</div>;
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
              You will be notified once your account is approved.
            </p>
            <p className="text-sm text-muted-foreground">
              If you have any questions, please contact support.
            </p>
             <Button onClick={() => {
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('isLoggedIn');
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

  // isApproved is true
  return (
    <DashboardLayout 
      navItems={chefNavItems}
      userName="Chef FullName" 
      userRole="Professional Chef" 
      userAvatarUrl="https://placehold.co/100x100.png" 
    >
      {children}
    </DashboardLayout>
  );
}
// Added Card, CardHeader, CardTitle, CardContent, Button for the pending approval message.
// These were implicitly available via DashboardLayout but explicitly adding for standalone use.
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
