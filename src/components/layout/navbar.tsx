
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/logo';
import { Menu, X, LogOut, UserCircle, LayoutDashboard } from 'lucide-react'; 
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar'; 

const baseNavLinks = [
  { href: '/', label: 'Home' },
  { href: '/customer/menus', label: 'Find a Chef' },
  { href: '/chef/signup', label: 'Become a Chef' },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, loading: authLoading, isAdmin } = useAuth();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
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

  const getDashboardLink = () => {
    if (authLoading) return "#"; // Or some other loading state indicator
    if (!user || !userProfile) return "/login"; // Should ideally not happen if user is true, but defensive
    if (isAdmin) return '/admin';
    if (userProfile.role === 'chef') return '/chef/dashboard';
    if (userProfile.role === 'customer') return '/customer/dashboard';
    return '/login'; // Fallback
  };

  const getNavLinksForRender = () => {
    if (authLoading) return []; // Don't render links until auth state is known
    
    let links = [
      { href: '/', label: 'Home' },
      { href: '/customer/menus', label: 'Find a Chef' },
    ];

    if (!user) {
      links.push({ href: '/chef/signup', label: 'Become a Chef' });
    }
    return links;
  };

  const currentRenderNavLinks = getNavLinksForRender();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {currentRenderNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors hover:text-primary ${
                pathname === link.href ? 'text-primary font-semibold' : 'text-foreground/70'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth Section */}
        <div className="hidden md:flex items-center space-x-3">
          {authLoading ? (
            <Button variant="ghost" disabled size="sm">Loading...</Button>
          ) : user && userProfile ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={getDashboardLink()}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> My Dashboard
                </Link>
              </Button>
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={userProfile.profilePictureUrl || user.photoURL || undefined} alt={userProfile.name || user.displayName || 'User'} data-ai-hint="person avatar" />
                <AvatarFallback>{(userProfile.name || user.displayName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <div className="md:hidden">
           {/* SidebarTrigger is for main dashboard layouts, here we need a simple button for navbar's mobile menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background py-4 absolute w-full shadow-lg">
          <nav className="container mx-auto flex flex-col space-y-2 px-4 sm:px-6 lg:px-8">
            {currentRenderNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block py-2 text-base transition-colors hover:text-primary ${
                  pathname === link.href ? 'text-primary font-semibold' : 'text-foreground/70'
                }`}
                onClick={() => setIsMobileMenuOpen(false)} 
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-2 border-border/40" />
            {authLoading ? (
              <Button variant="ghost" disabled className="w-full justify-start py-2 text-base">Loading...</Button>
            ) : user && userProfile ? (
              <>
                <Link
                    href={getDashboardLink()}
                    className="block py-2 text-base text-foreground/70 transition-colors hover:text-primary"
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    My Dashboard
                </Link>
                <Button variant="outline" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full justify-start py-2 text-base">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              </>
            ) : (
              <Button asChild variant="default" className="w-full text-base">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
