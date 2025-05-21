
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, ShieldCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile as updateAuthProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useRouter, redirect } from 'next/navigation';
import { useState } from 'react';
import type { CustomerProfile } from '@/types';

const customerSignupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  confirmPassword: z.string(),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  agreedToTerms: z.boolean().refine(value => value === true, {
    message: 'You must agree to the terms and policies to continue.',
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type CustomerSignupFormValues = z.infer<typeof customerSignupSchema>;

export default function CustomerSignupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CustomerSignupFormValues>({
    resolver: zodResolver(customerSignupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      agreedToTerms: false,
    },
  });

  const onSubmit = async (formData: CustomerSignupFormValues) => {
    setIsLoading(true);
    console.log("CustomerSignup: Starting signup process for email:", formData.email);

    try {
      let user;
      try {
 console.log("CustomerSignup: Attempting to create Firebase Auth user...");
 const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        user = userCredential.user;
 console.log("CustomerSignup: Firebase Auth user created successfully. UID:", user.uid);
      } catch (authError: any) {
 console.error("CustomerSignup: Error creating Firebase Auth user:", authError);
        let authErrorMessage = 'Failed to create authentication account.';
        if (authError.code === 'auth/email-already-in-use') {
 authErrorMessage = 'This email address is already in use. Please log in or use a different email.';
        } else if (authError.code === 'auth/weak-password') {
 authErrorMessage = 'The password is too weak. Please choose a stronger password.';
        } else if (authError.message) {
 authErrorMessage = authError.message;
        }
 toast({ title: "Authentication Failed", description: authErrorMessage, variant: "destructive", duration: 7000 });
        throw authError; // Re-throw the authentication error
      }

      console.log("CustomerSignup: Updating Firebase Auth profile (displayName) for UID:", user.uid);
      try {
        await updateAuthProfile(user, { displayName: formData.name });
        console.log("CustomerSignup: Firebase Auth profile updated.");
      } catch (authProfileError) {
 // Log a warning but don't necessarily fail the entire signup if displayName update fails
        console.warn("CustomerSignup: Error updating Firebase Auth profile (non-critical):", authProfileError);
      }

      const userProfileData: CustomerProfile = {
        id: user.uid,
        email: user.email!,
        name: formData.name,
 role: 'customer', // Explicitly set role to 'customer'
 accountStatus: 'active', // Default account status
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
 profilePictureUrl: user.photoURL || '',
      };

      console.log("CustomerSignup: Attempting to save customer profile to Firestore for UID:", user.uid);
      try {
        await setDoc(doc(db, "users", user.uid), userProfileData);
        console.log("CustomerSignup: Firestore document created successfully for user:", user.uid);
      } catch (firestoreError: any) {
        console.error("CustomerSignup: Error saving profile to Firestore:", firestoreError);
        let firestoreErrorMessage = "Failed to save profile data to database.";
        if (firestoreError.code === 'permission-denied') {
 firestoreErrorMessage = "Database permission denied. Check Firestore security rules for creating user profiles.";
        }
        toast({ title: "Profile Save Failed", description: firestoreErrorMessage, variant: "destructive", duration: 7000 });
        throw firestoreError; // Re-throw
      }
      
      toast({
        title: 'Account Created Successfully!',
        description: 'Welcome to FindAChef! You can now log in.',
        duration: 5000,
      });
      
 router.push('/login');
    } catch (error: any) {
 // This catch block will handle errors from createUserWithEmailAndPassword or setDoc
      console.error('CustomerSignup: Overall signup error for email', formData.email, ':', error);
      let errorMessage = 'Failed to create account. Please try again.';
      if (error.message) { // Catch any specific error message from thrown errors
        errorMessage = error.message;
      }
      toast({
        title: 'Signup Failed',
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
            <UserPlus className="h-8 w-8" data-ai-hint="user add person" />
          </div>
          <CardTitle className="text-3xl font-bold">Create Your Customer Account</CardTitle>
          <CardDescription className="text-lg">
            Join FindAChef to discover amazing culinary experiences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Alex Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      <Input type="password" placeholder="•••••••• (min. 8 characters)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="agreedToTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center">
                        <ShieldCheck className="mr-2 h-4 w-4 text-muted-foreground" />
                        Agreement & Policies
                      </FormLabel>
                      <FormDescription>
                        I agree to the FindAChef <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link> and acknowledge the <Link href="/privacy-policy" className="underline hover:text-primary">Privacy Policy</Link>.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-lg py-3" size="lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><UserPlus className="mr-2 h-5 w-5" /> Create Account</>}
              </Button>
            </form>
          </Form>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log In
            </Link>
          </p>
           <p className="text-center text-sm text-muted-foreground">
            Are you a Chef?{' '}
            <Link href="/chef/signup" className="font-medium text-primary hover:underline">
              Sign up here
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

    