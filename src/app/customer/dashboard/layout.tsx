import { DashboardLayout, type NavItem } from '@/components/dashboard-layout';
import { LayoutDashboard, UserCircle, FileText, Send, CalendarCheck2, Heart } from 'lucide-react';

const customerNavItems: NavItem[] = [
  { href: '/customer/dashboard', label: 'Overview', icon: <LayoutDashboard />, matchExact: true },
  { href: '/customer/dashboard/profile', label: 'My Profile', icon: <UserCircle /> },
  { href: '/customer/menus', label: 'Browse Menus', icon: <Heart /> }, // Link to main browse page
  { href: '/customer/requests/new', label: 'Make a Request', icon: <Send /> },
  { href: '/customer/dashboard/events', label: 'My Events', icon: <CalendarCheck2 /> },
  { href: '/customer/dashboard/messages', label: 'Messages', icon: <FileText /> },
];

export default function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout 
      navItems={customerNavItems}
      userName="Customer Name" // Placeholder
      userRole="Valued Customer" // Placeholder
      userAvatarUrl="https://placehold.co/100x100.png" // Placeholder
    >
      {children}
    </DashboardLayout>
  );
}
