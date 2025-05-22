
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
import { Input } from '@/components/ui/input'; // Changed Mixer to Blender
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ResumeUploadForm } from '@/components/resume-upload-form';
import { useState, useEffect } from 'react';
import type { ParseResumeOutput, ChefProfile as ChefProfileType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { UserCircle, Save, Edit3, Briefcase, Lightbulb, UploadCloud, GraduationCap, Images, Download, Trash2, Loader2, Users } from 'lucide-react';
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
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile as updateAuthProfile } from 'firebase/auth';

const chefProfileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }), // Will be read-only
  tagline: z.string().max(100, "Tagline cannot exceed 100 characters.").optional(),
  bio: z.string().min(20, {message: 'Bio must be at least 20 characters.'}).max(500, {message: "Bio cannot exceed 500 characters."}),
  specialties: z.string().min(1, { message: 'Please list at least one specialty.' }),
  profilePictureFile: z.instanceof(File).optional()
    .refine(file => !file || file.size <= 2 * 1024 * 1024, `Max file size is 2MB.`)
    .refine(file => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), `Only JPG, PNG, WEBP files are allowed.`),
  experienceSummary: z.string().max().optional(), // Added optional()
  education: z.string().max(2000, "Education summary cannot exceed 2000 characters.").optional(),
  skills:z.string().max().optional(), // Added optional()
  portfolioItem1Url: z.string().url({ message: "Invalid URL for portfolio item 1." }).optional().or(z.literal('')),
  portfolioItem1Caption: z.string().max(150, "Caption for item 1 cannot exceed 150 characters.").optional(), // Swapped order
  portfolioItem2Url: z.string().url({ message: "Invalid URL for portfolio item 2." }).optional().or(z.literal('')),
  portfolioItem2Caption: z.string().max(150, "Caption for item 2 cannot exceed 150 characters.").optional(), // Swapped order
  teamName: z.string().max().optional(), 
});

type ChefProfileFormValues = z.infer<typeof chefProfileSchema>;

