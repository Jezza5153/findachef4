import { DashboardLayout, type NavItem } from '@/components/dashboard-layout';
import { LayoutDashboard, NotebookText, UserCircle, MessageSquare, CalendarDays, FileText, Users, ShoppingBag } from 'lucide-react';

const chefNavItems: NavItem[] = [
  { href: '/chef/dashboard', label: 'Overview', icon: <LayoutDashboard />, matchExact: true },
  { href: '/chef/dashboard/profile', label: 'My Profile', icon: <UserCircle /> },
  { href: '/chef/dashboard/menus', label: 'Menus', icon: <NotebookText /> },
  { href: '/chef/dashboard/requests', label: 'Requests', icon: <MessageSquare /> },
  { href: '/chef/dashboard/calendar', label: 'Calendar & Events', icon: <CalendarDays /> },
  { href: '/chef/dashboard/shopping-list', label: 'Shopping List', icon: <ShoppingBag /> },
  { href: '/chef/dashboard/receipts', label: 'Receipts', icon: <FileText /> },
  { href: '/chef/dashboard/chef-directory', label: 'Chef Directory', icon: <Users /> },
];

export default function ChefDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout 
      navItems={chefNavItems}
      userName="Chef FullName" // Placeholder
      userRole="Professional Chef" // Placeholder
      userAvatarUrl="https://placehold.co/100x100.png" // Placeholder
    >
      {children}
    </DashboardLayout>
  );
}
