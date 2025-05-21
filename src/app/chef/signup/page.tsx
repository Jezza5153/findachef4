
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
import { ResumeUploadForm } from '@/components/resume'; // Corrected import path
import { useState, type ChangeEvent } from 'react';
import type { ParseResumeOutput, ChefProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ChefHat, UserPlus, UploadCloud, ShieldCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile as updateAuthProfile } from 'firebase/auth';
import { auth, storage, db } from '@/lib/firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

const chefSignupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  confirmPassword: z.string(),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  abn: z.string().min(1, {message: 'ABN is required.'}),
  bio: z.string().min(20, {message: 'Bio must be at least 20 characters.'}).max(500, {message: "Bio cannot exceed 500 characters."}),
  specialties: z.string().min(1, { message: 'Please list at least one specialty.' }),
  profilePictureFile: z.instanceof(File).optional()
    .refine(file => !file || file.size <= 2 * 1024 * 1024, `Max file size is 2MB.`) // Adjusted to 2MB as per Chef Profile
    .refine(file => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), `Only JPG, PNG, WEBP files are allowed.`),
  agreedToTerms: z.boolean().refine(value => value === true, {
    message: 'You must agree to the terms and policies to continue.',
  }),
  // Added education from resume parsing to be part of form data if needed, though not directly edited here
  education: z.string().optional(), 
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ChefSignupFormValues = z.infer<typeof chefSignupSchema>;