export default function ChefProfilePage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [chefData, setChefData] = useState<ChefProfileType | null>(null); // For storing fetched Firestore data
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [newProfilePictureFile, setNewProfilePictureFile] = useState<File | null>(null);

  const [newResumeFile, setNewResumeFile] = useState<File | null>(null);
  const [resumeParsedDataForSave, setResumeParsedDataForSave] = useState<ParseResumeOutput | null>(null);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<ChefProfileFormValues>({
    resolver: zodResolver(chefProfileSchema),
    defaultValues: {
      name: '',
      email: '',
      tagline: '',
      bio: '',
      specialties: '',
      experienceSummary: "",
      education: "",
      skills: "",
      portfolioItem1Url: '',
      portfolioItem1Caption: '',
      portfolioItem2Url: '',
      portfolioItem2Caption: '',
      teamName: '',
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (user && userProfile) {
        setChefData(userProfile as ChefProfileType);
        form.reset({
          name: userProfile.name || user.displayName || '',
          email: userProfile.email || user.email || '',
          tagline: (userProfile as ChefProfileType).tagline || '',
          bio: userProfile.bio || '',
          specialties: (userProfile as ChefProfileType).specialties?.join(', ') || '',
          experienceSummary: (userProfile as ChefProfileType).experienceSummary || '',
          education: (userProfile as ChefProfileType).education || '',
          skills: (userProfile as ChefProfileType).skills?.join(', ') || '',
          portfolioItem1Url: (userProfile as ChefProfileType).portfolioItem1Url || '',
          portfolioItem1Caption: (userProfile as ChefProfileType).portfolioItem1Caption || '',
          portfolioItem2Url: (userProfile as ChefProfileType).portfolioItem2Url || '',
          portfolioItem2Caption: (userProfile as ChefProfileType).portfolioItem2Caption || '',
          teamName: (userProfile as ChefProfileType).teamName || '',
        });
        setProfilePicturePreview(userProfile.profilePictureUrl || user.photoURL || null);
      } else if (user && !userProfile) { // User exists, but profile data hasn't loaded or doesn't exist yet
        form.reset({ name: user.displayName || '', email: user.email || ''});
        setProfilePicturePreview(user.photoURL || null);
      }
      setIsLoadingProfile(false);
    };

    if (!authLoading) {
      fetchProfile();
    }
  }, [user, userProfile, authLoading, form]);


  const handleResumeProcessed = (data: { parsedData: ParseResumeOutput; file: File }) => {
    setResumeParsedDataForSave(data.parsedData); 
 form.setValue('experienceSummary', data.parsedData.experience || '', { shouldValidate: true }); // Set value from parsed data
    form.setValue('skills', data.parsedData.skills?.join(', ') || '', { shouldValidate: true });
    if (data.parsedData.education) {
      form.setValue('education', data.parsedData.education, { shouldValidate: true });
    }
    setNewResumeFile(data.file);
    toast({
        title: "Resume Processed",
        description: "Resume details populated. Save profile to upload the new file."
    });
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('profilePictureFile', file, {shouldValidate: true});
      setNewProfilePictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (formData: ChefProfileFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    let profilePicUrlToSave = chefData?.profilePictureUrl || user.photoURL || '';
    let resumeUrlToSave = chefData?.resumeFileUrl || '';

    try {
      // 1. Upload new profile picture if one is staged
      if (newProfilePictureFile) {
        if (chefData?.profilePictureUrl && chefData.profilePictureUrl.startsWith('https://firebasestorage.googleapis.com')) {
            try {
                const oldImageRef = storageRef(storage, chefData.profilePictureUrl);
                await deleteObject(oldImageRef).catch(e => console.warn("Old profile pic not found or cannot be deleted:", e));
            } catch (e) {console.warn("Error deleting old profile picture",e);}
        }
        const fileExtension = newProfilePictureFile.name.split('.').pop();
        const profilePicPath = `users/${user.uid}/profilePicture.${fileExtension}`;
        const profilePicStorageRefInstance = storageRef(storage, profilePicPath);
        
        const uploadTask = uploadBytesResumable(profilePicStorageRefInstance, newProfilePictureFile);
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', null,
            (error) => { console.error("Profile pic upload error", error); reject(error); },
            async () => {
              profilePicUrlToSave = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      // 2. Upload new resume file if one is staged
      if (newResumeFile) {
        if (chefData?.resumeFileUrl && chefData.resumeFileUrl.startsWith('https://firebasestorage.googleapis.com')) {
            try {
                const oldResumeRef = storageRef(storage, chefData.resumeFileUrl);
                await deleteObject(oldResumeRef).catch(e => console.warn("Old resume not found or cannot be deleted:", e));
            } catch (e) {console.warn("Error deleting old resume file",e);}
        }
        const resumeFileExtension = newResumeFile.name.split('.').pop() || 'pdf';
        const resumePath = `users/${user.uid}/resume.${resumeFileExtension}`;
        const resumeStorageRefInstance = storageRef(storage, resumePath);
        const resumeUploadTask = uploadBytesResumable(resumeStorageRefInstance, newResumeFile);

        await new Promise<void>((resolve, reject) => {
          resumeUploadTask.on('state_changed', null,
            (error) => { console.error("Resume upload error", error); reject(error); },
            async () => {
              resumeUrlToSave = await getDownloadURL(resumeUploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      const updatedProfileData: Partial<ChefProfileType> = {
        name: formData.name,
        email: user.email!, // Ensure email is from auth
        tagline: formData.tagline,
        bio: formData.bio,
        specialties: formData.specialties.split(',').map(s => s.trim()).filter(s => s),
        profilePictureUrl: profilePicUrlToSave,
        experienceSummary: resumeParsedDataForSave?.experience || formData.experienceSummary,
        education: resumeParsedDataForSave?.education || formData.education,
        skills: resumeParsedDataForSave?.skills || formData.skills?.split(',').map(s => s.trim()).filter(s => s) || [],
        portfolioItem1Url: formData.portfolioItem1Url,
        portfolioItem1Caption: formData.portfolioItem1Caption,
        portfolioItem2Url: formData.portfolioItem2Url,
        portfolioItem2Caption: formData.portfolioItem2Caption,
        resumeFileUrl: resumeUrlToSave,
        updatedAt: serverTimestamp(),
        role: 'chef', // Ensure role is set
        ...(chefData?.abn && {abn: chefData.abn}), // Preserve ABN if it was set during signup
        ...(chefData?.teamName && { teamName: chefData.teamName }),
        ...(chefData?.teamId && { teamId: chefData.teamId }),
        ...(chefData?.hasCompletedFirstCoOp !== undefined && { hasCompletedFirstCoOp: chefData.hasCompletedFirstCoOp }),
        ...(chefData?.collaboratorIds && { collaboratorIds: chefData.collaboratorIds}),
        ...(chefData?.incomingCollaborationRequests && { incomingCollaborationRequests: chefData.incomingCollaborationRequests }),
        ...(chefData?.outgoingCollaborationRequests && { outgoingCollaborationRequests: chefData.outgoingCollaborationRequests }),
        ...(chefData?.isApproved !== undefined && { isApproved: chefData.isApproved }),
        ...(chefData?.isSubscribed !== undefined && { isSubscribed: chefData.isSubscribed }),
        ...(chefData?.trustScore !== undefined && { trustScore: chefData.trustScore }),
        ...(chefData?.trustScoreBasis && { trustScoreBasis: chefData.trustScoreBasis }),
      };
      
      if (!chefData?.createdAt && !userProfile?.createdAt) { // Only set createdAt if it's truly a new profile document
        updatedProfileData.createdAt = serverTimestamp();
      }
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, updatedProfileData, { merge: true }); 
 
      // 3. Update Auth profile if name or picture changed
      if (user.displayName !== formData.name || (profilePicUrlToSave && user.photoURL !== profilePicUrlToSave)) {
        await updateAuthProfile(user, {
          displayName: formData.name,
          photoURL: profilePicUrlToSave,
        });
      }
      setChefData(prev => ({ ...prev, ...updatedProfileData, id: user.uid, email: user.email! } as ChefProfileType));
      setNewProfilePictureFile(null); 
      setNewResumeFile(null);
      // setResumeParsedDataForSave(null); // Keep this data in case user wants to re-save without re-parsing immediately

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

  if (authLoading || isLoadingProfile) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Profile...</div>;
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
                    key={profilePicturePreview} 
                    unoptimized={profilePicturePreview?.startsWith('blob:')} // Add this for blob URLs if needed
                  />
                   <FormField
                      control={form.control}
                      name="profilePictureFile" 
                      render={() => ( 
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
                <h3 className="text-lg font-semibold mb-3 flex items-center"><Users className="mr-2 h-5 w-5 text-primary" data-ai-hint="team users" /> Team Affiliation</h3>
                 <FormField
                    control={form.control}
                    name="teamName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Chef Alliance / Collaboration Group</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly disabled placeholder="Not part of an alliance" />
                        </FormControl>
                         <FormDescription>Indicate if you're part of a regular Chef Alliance or Collaboration Group. This helps in co-hosting and showcasing joint event types. (Full alliance management features are planned for the future).</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>


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
                        if (chefData?.resumeFileUrl) {
                            window.open(chefData.resumeFileUrl, '_blank');
                        } else {
                            toast({ title: "Resume Not Available", description: "No resume file has been uploaded yet.", variant: "default" });
                        }
                    }}
                    disabled={!chefData?.resumeFileUrl || isSaving}
                    >
                    <Download className="mr-2 h-4 w-4" /> Download Current Resume
                </Button>
                <ResumeUploadForm
                    onResumeParsed={handleResumeProcessed}
                    initialData={resumeParsedDataForSave || undefined} 
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
                            src={form.watch(`portfolioItem${itemNum}Url` as 'portfolioItem1Url' | 'portfolioItem2Url') || "https://placehold.co/300x200.png"}
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
                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSaving || isLoadingProfile || authLoading}>
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
