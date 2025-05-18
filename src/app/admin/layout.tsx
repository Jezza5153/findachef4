
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading, profileLoading } = useAuth();
  const { toast } = useToast();

  const isLoading = authLoading || profileLoading;

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to access this area.',
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
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading Admin Area...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    // This state is usually brief due to the redirect, but good for robustness
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-8 w-8" />
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
  return <>{children}</>;
}
