
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import type { CustomerProfile as CustomerProfileType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { UserCircle, Save, UploadCloud, MapPin, Utensils, ChefHat, CookingPot, Blender, Microwave, Grill, ShoppingBasket, AlertCircle, Trash2 } from 'lucide-react';
import { Home, Thermometer, Coffee, Box } from 'lucide-react';
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


// Mock current customer data
const currentCustomerData: CustomerProfileType = {
  id: 'cust123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '555-1234',
  profilePictureUrl: 'https://placehold.co/150x150.png',
  kitchenEquipment: ['Oven', 'Microwave'],
  addressDetails: '123 Main St, Anytown, USA 12345',
  defaultEventType: 'Dinner Party',
  defaultPax: 8,
  defaultBudget: 'per person',
  defaultBudgetAmount: 75,
  defaultFrequency: 'Once',
  defaultTheme: 'Italian Night',
  defaultDietaryNotes: 'One guest is vegetarian.',
  defaultExtraComments: 'We have a small dog.',
};

const kitchenEquipmentOptions = [
  { value: 'Oven', label: 'Oven', icon: <Home className="mr-2 h-5 w-5" /> },
  { value: 'Stovetop', label: 'Stovetop', icon: <CookingPot className="mr-2 h-5 w-5" /> },
  { value: 'Microwave', label: 'Microwave', icon: <Microwave className="mr-2 h-5 w-5" /> },
  { value: 'Mixer', label: 'Mixer/Blender', icon: <Blender className="mr-2 h-5 w-5" /> },
  { value: 'BBQGrill', label: 'BBQ Grill', icon: <Grill className="mr-2 h-5 w-5" /> },
  { value: 'StandardPotsPans', label: 'Standard Pots & Pans', icon: <ShoppingBasket className="mr-2 h-5 w-5" /> },
  { value: 'Refrigerator', label: 'Refrigerator', icon: <Thermometer className="mr-2 h-5 w-5" /> }, // Using Thermometer as a proxy for fridge
  { value: 'Freezer', label: 'Freezer', icon: <Box className="mr-2 h-5 w-5" /> }, // Using Box as a proxy for freezer
];


const customerProfileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  phone: z.string().optional(),
  profilePicture: z.instanceof(File).optional()
    .refine(file => !file || file.size <= 2 * 1024 * 1024, `Max file size is 2MB.`)
    .refine(file => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), `Only JPG, PNG, WEBP files are allowed.`),
  kitchenEquipment: z.array(z.string()).optional(),
  addressDetails: z.string().optional(),
  defaultEventType: z.string().optional(),
  defaultPax: z.coerce.number().optional(),
  defaultBudget: z.string().optional(),
  defaultBudgetAmount: z.coerce.number().optional(),
  defaultFrequency: z.string().optional(),
  defaultTheme: z.string().optional(),
  defaultDietaryNotes: z.string().optional(),
  defaultExtraComments: z.string().optional(),
});

type CustomerProfileFormValues = z.infer<typeof customerProfileSchema>;

