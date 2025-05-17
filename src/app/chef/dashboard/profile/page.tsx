
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ResumeUploadForm } from '@/components/resume-upload-form';
import { useState, useEffect } from 'react';
import type { ParseResumeOutput, ChefProfile as ChefProfileType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { UserCircle, Save, Edit3, Briefcase, Lightbulb, UploadCloud, GraduationCap, Images, Download, Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile as updateAuthProfile } from 'firebase/auth';

// Mock current chef data - will be replaced by fetched data
const initialChefData: ChefProfileType = {
  id: '', // Will be set from auth user
  name: '',
  email: '',
  tagline: '',
  bio: '',
  specialties: [],
  profilePictureUrl: '',
  experienceSummary: "",
  education: "",
  skills: [],
  portfolioItem1Url: '',
  portfolioItem1Caption: '',
  portfolioItem2Url: '',
  portfolioItem2Caption: '',
  resumeFileUrl: '',
};

const chefProfileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  tagline: z.string().max(100, "Tagline cannot exceed 100 characters.").optional(),
  bio: z.string().min(20, {message: 'Bio must be at least 20 characters.'}).max(500, {message: "Bio cannot exceed 500 characters."}),
  specialties: z.string().min(1, { message: 'Please list at least one specialty.' }), // Comma-separated
  profilePictureFile: z.instanceof(File).optional() // For new file upload
    .refine(file => !file || file.size <= 2 * 1024 * 1024, `Max file size is 2MB.`)
    .refine(file => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), `Only JPG, PNG, WEBP files are allowed.`),
  experienceSummary: z.string().optional(),
  education: z.string().max(2000, "Education summary cannot exceed 2000 characters.").optional(),
  skills: z.string().optional(), // Comma-separated skills
  portfolioItem1Url: z.string().url({ message: "Invalid URL for portfolio item 1." }).optional().or(z.literal('')),
  portfolioItem1Caption: z.string().max(150, "Caption for item 1 cannot exceed 150 characters.").optional(),
  portfolioItem2Url: z.string().url({ message: "Invalid URL for portfolio item 2." }).optional().or(z.literal('')),
  portfolioItem2Caption: z.string().max(150, "Caption for item 2 cannot exceed 150 characters.").optional(),
  // resumeFileUrl is managed via file upload, not a direct form field for URL input
});

type ChefProfileFormValues = z.infer<typeof chefProfileSchema>;

