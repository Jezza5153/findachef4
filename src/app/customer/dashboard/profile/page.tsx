
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
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
import { useState, useEffect, type ChangeEvent } from 'react';
import type { CustomerProfile as CustomerProfileType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { UserCircle, Save, UploadCloud, MapPin, ChefHat, CookingPot, MixerHorizontal, Microwave, UtensilsCrossed, ShoppingBasket, Trash2, Loader2, Home, Thermometer, Coffee, Box, Utensils } from 'lucide-react'; // Changed Blender to MixerHorizontal
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
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile as updateAuthProfile } from 'firebase/auth';

const kitchenEquipmentOptions = [
  { value: 'Oven', label: 'Oven', icon: <Home className="mr-2 h-5 w-5" /> },
  { value: 'Stovetop', label: 'Stovetop', icon: <CookingPot className="mr-2 h-5 w-5" /> },
  { value: 'Microwave', label: 'Microwave', icon: <Microwave className="mr-2 h-5 w-5" /> },
  { value: 'Blender', label: 'Blender/Mixer', icon: <MixerHorizontal className="mr-2 h-5 w-5" /> }, // Changed Blender to MixerHorizontal
  { value: 'BBQGrill', label: 'BBQ Grill', icon: <UtensilsCrossed className="mr-2 h-5 w-5" /> },
  { value: 'StandardPotsPans', label: 'Standard Pots & Pans', icon: <Utensils className="mr-2 h-5 w-5" /> }, // Changed icon
  { value: 'Refrigerator', label: 'Refrigerator', icon: <Thermometer className="mr-2 h-5 w-5" /> }, // Re-using Thermometer, consider specific fridge icon if available
  { value: 'Freezer', label: 'Freezer', icon: <Box className="mr-2 h-5 w-5" /> },
];

const customerProfileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phone: z.string().optional(),
  profilePictureFile: z.instanceof(File).optional()
    .refine(file => !file || file.size <= 2 * 1024 * 1024, `Max file size is 2MB.`)
    .refine(file => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), `Only JPG, PNG, WEBP files are allowed.`),
  kitchenEquipment: z.array(z.string()).optional(),
  addressDetails: z.string().optional(),
  defaultEventType: z.string().optional(),
  defaultPax: z.coerce.number().optional(),
  defaultBudgetAmount: z.coerce.number().optional(),
  defaultFrequency: z.string().optional(),
  defaultTheme: z.string().optional(),
  defaultDietaryNotes: z.string().optional(),
  defaultExtraComments: z.string().optional(),
});

type CustomerProfileFormValues = z.infer<typeof customerProfileSchema>;