export default function CustomerProfilePage() {
  const [customerData, setCustomerData] = useState<CustomerProfileType>(currentCustomerData);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(customerData.profilePictureUrl || null);
  const { toast } = useToast();

  const form = useForm<CustomerProfileFormValues>({
    resolver: zodResolver(customerProfileSchema),
    defaultValues: {
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone || '',
      kitchenEquipment: customerData.kitchenEquipment || [],
      addressDetails: customerData.addressDetails || '',
      defaultEventType: customerData.defaultEventType || '',
      defaultPax: customerData.defaultPax || 1,
      defaultBudget: customerData.defaultBudget || 'per person',
      defaultBudgetAmount: customerData.defaultBudgetAmount || 50,
      defaultFrequency: customerData.defaultFrequency || 'Once',
      defaultTheme: customerData.defaultTheme || '',
      defaultDietaryNotes: customerData.defaultDietaryNotes || '',
      defaultExtraComments: customerData.defaultExtraComments || '',
    },
  });

  useEffect(() => {
    form.reset({
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone || '',
      kitchenEquipment: customerData.kitchenEquipment || [],
      addressDetails: customerData.addressDetails || '',
      defaultEventType: customerData.defaultEventType || '',
      defaultPax: customerData.defaultPax || 1,
      defaultBudget: customerData.defaultBudget || 'per person',
      defaultBudgetAmount: customerData.defaultBudgetAmount || 50,
      defaultFrequency: customerData.defaultFrequency || 'Once',
      defaultTheme: customerData.defaultTheme || '',
      defaultDietaryNotes: customerData.defaultDietaryNotes || '',
      defaultExtraComments: customerData.defaultExtraComments || '',
    });
    setProfilePicturePreview(customerData.profilePictureUrl || null);
  }, [customerData, form]);

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('profilePicture', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue('profilePicture', undefined);
      setProfilePicturePreview(customerData.profilePictureUrl || null);
    }
  };

  const onSubmit = (data: CustomerProfileFormValues) => {
    console.log('Customer Profile Update Data:', data);
    // Simulate API call to update profile
    setCustomerData(prev => ({
      ...prev,
      name: data.name,
      email: data.email,
      phone: data.phone,
      profilePictureUrl: profilePicturePreview || prev.profilePictureUrl,
      kitchenEquipment: data.kitchenEquipment,
      addressDetails: data.addressDetails,
      defaultEventType: data.defaultEventType,
      defaultPax: data.defaultPax,
      defaultBudget: data.defaultBudget,
      defaultBudgetAmount: data.defaultBudgetAmount,
      defaultFrequency: data.defaultFrequency,
      defaultTheme: data.defaultTheme,
      defaultDietaryNotes: data.defaultDietaryNotes,
      defaultExtraComments: data.defaultExtraComments,
    }));

    toast({
      title: 'Profile Updated Successfully',
      description: 'Your customer profile has been saved.',
    });
  };

  const handleDeleteAccount = () => {
    // Simulate account deletion request
    toast({
      title: 'Account Deletion Request Submitted',
      description: 'Your request to delete your account has been received and will be processed according to our data retention policy.',
      duration: 7000,
    });
     // In a real app, this would trigger backend processes and likely log the user out.
  };


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <UserCircle className="mr-3 h-7 w-7 text-primary" data-ai-hint="user profile"/> My Customer Profile
          </CardTitle>
          <CardDescription>Manage your contact details, kitchen setup, and default event preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

              {/* Basic Information Section */}
              <section>
                <h3 className="text-xl font-semibold mb-4 border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div className="md:col-span-1 flex flex-col items-center">
                    <Image
                      src={profilePicturePreview || "https://placehold.co/150x150.png"}
                      alt={customerData.name}
                      width={150}
                      height={150}
                      className="rounded-full object-cover shadow-md mb-4"
                      data-ai-hint="person avatar"
                    />
                    <FormField
                        control={form.control}
                        name="profilePicture"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <>
                                <Input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  onChange={handleProfilePictureChange}
                                  className="hidden"
                                  id="customerProfilePictureUpdate"
                                />
                                <Button type="button" variant="outline" asChild className="w-full">
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
                          <FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl>
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
                          <FormControl><Input type="email" placeholder="you@example.com" {...field} readOnly disabled /></FormControl>
                          <FormDescription>Your email address cannot be changed.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number (Optional)</FormLabel>
                          <FormControl><Input type="tel" placeholder="e.g., 555-123-4567" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </section>

              {/* Kitchen Setup Section */}
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
                          Let chefs know what equipment you have available.
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
                                        return checked
                                          ? field.onChange([...(field.value || []), item.value])
                                          : field.onChange(
                                              (field.value || []).filter(
                                                (value) => value !== item.value
                                              )
                                            );
                                      }}
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

              {/* Location Section */}
              <section>
                <h3 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center">
                  <MapPin className="mr-2 h-6 w-6 text-primary" data-ai-hint="location pin"/> My Location
                </h3>
                <FormField
                  control={form.control}
                  name="addressDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Address / Event Location Details</FormLabel>
                      <FormControl><Textarea placeholder="e.g., 123 Main St, Anytown, USA. Include any important notes about access or parking." className="min-h-[100px]" {...field} /></FormControl>
                      <FormDescription>Provide details about where events typically take place or your primary address.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              {/* Default Event Plan Section */}
              <section>
                <h3 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center">
                  <Utensils className="mr-2 h-6 w-6 text-primary" data-ai-hint="cutlery event"/> My Default Event Preferences
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
                        <FormControl><Input placeholder="e.g., Birthday Dinner, Family Brunch" {...field} /></FormControl>
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
                            <FormControl><Input type="number" placeholder="e.g., 8" {...field} /></FormControl>
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
                            <FormControl><Input type="number" step="0.01" placeholder="e.g., 500" {...field} /></FormControl>
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
                        <FormControl><Input placeholder="e.g., Weekends, Once a month" {...field} /></FormControl>
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
                        <FormControl><Input placeholder="e.g., Casual BBQ, Formal French Dinner" {...field} /></FormControl>
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
                        <FormControl><Textarea placeholder="e.g., Gluten-free options needed, one vegetarian guest" className="min-h-[80px]" {...field} /></FormControl>
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
                        <FormControl><Textarea placeholder="e.g., We prefer family-style service, limited counter space." className="min-h-[80px]" {...field} /></FormControl>
                        <FormDescription>This can include specific kitchen notes or other preferences for the chef.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <div className="pt-6 border-t flex justify-between items-center">
                <Button type="submit" size="lg" className="w-full sm:w-auto">
                  <Save className="mr-2 h-5 w-5" /> Save Profile
                </Button>

                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="lg" className="w-full sm:w-auto mt-4 sm:mt-0">
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

    