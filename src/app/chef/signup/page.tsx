
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
import type { ParseResumeOutput } from '@/ai/flows/resume-parser';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ChefHat, UserPlus, UploadCloud, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

const chefSignupSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  confirmPassword: z.string(),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  abn: z.string().min(1, {message: 'ABN is required.'}),
  bio: z.string().min(20, {message: 'Bio must be at least 20 characters.'}).max(500, {message: "Bio cannot exceed 500 characters."}),
  specialties: z.string().min(1, { message: 'Please list at least one specialty.' }), // Comma-separated
  profilePicture: z.instanceof(File).optional()
    .refine(file => !file || file.size <= 2 * 1024 * 1024, `Max file size is 2MB.`)
    .refine(file => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), `Only JPG, PNG, WEBP files are allowed.`),
  agreedToTerms: z.boolean().refine(value => value === true, {
    message: 'You must agree to the terms and policies to continue.',
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ChefSignupFormValues = z.infer<typeof chefSignupSchema>;

export default function ChefSignupPage() {
  const [resumeParsedData, setResumeParsedData] = useState<ParseResumeOutput | null>(null);
  const [isResumeUploaded, setIsResumeUploaded] = useState(false);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const { toast } = useToast();

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
    },
  });

  const handleResumeParsed = (data: ParseResumeOutput) => {
    setResumeParsedData(data);
    setIsResumeUploaded(true);
    // Optionally pre-fill form fields, e.g., bio if skills/experience can be summarized
    if (data.experience && form.getValues('bio') === '') {
        form.setValue('bio', data.experience.substring(0,500));
    }
    if (data.skills && data.skills.length > 0 && form.getValues('specialties') === '') {
        form.setValue('specialties', data.skills.join(', '));
    }
  };

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
      setProfilePicturePreview(null);
    }
  };

  const onSubmit = (data: ChefSignupFormValues) => {
    if (!isResumeUploaded) {
      toast({
        title: 'Resume Required',
        description: 'Please upload and parse your resume before submitting.',
        variant: 'destructive',
      });
      return;
    }
    
    console.log('Chef Signup Data:', data);
    console.log('Parsed Resume Data:', resumeParsedData);
    // TODO: Implement actual signup logic (e.g., Firebase Auth, API call)
    toast({
      title: 'Signup Successful (Simulated)',
      description: 'Your chef profile has been created. Welcome to FindAChef!',
    });
    form.reset();
    setResumeParsedData(null);
    setIsResumeUploaded(false);
    setProfilePicturePreview(null);
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
          <ResumeUploadForm onResumeParsed={handleResumeParsed} initialData={resumeParsedData ?? undefined} />

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
                        <Input type="password" placeholder="••••••••" {...field} />
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
                  name="profilePicture"
                  render={({ field }) => ( // field is not directly used here, onChange is handled by handleProfilePictureChange
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
                        I agree to the FindAChef <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link>, <Link href="/chef-policies" className="underline hover:text-primary">Chef Program Policies</Link>, and acknowledge the <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>. This includes keeping all communications and payments on the platform.
                      </FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full text-lg py-3" size="lg" disabled={!isResumeUploaded || form.formState.isSubmitting}>
                <UserPlus className="mr-2 h-5 w-5" /> Create Chef Account
              </Button>
              {!isResumeUploaded && (
                <p className="text-sm text-destructive text-center">Please upload and parse your resume above to enable account creation.</p>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

    