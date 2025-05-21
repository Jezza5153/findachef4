
'use client';
import { Suspense } from 'react';
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
import { LogIn, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import type { AppUserProfileContext, CustomerProfile } from '@/types';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery) {
      form.setValue('email', emailFromQuery);
    }
  }, [searchParams, form]);

  const handleLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    console.log("LoginPage: Attempting login for email:", data.email);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      console.log("LoginPage: Firebase Auth successful for UID:", user.uid, "Email:", user.email);
      
      toast({
        title: 'Login Successful',
        description: 'Welcome back! Redirecting...',
      });

      let roleForRedirect: AppUserProfileContext['role'] = 'customer'; // Default role

      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data() as AppUserProfileContext;
          console.log("LoginPage: Firestore profile found for UID", user.uid, ":", userData);
          roleForRedirect = userData.role || 'customer'; 
        } else {
          console.warn("LoginPage: No profile document found in Firestore for UID:", user.uid, ". Creating a basic customer profile.");
          // This case should be rare if signup flows always create a profile.
          // If user exists in Auth but not Firestore, default to customer and create basic profile.
          roleForRedirect = 'customer';
          const basicCustomerProfile: CustomerProfile = {
              id: user.uid, email: user.email!, name: user.displayName || data.email.split('@')[0] || "New User",
              role: 'customer', accountStatus: 'active',
              createdAt: serverTimestamp() as Timestamp, updatedAt: serverTimestamp() as Timestamp,
              profilePictureUrl: user.photoURL || '',
            };
          try {
            await setDoc(userDocRef, basicCustomerProfile);
            console.log("LoginPage: Created basic customer profile in Firestore for UID:", user.uid);
          } catch (profileCreationError) {
            console.error("LoginPage: Failed to create basic customer profile:", profileCreationError);
          }
        }
      }
      
      console.log("LoginPage: Determined role for initial redirect:", roleForRedirect, "for UID:", user?.uid);
      const redirectPathFromQuery = searchParams.get('redirect');

      if (redirectPathFromQuery) {
        router.push(redirectPathFromQuery);
      } else if (roleForRedirect === 'admin') {
        router.push('/admin');
      } else if (roleForRedirect === 'chef') {
        router.push('/chef/dashboard');
      } else { // Default to customer dashboard
        router.push('/customer/dashboard');
      }

    } catch (error: any) {
      console.error('LoginPage: Login error:', error);
      let errorMessage = 'Failed to login. Please check your credentials.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many login attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-api-key') {
        errorMessage = 'Configuration error: Invalid API Key. Please contact support or check environment variables.';
      } else if (error.code) {
        errorMessage = `Login error: ${error.message} (Code: ${error.code})`;
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

  const handlePasswordReset = async () => {
    const email = form.getValues('email');
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address to reset your password.',
        variant: 'destructive',
      });
      form.setError('email', { type: 'manual', message: 'Email is required for password reset.' });
      return;
    }
    if (!z.string().email().safeParse(email).success) {
        toast({
            title: 'Invalid Email',
            description: 'Please enter a valid email address.',
            variant: 'destructive',
        });
        form.setError('email', { type: 'manual', message: 'Please enter a valid email address.' });
        return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Password Reset Email Sent',
        description: 'If an account exists for this email, a password reset link has been sent. Please check your inbox.',
      });
    } catch (error: any) {
      console.error('LoginPage: Password reset error:', error);
      toast({
        title: 'Password Reset Failed',
        description: error.message || 'Could not send password reset email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
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
                      <Input type="email" placeholder="you@example.com" {...field} />
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
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><LogIn className="mr-2 h-5 w-5" /> Login</>}
              </Button>
            </form>
          </Form>
          <div className="mt-6 space-y-3 text-center text-sm">
            <p>
              <Button variant="link" onClick={handlePasswordReset} className="p-0 h-auto font-medium text-primary hover:underline" disabled={isLoading}>
                Forgot Password?
              </Button>
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
    </Suspense>
  );
}