export default function ChefSignupPage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeParsedData, setResumeParsedData] = useState<ParseResumeOutput | null>(null);
  const [isResumeUploadedAndParsed, setIsResumeUploadedAndParsed] = useState(false);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ChefSignupFormValues>({
    resolver: zodResolver(chefSignupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      abn: '',
      bio: '',
      specialties: '',
      agreedToTerms: false,
      profilePictureFile: undefined,
      education: '',
    },
  });

  const handleResumeParsed = (data: { parsedData: ParseResumeOutput; file: File }) => {
    console.log("ChefSignup: Resume parsed, data received:", data.parsedData);
    setResumeParsedData(data.parsedData);
    setResumeFile(data.file);
    setIsResumeUploadedAndParsed(true);
    if (data.parsedData.experience && form.getValues('bio') === '') {
        form.setValue('bio', data.parsedData.experience.substring(0,500), { shouldValidate: true });
    }
    if (data.parsedData.skills && data.parsedData.skills.length > 0 && form.getValues('specialties') === '') {
        form.setValue('specialties', data.parsedData.skills.join(', '), { shouldValidate: true });
    }
    if (data.parsedData.education && form.getValues('education') === '') { // Populate education
      form.setValue('education', data.parsedData.education, { shouldValidate: true });
    }
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('profilePictureFile', file, { shouldValidate: true });
      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue('profilePictureFile', undefined);
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
    }
  };

  const onSubmit = async (formData: ChefSignupFormValues) => {
    if (!isResumeUploadedAndParsed || !resumeParsedData || !resumeFile) {
      toast({
        title: 'Resume Required',
        description: 'Please upload and parse your resume before submitting.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    console.log("ChefSignup: Starting signup process for email:", formData.email);

    try {
      console.log("ChefSignup: Attempting to create Firebase Auth user...");
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      console.log("ChefSignup: Firebase Auth user created successfully. UID:", user.uid);

      let profilePictureUrlToSave = '';
      let resumeFileUrlToSave = '';

      if (profilePictureFile) {
        console.log("ChefSignup: Uploading profile picture. Current auth UID:", auth.currentUser?.uid);
        const fileExt = profilePictureFile.name.split('.').pop() || 'jpg';
        const profilePicPath = `users/${user.uid}/profilePicture.${fileExt}`;
        console.log("ChefSignup: Uploading profile picture to Storage Path:", profilePicPath);
        const profilePicStorageRefInstance = storageRef(storage, profilePicPath);
        try {
            const uploadTaskSnapshot = await uploadBytesResumable(profilePicStorageRefInstance, profilePictureFile);
            profilePictureUrlToSave = await getDownloadURL(uploadTaskSnapshot.ref);
            console.log("ChefSignup: Profile picture uploaded successfully:", profilePictureUrlToSave);
        } catch (storageError: any) {
            console.error("ChefSignup: Profile picture upload error:", storageError);
            toast({ title: "Profile Picture Upload Failed", description: storageError.message || "Could not upload profile picture.", variant: "destructive" });
            // Continue signup even if profile picture fails for now
        }
      }

      console.log("ChefSignup: Uploading resume file...");
      const resumeFileExtension = resumeFile.name.split('.').pop()?.toLowerCase() || 'pdf';
      const resumeStoragePath = `users/${user.uid}/resume.${resumeFileExtension}`;
      console.log("ChefSignup: Uploading resume to Storage Path:", resumeStoragePath);
      const resumeStorageRefInstance = storageRef(storage, resumeStoragePath);
      try {
        const resumeUploadTask = await uploadBytesResumable(resumeStorageRefInstance, resumeFile);
        resumeFileUrlToSave = await getDownloadURL(resumeUploadTask.ref);
        console.log("ChefSignup: Resume file uploaded successfully:", resumeFileUrlToSave);
      } catch (storageError: any) {
        console.error("ChefSignup: Resume file upload error:", storageError);
        toast({ title: "Resume Upload Failed", description: storageError.message || "Could not upload resume.", variant: "destructive" });
        // Consider if resume upload failure should halt the entire signup. For now, it will.
        throw storageError; 
      }

      console.log("ChefSignup: Updating Firebase Auth profile...");
      try {
        await updateAuthProfile(user, {
          displayName: formData.name, 
          photoURL: profilePictureUrlToSave || null 
        });
        console.log("ChefSignup: Firebase Auth profile updated.");
      } catch (authProfileError) {
        console.warn("ChefSignup: Error updating Firebase Auth profile (non-critical):", authProfileError);
      }

      const userProfileData: ChefProfile = {
        id: user.uid,
        email: user.email!,
        name: formData.name,
        abn: formData.abn,
        bio: formData.bio,
        specialties: formData.specialties.split(',').map(s => s.trim()).filter(s => s),
        experienceSummary: resumeParsedData.experience || "",
        skills: resumeParsedData.skills || [],
        education: resumeParsedData.education || "", // Save parsed education
        profilePictureUrl: profilePictureUrlToSave || '',
        resumeFileUrl: resumeFileUrlToSave || '',
        role: 'chef', // Explicitly set role
        accountStatus: 'active',
        isApproved: false,
        isSubscribed: false,
        trustScore: 3.0,
        trustScoreBasis: "New chef - awaiting activity",
        hasCompletedFirstCoOp: false,
        collaboratorIds: [],
        outgoingCollaborationRequests: [],
        incomingCollaborationRequests: [],
        stripeAccountId: '',
        stripeOnboardingComplete: false,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      };
      
      console.log("ChefSignup: Saving chef profile to Firestore with role:", userProfileData.role);
      try {
        await setDoc(doc(db, "users", user.uid), userProfileData);
        console.log("ChefSignup: Firestore document created successfully for user:", user.uid);
      } catch (firestoreError: any) {
        console.error("ChefSignup: Error saving profile to Firestore:", firestoreError);
        let firestoreErrorMessage = "Could not save profile data to database.";
        if (firestoreError.code === 'permission-denied') {
            firestoreErrorMessage = "Database permission denied. Check Firestore security rules for creating user profiles.";
        }
        toast({ title: "Profile Save Failed", description: firestoreErrorMessage, variant: "destructive", duration: 7000 });
        // If Firestore save fails, the user account in Auth still exists. This might need manual cleanup or a more complex rollback.
        throw firestoreError;
      }

      toast({
        title: 'Signup Successful!',
        description: 'Your chef account has been created. Admin approval is required for full access. You will be redirected to login.',
        duration: 8000,
      });

      form.reset();
      setResumeParsedData(null);
      setResumeFile(null);
      setIsResumeUploadedAndParsed(false);
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
      router.push('/login?email=' + formData.email); // Redirect to login, prefill email

    } catch (error: any) {
      console.error('ChefSignup: Overall signup error:', error);
      let errorMessage = 'Failed to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use. Please log in or use a different email.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak. Please choose a stronger password.';
      } else if (error.message && (error.message.includes("permission denied") || error.code === 'permission-denied')) {
        errorMessage = "Database operation failed due to permissions. Please check security rules.";
      } else if (error.code && error.message) { // More generic Firebase error
        errorMessage = `An error occurred: ${error.message} (Code: ${error.code})`;
      } else if (error.message) { // Non-Firebase error
        errorMessage = error.message;
      }
      toast({
        title: 'Signup Failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 7000
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary" data-ai-hint="chef hat logo">
            <ChefHat className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-bold">Become a Chef on FindAChef</CardTitle>
          <CardDescription className="text-lg">
            Join our platform to showcase your skills, manage bookings, and connect with clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <ResumeUploadForm 
            onResumeParsed={handleResumeParsed} 
            initialData={resumeParsedData ?? undefined} 
          />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <h3 className="text-xl font-semibold border-b pb-2">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Julia Child" {...field} />
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
                  name="abn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ABN (Australian Business Number)</FormLabel>
                      <FormControl>
                        <Input placeholder="Your ABN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <h3 className="text-xl font-semibold border-b pb-2 pt-4">Profile Details</h3>
              <FormField
                  control={form.control}
                  name="profilePictureFile" 
                  render={() => ( 
                    <FormItem>
                      <FormLabel>Profile Picture</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-4">
                          {profilePicturePreview ? (
                            <Image src={profilePicturePreview} alt="Profile preview" width={80} height={80} className="rounded-full object-cover" data-ai-hint="person avatar" />
                          ) : (
                            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground" data-ai-hint="avatar placeholder">
                              <UserPlus className="h-10 w-10" />
                            </div>
                          )}
                          <Input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleProfilePictureChange}
                            className="hidden"
                            id="profilePictureUpload"
                          />
                          <Button type="button" variant="outline" asChild>
                            <label htmlFor="profilePictureUpload" className="cursor-pointer">
                              <UploadCloud className="mr-2 h-4 w-4" /> Upload Photo
                            </label>
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>Upload a professional headshot (JPG, PNG, WEBP, max 2MB).</FormDescription>
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
                      <Textarea
                        placeholder="Tell us about your culinary passion, experience, and what makes your cooking unique."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                     <FormDescription>Max 500 characters. This will be shown on your public profile.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specialties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialties / Cuisine Types (Tags)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Italian, Pastry, Plant-based, Foraging" {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated list of your culinary specialties or tags.</FormDescription>
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
                        I agree to the FindAChef <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link>, <Link href="/chef-policies" className="underline hover:text-primary">Chef Program Policies</Link>, and acknowledge the <Link href="/privacy-policy" className="underline hover:text-primary">Privacy Policy</Link>. This includes keeping all communications and payments on the platform.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full text-lg py-3" size="lg" disabled={!isResumeUploadedAndParsed || isLoading || form.formState.isSubmitting}>
                {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><UserPlus className="mr-2 h-5 w-5" /> Create Chef Account</>}
              </Button>
              {!isResumeUploadedAndParsed && (
                <p className="text-sm text-destructive text-center">Please upload and parse your resume above to enable account creation.</p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
