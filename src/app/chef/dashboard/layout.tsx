
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, NotebookText, UserCircle, MessageSquare, CalendarDays, FileText, Users, ShoppingBag, LayoutGrid, ShieldAlert, LifeBuoy, Bell, LogOut, Users2, CombineIcon as Combine } from 'lucide-react'; // Corrected Combine import
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import type { NavItem } from '@/components/dashboard-layout'; 
import dynamic from 'next/dynamic';

const DashboardLayout = dynamic(() => 
  import('@/components/dashboard-layout').then(mod => mod.DashboardLayout),
  { ssr: false, loading: () => <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/> Loading Dashboard...</div> }
);


const chefNavItems: NavItem[] = [
  { href: '/chef/dashboard', label: 'Overview', icon: <LayoutDashboard />, matchExact: true },
  { href: '/chef/dashboard/profile', label: 'My Profile', icon: <UserCircle /> },
  { href: '/chef/dashboard/requests', label: 'Requests', icon: <MessageSquare /> },
  { href: '/chef/dashboard/calendar', label: 'Calendar & Events', icon: <CalendarDays /> },
  { href: '/wall', label: 'The Chef\'s Wall', icon: <LayoutGrid /> },
  { href: '/chef/dashboard/menus', label: 'Menus', icon: <NotebookText /> },
  { href: '/chef/dashboard/shopping-list', label: 'Shopping List', icon: <ShoppingBag /> },
  { href: '/chef/dashboard/chefs', label: 'Chef Directory', icon: <Users2 /> },
  { href: '/chef/dashboard/collaborations', label: 'Collaborations', icon: <Combine /> }, // Used Combine from lucide-react directly
  { href: '/chef/dashboard/receipts', label: 'Receipts & Costs', icon: <FileText /> },
];

export default function ChefDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading, isChef, isChefApproved, profileLoading } = useAuth();
  
  const isLoading = authLoading || profileLoading; 

  useEffect(() => {
    if (isLoading) {
      return; 
    }

    if (!user) {
      console.log("ChefDashboardLayout: No user, redirecting to login.");
      // window.location.href = ('/login?redirect=/chef/dashboard'); // Using router.push for SPA navigation
      router.push('/login?redirect=/chef/dashboard');
      return;
    }

    if (!isChef) {
      toast({
          title: 'Access Denied',
          description: 'You must be logged in as a chef to access this page.',
          variant: 'destructive',
      });
      console.log("ChefDashboardLayout: Not a chef, redirecting to login.");
      // window.location.href = ('/login');
      router.push('/login');
      return;
    }
    
  }, [user, isLoading, isChef, isChefApproved, router, toast]); // isChefApproved was in deps but not used for main redirect logic here

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" data-ai-hint="loading spinner" />
        <p className="ml-3 text-lg text-foreground">Loading Chef Dashboard...</p>
      </div>
    );
  }
  
  if (!user || !isChef) { 
     return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg text-foreground">Verifying chef access...</p>
      </div>
    );
  }

  // Check for chef approval after confirming the user is a chef and not loading
  // Allow admin to bypass approval for viewing their own chef dashboard if they also have chef role properties
  if (!isChefApproved && !(userProfile && userProfile.role === 'admin')) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600">
                <ShieldAlert className="h-8 w-8" data-ai-hint="security shield alert"/>
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
                try {
                  await signOut(auth);
                  toast({ title: "Logged Out", description: "You have been logged out." });
                } catch (error: any) {
                  console.error("Error signing out:", error);
                  toast({ title: "Logout Error", description: `Could not log out: ${error.message}`, variant: "destructive"});
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

  return (
    <DashboardLayout 
      navItems={chefNavItems}
    >
      {children}
    </DashboardLayout>
  );
}
    
