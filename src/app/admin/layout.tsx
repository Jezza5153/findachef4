'use client';

import React, { useEffect, useState } from 'react'; // Added React import
import { useRouter } from 'next/navigation';
// import { DashboardLayout, type NavItem } from '@/components/dashboard-layout'; // Dynamic import
import { LayoutGrid, Users, ShieldAlert, NotebookText, FileText, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import type { NavItem } from '@/components/dashboard-layout'; // Import type directly
import dynamic from 'next/dynamic';

const DashboardLayout = dynamic(() => 
  import('@/components/dashboard-layout').then(mod => mod.DashboardLayout),
  { ssr: false, loading: () => <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary"/> Loading Dashboard Layout...</div> }
);


const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'Overview & Mgmt', icon: <LayoutGrid />, matchExact: true },
  // Add more admin-specific links here as sections develop
  // e.g., { href: '/admin/users', label: 'User Management', icon: <Users /> },
  // e.g., { href: '/admin/menus', label: 'Menu Approvals', icon: <NotebookText /> },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading, profileLoading } = useAuth();
  const { toast } = useToast();
  
  // Combine loading states: auth state + profile (which includes claims)
  const isLoading = authLoading || profileLoading;

  useEffect(() => {
    console.log("AdminLayout: isLoading:", isLoading, "user:", !!user, "isAdmin:", isAdmin);
    if (!isLoading) {
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to access the admin area.',
          variant: 'destructive',
        });
        router.push('/login');
      } else if (!isAdmin) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access the admin dashboard.',
          variant: 'destructive',
        });
        router.push('/'); // Redirect to homepage or another suitable page
      }
    }
  }, [isLoading, user, isAdmin, router, toast]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" data-ai-hint="loading spinner" />
        <p className="ml-3 text-lg">Loading Admin Area...</p>
      </div>
    );
  }

  // This secondary check handles the brief moment after loading but before redirection effect runs
  // or if something unexpected happens where isAdmin might be false despite user being present.
  if (!user || !isAdmin) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-8 w-8" data-ai-hint="security shield alert"/>
            </div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You do not have the necessary permissions to view this page.
              You will be redirected shortly.
            </p>
            <Button onClick={() => router.push('/')}>Go to Homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated and is an admin
  return (
    <DashboardLayout navItems={adminNavItems}>
      {children}
    </DashboardLayout>
  );
}