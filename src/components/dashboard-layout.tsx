
'use client';

import React, { useEffect, useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Logo } from '@/components/shared/logo';
import { Button } from './ui/button';
import { LogOut, User, Bell, LifeBuoy } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { auth } from '@/lib/firebase'; // Import auth for signOut
import { signOut } from 'firebase/auth'; // Import signOut


export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactElement;
  matchExact?: boolean;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  userName?: string; // This prop can be deprecated if AuthContext provides name
  userRole?: string; // This prop can be deprecated
  userAvatarUrl?: string; // This prop can be deprecated
}

export function DashboardLayout({
  children,
  navItems,
  userAvatarUrl, // Keep for now if not in AuthContext yet
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth(); // Get user from AuthContext

  const [currentUserName, setCurrentUserName] = useState("User");
  const [currentUserRole, setCurrentUserRole] = useState("Role");


  useEffect(() => {
    if (user) {
      setCurrentUserName(user.displayName || user.email?.split('@')[0] || "User");
      // Role still comes from localStorage until Firestore profiles are implemented
      const storedRole = localStorage.getItem('userRole');
      if (storedRole) {
        setCurrentUserRole(storedRole === 'chef' ? 'Professional Chef' : 'Valued Customer');
      } else {
        setCurrentUserRole(user.email?.includes('chef@') ? 'Professional Chef' : 'Valued Customer'); // Fallback logic
      }
    } else {
      // Attempt to get from localStorage if no Firebase user (e.g. during initial load phase before context updates)
      const storedName = localStorage.getItem('userName');
      const storedRole = localStorage.getItem('userRole');
      if (storedName) setCurrentUserName(storedName);
      if (storedRole) setCurrentUserRole(storedRole === 'chef' ? 'Professional Chef' : 'Valued Customer');
    }
  }, [user, pathname]); // Re-run if user changes or path changes (for initial setup)

  const handleLogout = async () => {
    try {
      await signOut(auth); // Sign out from Firebase
      if (typeof window !== 'undefined') {
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
        localStorage.removeItem('isChefApproved');
        localStorage.removeItem('isChefSubscribed');
      }
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: 'Logout Failed',
        description: 'Could not log out. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-background">
        <Sidebar variant="sidebar" collapsible="icon" className="border-r">
          <SidebarHeader className="p-4 flex items-center justify-between">
             <div className="group-data-[collapsible=icon]:hidden">
                <Logo textClassName="text-xl"/>
             </div>
             <div className="hidden group-data-[collapsible=icon]:block">
                <Logo className="h-7 w-7" textClassName="hidden"/>
             </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.matchExact ? pathname === item.href : pathname.startsWith(item.href)}
                    tooltip={{children: item.label, side: 'right'}}
                  >
                    <Link href={item.href}>
                      {React.cloneElement(item.icon, { className: "h-5 w-5" })}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 mt-auto border-t">
            <div className="group-data-[collapsible=icon]:hidden flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={user?.photoURL || userAvatarUrl || "https://placehold.co/40x40.png"} alt={currentUserName} data-ai-hint="person avatar" />
                <AvatarFallback>{currentUserName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-sidebar-foreground">{currentUserName}</p>
                <p className="text-xs text-sidebar-foreground/70">{currentUserRole}</p>
              </div>
            </div>
            <div className="hidden group-data-[collapsible=icon]:flex justify-center">
               <Avatar>
                <AvatarImage src={user?.photoURL || userAvatarUrl || "https://placehold.co/40x40.png"} alt={currentUserName} data-ai-hint="person avatar" />
                <AvatarFallback>{currentUserName.substring(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur px-6">
            <div className="flex items-center">
              <SidebarTrigger className="md:hidden mr-2" />
              <h1 className="text-xl font-semibold text-foreground">
                {navItems.find(item => item.matchExact ? pathname === item.href : pathname.startsWith(item.href))?.label || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Emergency Help">
                    <LifeBuoy className="h-5 w-5 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Emergency Assistance</AlertDialogTitle>
                    <AlertDialogDescription>
                      For immediate, life-threatening emergencies, please contact your local emergency services (e.g., 000, 911, 112).
                      <br /><br />
                      For urgent platform issues regarding an ongoing or imminent event, please:
                      <ul className="list-disc list-inside mt-2">
                        <li>Email: <a href="mailto:support@findachef.com" className="underline">support@findachef.com</a> (Example)</li>
                        <li>Call: Your Emergency Contact Number Here</li>
                      </ul>
                      Please have your Event ID and relevant details ready.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogAction>Understood</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="icon" aria-label="Profile" asChild>
                <Link href={currentUserRole?.toLowerCase().includes('chef') ? '/chef/dashboard/profile' : '/customer/dashboard/profile'}>
                    <User className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Logout" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
