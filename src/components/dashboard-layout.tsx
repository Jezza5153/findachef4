
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
import { LogOut, User, Bell } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactElement;
  matchExact?: boolean;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  userName?: string;
  userRole?: string;
  userAvatarUrl?: string;
}

export function DashboardLayout({
  children,
  navItems,
  userName: initialUserName = "User",
  userRole: initialUserRole = "Role",
  userAvatarUrl,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [currentUserName, setCurrentUserName] = useState(initialUserName);
  const [currentUserRole, setCurrentUserRole] = useState(initialUserRole);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('userName');
      const storedRole = localStorage.getItem('userRole');
      if (storedName) setCurrentUserName(storedName);
      if (storedRole) setCurrentUserRole(storedRole);
    }
  }, [pathname]); // Re-check on route change if needed, or use a global state

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userName');
      localStorage.removeItem('userRole');
    }
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
    });
    router.push('/login');
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
                <AvatarImage src={userAvatarUrl || "https://placehold.co/40x40.png"} alt={currentUserName} data-ai-hint="person avatar" />
                <AvatarFallback>{currentUserName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-sidebar-foreground">{currentUserName}</p>
                <p className="text-xs text-sidebar-foreground/70">{currentUserRole}</p>
              </div>
            </div>
            <div className="hidden group-data-[collapsible=icon]:flex justify-center">
               <Avatar>
                <AvatarImage src={userAvatarUrl || "https://placehold.co/40x40.png"} alt={currentUserName} data-ai-hint="person avatar" />
                <AvatarFallback>{currentUserName.substring(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur px-6">
            <div className="flex items-center">
              <SidebarTrigger className="md:hidden mr-2" />
              {/* Breadcrumbs or Page Title can go here */}
              <h1 className="text-xl font-semibold text-foreground">
                {navItems.find(item => item.matchExact ? pathname === item.href : pathname.startsWith(item.href))?.label || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Profile">
                <User className="h-5 w-5" /> {/* This could link to the specific profile page */}
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
