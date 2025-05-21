
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
    .refine(file => !file || file.size <= 2 * 1024 * 1024, `Max file size is 2MB.`)
    .refine(file => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), `Only JPG, PNG, WEBP files are allowed.`),
  agreedToTerms: z.boolean().refine(value => value === true, {
    message: 'You must agree to the terms and policies to continue.',
  }),
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
    if (data.parsedData.education && form.getValues('education') === '') {
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
    console.log("ChefSignup: Form submitted with data:", formData);
    if (!isResumeUploadedAndParsed || !resumeParsedData || !resumeFile) {
      toast({
        title: 'Resume Required',
        description: 'Please upload and parse your resume before submitting.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    console.log("ChefSignup: Step 0 - Starting signup process for email:", formData.email);

    let userCredential;
    try {
      console.log("ChefSignup: Step 1 - Attempting Firebase Auth user creation...");
      userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      console.log("ChefSignup: Step 1 successful - Firebase Auth user created. UID:", user.uid);

      let profilePictureUrlToSave = '';
      let resumeFileUrlToSave = '';

      // Step 2: Upload profile picture if one is staged
      if (profilePictureFile) {
        console.log("ChefSignup: Before profile picture upload, checking auth state:");
        console.log("ChefSignup: auth.currentUser:", auth.currentUser);
        try {
          console.log("ChefSignup: Step 2 - Attempting profile picture upload for UID:", user.uid);
          const fileExt = profilePictureFile.name.split('.').pop() || 'jpg';
          const profilePicPath = `users/${user.uid}/profilePicture.${fileExt}`;
          console.log("ChefSignup: Uploading profile picture to Storage Path:", profilePicPath);
          const profilePicStorageRefInstance = storageRef(storage, profilePicPath);
          const uploadTaskSnapshot = await uploadBytesResumable(profilePicStorageRefInstance, profilePictureFile);
          profilePictureUrlToSave = await getDownloadURL(uploadTaskSnapshot.ref);
          console.log("ChefSignup: Step 2 successful - Profile picture uploaded:", profilePictureUrlToSave);
        } catch (storageError: any) {
          console.error("ChefSignup: Error at Step 2 - Profile picture upload failed for UID:", user.uid, storageError);
          toast({ title: "Profile Picture Upload Failed", description: storageError.message || "Could not upload profile picture.", variant: "destructive" });
          // Decide if this is a critical failure or if signup can continue without profile pic
          // For now, let's allow continuing but log the error. The URL will be empty.
        }
      } else {
        console.log("ChefSignup: Step 2 - No profile picture provided, skipping upload.");
      }

      // Step 3: Upload resume file
      if (resumeFile) {
        console.log("ChefSignup: Before resume file upload, checking auth state:");
        console.log("ChefSignup: auth.currentUser:", auth.currentUser);
        try {
          console.log("ChefSignup: Step 3 - Attempting resume file upload for UID:", user.uid);
          const resumeFileExtension = resumeFile.name.split('.').pop()?.toLowerCase() || 'pdf';
          const resumeStoragePath = `users/${user.uid}/resume.${resumeFileExtension}`;
          console.log("ChefSignup: Uploading resume to Storage Path:", resumeStoragePath);
          const resumeStorageRefInstance = storageRef(storage, resumeStoragePath);
          const resumeUploadTask = await uploadBytesResumable(resumeStorageRefInstance, resumeFile);
          resumeFileUrlToSave = await getDownloadURL(resumeUploadTask.ref);
          console.log("ChefSignup: Step 3 successful - Resume file uploaded:", resumeFileUrlToSave);
        } catch (storageError: any) {
          console.error("ChefSignup: Error at Step 3 - Resume file upload failed for UID:", user.uid, storageError);
          toast({ title: "Resume Upload Failed", description: storageError.message || "Could not upload resume.", variant: "destructive" });
          setIsLoading(false); // Critical failure if resume upload fails
          return; 
        }
      } else {
        // This case should not happen due to the check at the beginning of onSubmit
        console.error("ChefSignup: Error at Step 3 - Resume file is missing, though it was required.");
        toast({ title: "Internal Error", description: "Resume file was missing during processing.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // Step 4: Update Firebase Auth user profile (displayName, photoURL)
      try {
        console.log("ChefSignup: Step 4 - Attempting to update Firebase Auth profile (displayName, photoURL) for UID:", user.uid);
        await updateAuthProfile(user, {
          displayName: formData.name, 
          photoURL: profilePictureUrlToSave || null 
        });
        console.log("ChefSignup: Step 4 successful - Firebase Auth profile updated.");
      } catch (authProfileError: any) {
        console.warn("ChefSignup: Warning at Step 4 - Error updating Firebase Auth profile (non-critical for signup completion) for UID:", user.uid, authProfileError);
        // Non-critical, so we don't necessarily stop the whole process.
      }

      // Step 5: Prepare and save chef profile to Firestore
      console.log("ChefSignup: Step 5 - Preparing Firestore user profile data for UID:", user.uid);
      const userProfileData: ChefProfile = {
        id: user.uid,
        email: user.email!,
        name: formData.name,
        abn: formData.abn,
        bio: formData.bio,
        specialties: formData.specialties.split(',').map(s => s.trim()).filter(s => s),
        experienceSummary: resumeParsedData?.experience || "", // Use optional chaining for safety
        skills: resumeParsedData?.skills || [],
        education: resumeParsedData?.education || formData.education || "",
        profilePictureUrl: profilePictureUrlToSave || '',
        resumeFileUrl: resumeFileUrlToSave || '',
        role: 'chef', 
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
      console.log("ChefSignup: User profile data to save:", userProfileData);
      console.log("ChefSignup: Saving chef profile to Firestore with role:", userProfileData.role);

      try {
        console.log("ChefSignup: Step 5 - Attempting to save profile to Firestore for UID:", user.uid);
        await setDoc(doc(db, "users", user.uid), userProfileData);
        console.log("ChefSignup: Step 5 successful - Firestore document created successfully for user:", user.uid);
      } catch (firestoreError: any) {
        console.error("ChefSignup: Error at Step 5 - Error saving profile to Firestore for UID:", user.uid, firestoreError);
        let firestoreErrorMessage = "Could not save profile data to database.";
        if (firestoreError.code === 'permission-denied') {
            firestoreErrorMessage = "Database permission denied. Check Firestore security rules for creating user profiles.";
        }
        toast({ title: "Profile Save Failed", description: firestoreErrorMessage, variant: "destructive", duration: 7000 });
        // If Firestore save fails, the user account in Auth still exists. This might need manual cleanup or a more complex rollback.
        setIsLoading(false);
        return; 
      }

      // All steps successful
      console.log("ChefSignup: All steps completed successfully for UID:", user.uid);
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
      router.push('/login?email=' + formData.email);

    } catch (authError: any) { // This catch block is primarily for createUserWithEmailAndPassword error
      console.error('ChefSignup: Error at Step 1 - Firebase Auth user creation failed:', authError);
      let errorMessage = 'Failed to create account. Please try again.';
      if (authError.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use. Please log in or use a different email.';
      } else if (authError.code === 'auth/weak-password') {
        errorMessage = 'The password is too weak. Please choose a stronger password.';
      } else if (authError.message && (authError.message.includes("permission denied") || authError.code === 'permission-denied')) {
        errorMessage = "Database operation failed due to permissions. Please check security rules.";
      } else if (authError.code && authError.message) { 
        errorMessage = `An error occurred: ${authError.message} (Code: ${authError.code})`;
      } else if (authError.message) { 
        errorMessage = authError.message;
      }
      toast({
        title: 'Signup Failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 7000
      });
    } finally {
      setIsLoading(false);
      console.log("ChefSignup: Signup process ended for email:", formData.email);
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
                name="education"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Education (from resume or manual input)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Education details extracted from resume or entered manually."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>This field can be auto-filled by resume parsing. Max 2000 characters.</FormDescription>
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
