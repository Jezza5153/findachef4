
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useState } from 'react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });

      // Temporary: Set localStorage for role-based redirection until Firestore profiles are used
      // In a real app, fetch role from Firestore based on user.uid
      if (typeof window !== 'undefined') {
        localStorage.setItem('userName', user.displayName || data.email.split('@')[0] || 'User');
        if (data.email.toLowerCase().includes('chef@')) {
          localStorage.setItem('userRole', 'chef');
          // Simulate chef approval status for demo. In real app, this comes from Firestore.
          // For testing an unapproved chef, set this to 'false'.
          // For testing an approved but unsubscribed chef, set 'isChefApproved' to 'true' and 'isChefSubscribed' to 'false'.
          // For testing an approved and subscribed chef:
          if (data.email.toLowerCase() === 'approvedchef@example.com') {
            localStorage.setItem('isChefApproved', 'true');
            localStorage.setItem('isChefSubscribed', 'true');
          } else {
            localStorage.setItem('isChefApproved', 'false'); 
            localStorage.setItem('isChefSubscribed', 'false');
          }
          router.push('/chef/dashboard');
        } else {
          localStorage.setItem('userRole', 'customer');
          localStorage.removeItem('isChefApproved');
          localStorage.removeItem('isChefSubscribed');
          router.push('/customer/dashboard');
        }
      }

    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Failed to login. Please check your credentials.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many login attempts. Please try again later.';
      }
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LogIn className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-bold">Login to FindAChef</CardTitle>
          <CardDescription className="text-lg">
            Access your dashboard and manage your culinary experiences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com (e.g., chef@example.com or customer@example.com)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-lg py-3" size="lg" disabled={isLoading || form.formState.isSubmitting}>
                {isLoading ? 'Logging in...' : <><LogIn className="mr-2 h-5 w-5" /> Login</>}
              </Button>
            </form>
          </Form>
          <div className="mt-6 space-y-3 text-center text-sm">
            <p>
              <Link href="#" className="font-medium text-primary hover:underline">
                Forgot Password?
              </Link>
            </p>
            <p>
              New to FindAChef?{' '}
              <Link href="/chef/signup" className="font-medium text-primary hover:underline">
                Sign up as a Chef
              </Link>
            </p>
            <p>
              New to FindAChef?{' '}
              <Link href="/customer/signup" className="font-medium text-primary hover:underline">
                Sign up as a Customer
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