export default function ChefProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [chefData, setChefData] = useState<ChefProfileType>(initialChefData);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [newProfilePictureFile, setNewProfilePictureFile] = useState<File | null>(null);
  const [newResumeFile, setNewResumeFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<ChefProfileFormValues>({
    resolver: zodResolver(chefProfileSchema),
    defaultValues: initialChefData,
  });

  useEffect(() => {
    const fetchChefProfile = async () => {
      if (user) {
        setIsLoading(true);
        const userDocRef = doc(db, "users", user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as ChefProfileType;
            setChefData(data);
            form.reset({
              name: data.name || '',
              email: data.email || user.email || '',
              tagline: data.tagline || '',
              bio: data.bio || '',
              specialties: data.specialties?.join(', ') || '',
              experienceSummary: data.experienceSummary || '',
              education: data.education || '',
              skills: data.skills?.join(', ') || '',
              portfolioItem1Url: data.portfolioItem1Url || '',
              portfolioItem1Caption: data.portfolioItem1Caption || '',
              portfolioItem2Url: data.portfolioItem2Url || '',
              portfolioItem2Caption: data.portfolioItem2Caption || '',
            });
            setProfilePicturePreview(data.profilePictureUrl || user.photoURL || null);
          } else {
            // Profile doesn't exist, initialize form with auth data if available
            form.reset({
              name: user.displayName || '',
              email: user.email || '',
            });
            setProfilePicturePreview(user.photoURL || null);
            toast({ title: "Welcome!", description: "Please complete your chef profile.", variant: "default" });
          }
        } catch (error) {
          console.error("Error fetching chef profile:", error);
          toast({ title: "Error", description: "Could not load your profile.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (!authLoading && user) {
      fetchChefProfile();
    } else if (!authLoading && !user) {
      // Should be handled by layout redirect, but good to be safe
      setIsLoading(false);
    }
  }, [user, authLoading, form, toast]);


  const handleResumeProcessed = (data: { parsedData: ParseResumeOutput; file: File }) => {
    form.setValue('experienceSummary', data.parsedData.experience || '', { shouldValidate: true });
    form.setValue('skills', data.parsedData.skills?.join(', ') || '', { shouldValidate: true });
    if (data.parsedData.education) {
      form.setValue('education', data.parsedData.education, { shouldValidate: true });
    }
    setNewResumeFile(data.file); // Stage the new resume file for upload
    toast({
        title: "Resume Processed",
        description: "Resume details populated. Save profile to upload the new file."
    });
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('profilePictureFile', file, {shouldValidate: true}); // Validate file
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setNewProfilePictureFile(file);
    }
  };

  const onSubmit = async (data: ChefProfileFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    let profilePicUrl = chefData.profilePictureUrl || user.photoURL; // Keep existing if no new one
    let resumeUrl = chefData.resumeFileUrl; // Keep existing if no new one

    try {
      // 1. Upload new profile picture if one is staged
      if (newProfilePictureFile) {
        const fileExtension = newProfilePictureFile.name.split('.').pop();
        const profilePicRef = storageRef(storage, `users/${user.uid}/profilePicture.${fileExtension}`);
        const uploadTask = uploadBytesResumable(profilePicRef, newProfilePictureFile);
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => { /* Optional: handle progress */ },
            (error) => { console.error("Profile pic upload error", error); reject(error); },
            async () => {
              profilePicUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      // 2. Upload new resume file if one is staged
      if (newResumeFile) {
        // Assuming PDF, can add more robust extension handling
        const resumeRef = storageRef(storage, `users/${user.uid}/resume.pdf`); 
        const resumeUploadTask = uploadBytesResumable(resumeRef, newResumeFile);

        await new Promise<void>((resolve, reject) => {
          resumeUploadTask.on('state_changed',
            (snapshot) => { /* Optional: handle progress */ },
            (error) => { console.error("Resume upload error", error); reject(error); },
            async () => {
              resumeUrl = await getDownloadURL(resumeUploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      // 3. Prepare data for Firestore
      const updatedProfileData: Partial<ChefProfileType> = {
        name: data.name,
        // email: data.email, // Email usually shouldn't be changed directly here
        tagline: data.tagline,
        bio: data.bio,
        specialties: data.specialties.split(',').map(s => s.trim()).filter(s => s),
        profilePictureUrl: profilePicUrl,
        experienceSummary: data.experienceSummary,
        education: data.education,
        skills: data.skills?.split(',').map(s => s.trim()).filter(s => s) || [],
        portfolioItem1Url: data.portfolioItem1Url,
        portfolioItem1Caption: data.portfolioItem1Caption,
        portfolioItem2Url: data.portfolioItem2Url,
        portfolioItem2Caption: data.portfolioItem2Caption,
        resumeFileUrl: resumeUrl,
        id: user.uid, // Ensure ID is present
        email: user.email || data.email, // Ensure email is present
      };

      // 4. Save profile to Firestore
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, updatedProfileData, { merge: true }); // Use setDoc with merge to create or update

      // 5. Update Firebase Auth user profile (displayName, photoURL)
      if (user.displayName !== data.name || (profilePicUrl && user.photoURL !== profilePicUrl)) {
        await updateAuthProfile(user, {
          displayName: data.name,
          photoURL: profilePicUrl,
        });
      }
      
      // 6. Update local state and form
      setChefData(prev => ({ ...prev, ...updatedProfileData } as ChefProfileType));
      setNewProfilePictureFile(null); // Clear staged file
      setNewResumeFile(null); // Clear staged file
      // form.reset(updatedProfileData); // Reset form with new values, might be redundant if setChefData triggers re-render

      toast({
        title: 'Profile Updated Successfully',
        description: 'Your chef profile has been saved.',
      });

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not save your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    toast({
      title: 'Account Deletion Request Submitted',
      description: 'Your request to delete your account has been received and will be processed according to our data retention policy.',
      duration: 7000,
    });
  };

  if (isLoading || authLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Loading Profile...</div>;
  }
  if (!user) {
     return <div className="flex h-screen items-center justify-center">Please log in to view your profile.</div>;
  }

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center"><UserCircle className="mr-3 h-7 w-7 text-primary" data-ai-hint="user profile" /> Your Chef Profile</CardTitle>
          <CardDescription>Manage your public-facing profile information, portfolio, and resume.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-1 flex flex-col items-center">
                  <Image
                    src={profilePicturePreview || "https://placehold.co/150x150.png"}
                    alt={form.getValues('name') || "Chef"}
                    width={150}
                    height={150}
                    className="rounded-full object-cover shadow-md mb-4"
                    data-ai-hint="chef portrait"
                    key={profilePicturePreview} // Force re-render if URL changes
                  />
                   <FormField
                      control={form.control}
                      name="profilePictureFile" // Control the file input
                      render={() => ( // field prop not directly used for input type file custom handler
                        <FormItem className="w-full">
                          <FormControl>
                            <>
                              <Input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleProfilePictureChange}
                                className="hidden"
                                id="profilePictureUpdate"
                                disabled={isSaving}
                              />
                              <Button type="button" variant="outline" asChild className="w-full" disabled={isSaving}>
                                <label htmlFor="profilePictureUpdate" className="cursor-pointer flex items-center justify-center">
                                  <UploadCloud className="mr-2 h-4 w-4" /> Change Photo
                                </label>
                              </Button>
                            </>
                          </FormControl>
                          <FormMessage className="text-center"/>
                        </FormItem>
                      )}
                    />
                </div>
                <div className="md:col-span-2 space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Julia Child" {...field} disabled={isSaving} />
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
                          <Input type="email" placeholder="you@example.com" {...field} readOnly disabled 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tagline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tagline / Professional Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Master of French Cuisine, Private Chef" {...field} disabled={isSaving} />
                        </FormControl>
                        <FormDescription>A short, catchy title for your profile.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about your culinary passion..."
                        className="min-h-[100px]"
                        {...field}
                        disabled={isSaving}
                      />
                    </FormControl>
                    <FormDescription>This will be shown on your public profile. Max 500 characters.</FormDescription>
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
                      <Input placeholder="e.g., Italian, French, Pastry" {...field} disabled={isSaving} />
                    </FormControl>
                    <FormDescription>Comma-separated list of your culinary specialties.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-3 flex items-center"><GraduationCap className="mr-2 h-5 w-5 text-primary" data-ai-hint="education cap" /> Education</h3>
                 <FormField
                    control={form.control}
                    name="education"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Your education summary will appear here (from resume or manual input)..."
                            className="min-h-[80px] bg-muted/30"
                            {...field}
                            disabled={isSaving}
                          />
                        </FormControl>
                        <FormDescription>This field can be auto-filled by resume parsing or edited manually.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-3 flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary" data-ai-hint="work briefcase" /> Experience Summary</h3>
                 <FormField
                    control={form.control}
                    name="experienceSummary"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Your professional experience summary will appear here after resume parsing..."
                            className="min-h-[120px] bg-muted/30"
                            {...field}
                            disabled={isSaving}
                          />
                        </FormControl>
                        <FormDescription>This field can be auto-filled by resume parsing or edited manually.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-3 flex items-center"><Lightbulb className="mr-2 h-5 w-5 text-primary" data-ai-hint="idea lightbulb" /> Skills</h3>
                 <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                           <Input
                            placeholder="Your skills will appear here, comma-separated..."
                            className="bg-muted/30"
                            {...field}
                            disabled={isSaving}
                           />
                        </FormControl>
                        <FormDescription>This field can be auto-filled by resume parsing or edited manually. Comma-separated.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              
              <div className="pt-4 border-t">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto mb-4"
                    onClick={() => {
                        if (chefData.resumeFileUrl) {
                        window.open(chefData.resumeFileUrl, '_blank');
                        } else {
                        toast({ title: "Resume Not Available", description: "No resume file URL is currently set for download.", variant: "destructive" });
                        }
                    }}
                    disabled={!chefData.resumeFileUrl || isSaving}
                    >
                    <Download className="mr-2 h-4 w-4" /> Download Current Resume
                </Button>
                <ResumeUploadForm
                    onResumeParsed={handleResumeProcessed}
                    // initialData is for display within the form, not used to prefill parent form
                />
              </div>


              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-4 flex items-center"><Images className="mr-2 h-5 w-5 text-primary" data-ai-hint="gallery images" /> Portfolio (Max 2 items)</h3>
                <div className="space-y-6">
                  {[1, 2].map(itemNum => (
                    <div key={itemNum} className="p-4 border rounded-md shadow-sm bg-muted/20 space-y-4">
                      <h4 className="font-medium text-md">Portfolio Item {itemNum}</h4>
                      <FormField
                        control={form.control}
                        name={`portfolioItem${itemNum}Url` as 'portfolioItem1Url' | 'portfolioItem2Url'}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Image URL</FormLabel>
                            <FormControl><Input placeholder="https://example.com/your-dish.jpg" {...field} disabled={isSaving} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {form.watch(`portfolioItem${itemNum}Url` as 'portfolioItem1Url' | 'portfolioItem2Url') && (
                        <Image
                            src={form.watch(`portfolioItem${itemNum}Url` as 'portfolioItem1Url' | 'portfolioItem2Url') || "https://placehold.co/300x200.png?text=Preview"}
                            alt={`Portfolio Item ${itemNum} Preview`}
                            width={300}
                            height={200}
                            className="rounded-md object-cover border shadow-sm"
                            data-ai-hint="food photography"
                            onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/300x200.png?text=Invalid+URL";}}
                        />
                      )}
                      <FormField
                        control={form.control}
                        name={`portfolioItem${itemNum}Caption` as 'portfolioItem1Caption' | 'portfolioItem2Caption'}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Caption (Optional)</FormLabel>
                            <FormControl><Input placeholder="e.g., My Signature Dish" {...field} disabled={isSaving} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-center">
                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  {isSaving ? 'Saving...' : 'Save Profile Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
         <CardFooter className="border-t pt-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto" disabled={isSaving}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete My Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                  You will receive an email confirmation once the process is complete, as per our data retention policy.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount}>
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
