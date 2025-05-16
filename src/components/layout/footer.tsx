import Link from 'next/link';
import { Logo } from '@/components/shared/logo';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95">
      <div className="container mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div>
            <Logo textClassName="text-xl" />
            <p className="mt-4 max-w-xs text-sm text-foreground/70">
              Connecting you with talented chefs for unforgettable culinary experiences.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-4">
            <div>
              <p className="font-medium text-foreground">Platform</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="#" className="text-foreground/70 hover:text-primary">About Us</Link></li>
                <li><Link href="#" className="text-foreground/70 hover:text-primary">How It Works</Link></li>
                <li><Link href="/chef/signup" className="text-foreground/70 hover:text-primary">Become a Chef</Link></li>
                <li><Link href="/customer/menus" className="text-foreground/70 hover:text-primary">Find a Chef</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-foreground">Support</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="#" className="text-foreground/70 hover:text-primary">Contact Us</Link></li>
                <li><Link href="#" className="text-foreground/70 hover:text-primary">FAQ</Link></li>
                <li><Link href="#" className="text-foreground/70 hover:text-primary">Help Center</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-foreground">Legal</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="#" className="text-foreground/70 hover:text-primary">Terms of Service</Link></li>
                <li><Link href="#" className="text-foreground/70 hover:text-primary">Privacy Policy</Link></li>
                <li><Link href="#" className="text-foreground/70 hover:text-primary">Cookie Policy</Link></li>
              </ul>
            </div>
             <div>
              <p className="font-medium text-foreground">Connect</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="#" className="text-foreground/70 hover:text-primary">Facebook</Link></li>
                <li><Link href="#" className="text-foreground/70 hover:text-primary">Instagram</Link></li>
                <li><Link href="#" className="text-foreground/70 hover:text-primary">Twitter</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border/40 pt-8">
          <p className="text-center text-xs text-foreground/70">
            &copy; {new Date().getFullYear()} CulinaryConnect. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
