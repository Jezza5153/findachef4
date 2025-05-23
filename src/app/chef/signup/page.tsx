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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResumeUploadForm } from '@/components/resume-upload-form';
import { useState } from 'react';
import type { ChefProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ChefHat, UserPlus, ShieldCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile as updateAuthProfile, signOut } from 'firebase/auth';
import { auth, storage, db } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Form validation schema
const chefSignupSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email(),
  password: z.string().min(6, 'Password at least 6 chars'),
  bio: z.string().min(10, 'Short bio required'),
  terms: z.boolean().refine(val => val, { message: 'You must accept the terms' }),
});

type ChefSignupInput = z.infer<typeof chefSignupSchema>;

export default function ChefSignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ChefSignupInput>({
    resolver: zodResolver(chefSignupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      bio: '',
      terms: false,
    },
  });

  // Resume upload handler
  const handleResumeUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileRef = storageRef(storage, `resumes/${file.name}-${Date.now()}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          null,
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setResumeUrl(url);
            setUploading(false);
            resolve();
          }
        );
      });
      setResumeFile(file);
      toast({ title: 'Resume uploaded!', variant: 'success' });
    } catch (err) {
      setUploading(false);
      toast({ title: 'Resume upload failed', description: String(err), variant: 'destructive' });
    }
  };

  // Signup submit
  const onSubmit = async (data: ChefSignupInput) => {
    if (!resumeFile || !resumeUrl) {
      toast({ title: 'Resume required', description: 'Please upload your resume first.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      // Create Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);

      // Update display name
      await updateAuthProfile(cred.user, {
        displayName: data.name,
      });

      // Create Firestore chef profile with verified: false
      const chefDoc: ChefProfile = {
        uid: cred.user.uid,
        name: data.name,
        email: data.email,
        bio: data.bio,
        resume: resumeUrl,
        createdAt: serverTimestamp(),
        verified: false,
        tags: [],
      };
      await setDoc(doc(db, 'chefs', cred.user.uid), chefDoc);

      // Force sign out (so user can't access dashboard before approval)
      await signOut(auth);

      setSubmitted(true); // Show thank-you screen
    } catch (err: any) {
      toast({
        title: 'Signup failed',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-background px-2">
        <Card className="max-w-lg w-full mx-auto my-12 p-8 flex flex-col items-center text-center">
          <ShieldCheck className="h-14 w-14 text-primary mb-3" />
          <CardTitle className="text-2xl mb-2">Thank you for your application!</CardTitle>
          <CardDescription>
            Our admin team is reviewing your submission.<br />
            <span className="block mt-2">You’ll be notified by email once your account is approved and you can log in.</span>
          </CardDescription>
          <Link href="/" className="mt-8 underline text-primary text-sm">Return to homepage</Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-background px-2">
      <Card className="max-w-xl w-full mx-auto my-12 p-6">
        <CardHeader className="flex flex-col items-center">
          <ChefHat className="h-12 w-12 text-primary mb-2" />
          <CardTitle className="text-2xl">Sign Up as a Chef</CardTitle>
          <CardDescription>Join the platform and get discovered for private or public events!</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
              autoComplete="off"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email address" {...field} />
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
                      <Input type="password" placeholder="Password" {...field} />
                    </FormControl>
                    <FormDescription>Minimum 6 characters</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Bio</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Tell us about your chef style..." {...field} />
                    </FormControl>
                    <FormDescription>Describe your cooking style and background.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Resume Upload */}
              <div>
                <FormLabel>Resume (PDF, required)</FormLabel>
                <ResumeUploadForm
                  value={resumeUrl}
                  onFileSelect={handleResumeUpload}
                  uploading={uploading}
                  previewUrl={resumeUrl}
                />
                {!resumeUrl && (
                  <FormDescription>
                    You must upload your chef resume to sign up.
                  </FormDescription>
                )}
              </div>

              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="terms"
                      />
                    </FormControl>
                    <FormLabel htmlFor="terms" className="inline ml-2">
                      I agree to the <Link href="/terms" target="_blank" className="underline">terms &amp; conditions</Link>
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full mt-2"
                disabled={uploading || form.formState.isSubmitting}
              >
                {uploading || form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" />
                    Submit Application
                  </>
                )}
              </Button>
              <p className="text-center mt-3 text-muted-foreground text-sm">
                Already have an account?{' '}
                <Link href="/login" className="underline text-primary">
                  Login here
                </Link>
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
