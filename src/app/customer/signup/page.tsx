
// src/app/customer/signup/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';

export default function CustomerSignupPage() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
           <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserPlus className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-bold">Customer Signup</CardTitle>
          <CardDescription className="text-lg">
            Join FindAChef to discover amazing culinary experiences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            The customer signup process is being refined. 
            For now, please imagine a simple form here for email, password, and name.
          </p>
          <p className="text-muted-foreground">
            In a full implementation, this page would contain a form similar to the Chef Signup,
            but tailored for customer information.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Back to Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
