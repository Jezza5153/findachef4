'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/logo';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/customer/menus', label: 'Find a Chef' },
  { href: '/chef/signup', label: 'Become a Chef' },
  { href: '/customer/dashboard', label: 'My Dashboard (Customer)'},
  { href: '/chef/dashboard', label: 'My Dashboard (Chef)'},
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navLinks.map((link) => (
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
          <Button asChild variant="default">
            <Link href="#">Login</Link>
          </Button>
        </nav>
        <div className="md:hidden">
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
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background py-4">
          <nav className="container mx-auto flex flex-col space-y-4 px-4 sm:px-6 lg:px-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block py-2 transition-colors hover:text-primary ${
                  pathname === link.href ? 'text-primary font-semibold' : 'text-foreground/70'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Button asChild variant="default" className="w-full">
              <Link href="#">Login</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