export default function CustomerProfilePage() {
  const { user, userProfile, loading: authLoading, profileLoading } = useAuth();
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [newProfilePictureFile, setNewProfilePictureFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const isLoading = authLoading || profileLoading;

  const form = useForm<CustomerProfileFormValues>({
    resolver: zodResolver(customerProfileSchema),
    defaultValues: {
      name: '',
      phone: '',
      kitchenEquipment: [],
      addressDetails: '',
      defaultEventType: '',
      defaultPax: 1,
      defaultBudgetAmount: 50,
      defaultFrequency: 'Once',
      defaultTheme: '',
      defaultDietaryNotes: '',
      defaultExtraComments: '',
    },
  });

  useEffect(() => {
    if (!isLoading && user) {
      const currentProfile = userProfile as CustomerProfileType | null;
      if (currentProfile && currentProfile.role === 'customer') {
        form.reset({
          name: currentProfile.name || user.displayName || '',
          phone: currentProfile.phone || '',
          kitchenEquipment: currentProfile.kitchenEquipment || [],
          addressDetails: currentProfile.addressDetails || '',
          defaultEventType: currentProfile.defaultEventType || '',
          defaultPax: currentProfile.defaultPax || 1,
          defaultBudgetAmount: currentProfile.defaultBudgetAmount || 50,
          defaultFrequency: currentProfile.defaultFrequency || 'Once',
          defaultTheme: currentProfile.defaultTheme || '',
          defaultDietaryNotes: currentProfile.defaultDietaryNotes || '',
          defaultExtraComments: currentProfile.defaultExtraComments || '',
        });
        setProfilePicturePreview(currentProfile.profilePictureUrl || user.photoURL || null);
      } else if (user) { 
        form.reset({ name: user.displayName || '', phone: user.phoneNumber || '' });
        setProfilePicturePreview(user.photoURL || null);
      }
    } else if (!isLoading && !user) {
      // Handled by layout redirect
    }
  }, [user, userProfile, isLoading, form]);

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('profilePictureFile', file, { shouldValidate: true });
      setNewProfilePictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue('profilePictureFile', undefined);
      setNewProfilePictureFile(null);
      setProfilePicturePreview(userProfile?.profilePictureUrl || user?.photoURL || null);
    }
  };

  const onSubmit = async (formData: CustomerProfileFormValues) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    console.log("CustomerProfilePage: Saving profile for UID:", user.uid, "Data:", formData);

    let profilePicUrlToSave = userProfile?.profilePictureUrl || user.photoURL || '';

    try {
      if (newProfilePictureFile) {
        const oldProfilePicUrl = userProfile?.profilePictureUrl;
        if (oldProfilePicUrl && oldProfilePicUrl.startsWith('https://firebasestorage.googleapis.com')) {
          try {
            const oldImageRef = storageRef(storage, oldProfilePicUrl);
            await deleteObject(oldImageRef);
            console.log("CustomerProfilePage: Deleted old profile picture from Storage.");
          } catch (e: any) {
            if (e.code !== 'storage/object-not-found') {
              console.warn("CustomerProfilePage: Error deleting old profile picture, continuing...", e);
            }
          }
        }
        const fileExtension = newProfilePictureFile.name.split('.').pop() || 'jpg';
        const profilePicPath = `users/${user.uid}/profilePicture.${fileExtension}`;
        const profilePicStorageRefInstance = storageRef(storage, profilePicPath);
        
        toast({ title: "Uploading Profile Picture...", description: "Please wait." });
        const uploadTask = uploadBytesResumable(profilePicStorageRefInstance, newProfilePictureFile);
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            null,
            (error) => { 
              console.error("CustomerProfilePage: Profile picture upload error:", error); 
              reject(error); 
            },
            async () => {
              try {
                profilePicUrlToSave = await getDownloadURL(uploadTask.snapshot.ref);
                console.log("CustomerProfilePage: Profile picture uploaded successfully:", profilePicUrlToSave);
                resolve();
              } catch (getUrlError) {
                console.error("CustomerProfilePage: Error getting download URL for profile picture:", getUrlError);
                reject(getUrlError);
              }
            }
          );
        });
      }

      const updatedProfileData: Partial<CustomerProfileType> = {
        id: user.uid, // Ensure ID is always set
        name: formData.name,
        email: user.email!,
        phone: formData.phone || '',
        profilePictureUrl: profilePicUrlToSave,
        kitchenEquipment: formData.kitchenEquipment || [],
        addressDetails: formData.addressDetails || '',
        defaultEventType: formData.defaultEventType || '',
        defaultPax: formData.defaultPax || 1,
        defaultBudgetAmount: formData.defaultBudgetAmount || 0,
        defaultFrequency: formData.defaultFrequency || '',
        defaultTheme: formData.defaultTheme || '',
        defaultDietaryNotes: formData.defaultDietaryNotes || '',
        defaultExtraComments: formData.defaultExtraComments || '',
        role: 'customer',
        updatedAt: serverTimestamp(),
      };
      
      const userDocRef = doc(db, "users", user.uid);
      // Check if profile exists to determine if we need to set createdAt
      const docSnap = await doc(db, "users", user.uid).get();
      if (!docSnap.exists()) {
        updatedProfileData.createdAt = serverTimestamp();
      }

      await setDoc(userDocRef, updatedProfileData, { merge: true });
      console.log("CustomerProfilePage: Firestore profile saved/merged successfully.");

      if (user.displayName !== formData.name || (profilePicUrlToSave && user.photoURL !== profilePicUrlToSave)) {
        await updateAuthProfile(user, {
          displayName: formData.name,
          photoURL: profilePicUrlToSave,
        });
        console.log("CustomerProfilePage: Firebase Auth profile (displayName/photoURL) updated.");
      }
      
      setNewProfilePictureFile(null);
      toast({
        title: 'Profile Updated Successfully',
        description: 'Your customer profile has been saved.',
      });

    } catch (error) {
      console.error('CustomerProfilePage: Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: (error instanceof Error) ? error.message : 'Could not save your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    // Placeholder for actual account deletion logic
    toast({
      title: 'Account Deletion Request (Placeholder)',
      description: 'This feature is not yet fully implemented. In a real app, this would start a secure account deletion process.',
      duration: 7000,
    });
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" data-ai-hint="loading spinner"/> Loading Profile...</div>;
  }
  
  // This component should be protected by its layout, which handles redirection if !user

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <UserCircle className="mr-3 h-7 w-7 text-primary" data-ai-hint="user profile icon"/> My Customer Profile
          </CardTitle>
          <CardDescription>Manage your contact details, kitchen setup, and default event preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <section>
                <h3 className="text-xl font-semibold mb-4 border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div className="md:col-span-1 flex flex-col items-center">
                    <Image
                      src={profilePicturePreview || "https://placehold.co/150x150.png"}
                      alt={form.getValues('name') || user?.displayName || "Customer"}
                      width={150}
                      height={150}
                      className="rounded-full object-cover shadow-md mb-4"
                      data-ai-hint="person avatar"
                      key={profilePicturePreview} // Re-render if preview changes
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
                                  id="customerProfilePictureUpdate"
                                  disabled={isSaving}
                                />
                                <Button type="button" variant="outline" asChild className="w-full" disabled={isSaving}>
                                  <label htmlFor="customerProfilePictureUpdate" className="cursor-pointer flex items-center justify-center">
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
                          <FormControl><Input placeholder="e.g., John Doe" {...field} disabled={isSaving} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input type="email" value={user?.email || ''} readOnly disabled /></FormControl>
                      <FormDescription>Your email address cannot be changed here.</FormDescription>
                    </FormItem>
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number (Optional)</FormLabel>
                          <FormControl><Input type="tel" placeholder="e.g., 555-123-4567" {...field} disabled={isSaving} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center">
                  <ChefHat className="mr-2 h-6 w-6 text-primary" data-ai-hint="kitchen tools"/> My Kitchen Setup
                </h3>
                <FormField
                  control={form.control}
                  name="kitchenEquipment"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Available Kitchen Equipment</FormLabel>
                        <FormDescription>
                          Select the equipment you have available in your kitchen. This helps chefs plan accordingly.
                        </FormDescription>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {kitchenEquipmentOptions.map((item) => (
                          <FormField
                            key={item.value}
                            control={form.control}
                            name="kitchenEquipment"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={item.value}
                                  className="flex flex-row items-center space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50 transition-colors"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item.value)}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || [];
                                        return checked
                                          ? field.onChange([...currentValues, item.value])
                                          : field.onChange(
                                              currentValues.filter(
                                                (value) => value !== item.value
                                              )
                                            );
                                      }}
                                      disabled={isSaving}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal flex items-center cursor-pointer">
                                    {item.icon}
                                    {item.label}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section>
                <h3 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center">
                  <MapPin className="mr-2 h-6 w-6 text-primary" data-ai-hint="location pin icon"/> My Location
                </h3>
                <FormField
                  control={form.control}
                  name="addressDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Address / Event Location Details</FormLabel>
                      <FormControl><Textarea placeholder="e.g., 123 Main St, Anytown, USA. Include any important notes about access or parking." className="min-h-[100px]" {...field} disabled={isSaving} /></FormControl>
                      <FormDescription>Provide details about where events typically take place or your primary address for service.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section>
                <h3 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center">
                  <Utensils className="mr-2 h-6 w-6 text-primary" data-ai-hint="event preferences cutlery"/> My Default Event Preferences
                </h3>
                <FormDescription className="mb-4">
                  Set up your typical event preferences. You can always customize these when making a new request.
                </FormDescription>
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="defaultEventType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Typical Event Type</FormLabel>
                        <FormControl><Input placeholder="e.g., Birthday Dinner, Family Brunch" {...field} disabled={isSaving} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="defaultPax"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Typical Number of Guests (PAX)</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g., 8" {...field} disabled={isSaving} /></FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="defaultBudgetAmount"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Typical Budget Amount ($)</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="e.g., 500" {...field} disabled={isSaving} /></FormControl>
                            <FormDescription>Specify if this is 'per person' or 'total' in the notes if needed.</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                   </div>
                  <FormField
                    control={form.control}
                    name="defaultFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Typical Frequency/Timing</FormLabel>
                        <FormControl><Input placeholder="e.g., Weekends, Once a month" {...field} disabled={isSaving} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultTheme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Theme/Vibe (Optional)</FormLabel>
                        <FormControl><Input placeholder="e.g., Casual BBQ, Formal French Dinner" {...field} disabled={isSaving} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultDietaryNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Common Dietary Notes (Optional)</FormLabel>
                        <FormControl><Textarea placeholder="e.g., Gluten-free options needed, one vegetarian guest" className="min-h-[80px]" {...field} disabled={isSaving} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultExtraComments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other Preferences or Kitchen Notes (Optional)</FormLabel>
                        <FormControl><Textarea placeholder="e.g., We prefer family-style service, limited counter space." className="min-h-[80px]" {...field} disabled={isSaving} /></FormControl>
                        <FormDescription>This can include specific kitchen notes or other preferences for the chef.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between">
                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>

                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="lg" className="w-full sm:w-auto mt-4 sm:mt-0" disabled={isSaving}>
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
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
