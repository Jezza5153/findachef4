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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResumeUploadForm } from '@/components/resume-upload-form';
import { useState, useEffect } from 'react';
import type { ParseResumeOutput, ChefProfile as ChefProfileType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { UserCircle, Save, Edit3, Briefcase, Lightbulb, UploadCloud } from 'lucide-react';

// Mock current chef data
const currentChefData: ChefProfileType = {
  id: 'chef123',
  name: 'Julia Child',
  email: 'julia.child@example.com',
  bio: 'Passionate chef with over 10 years of experience in French cuisine. Loves to create memorable dining experiences.',
  specialties: ['French Cuisine', 'Pastry', 'Classic European'],
  profilePictureUrl: 'https://placehold.co/150x150.png',
  experienceSummary: "Initial summary from a previous resume perhaps.",
  skills: ["Knife Skills", "Menu Planning", "Event Catering"],
};

const chefProfileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  bio: z.string().min(20, {message: 'Bio must be at least 20 characters.'}).max(500, {message: "Bio cannot exceed 500 characters."}),
  specialties: z.string().min(1, { message: 'Please list at least one specialty.' }), // Comma-separated
  profilePicture: z.instanceof(File).optional()
    .refine(file => !file || file.size <= 2 * 1024 * 1024, `Max file size is 2MB.`)
    .refine(file => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), `Only JPG, PNG, WEBP files are allowed.`),
  experienceSummary: z.string().optional(),
  skills: z.string().optional(), // Comma-separated skills
});

type ChefProfileFormValues = z.infer<typeof chefProfileSchema>;

export default function ChefProfilePage() {
  const [chefData, setChefData] = useState<ChefProfileType>(currentChefData);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(chefData.profilePictureUrl || null);
  const { toast } = useToast();

  const form = useForm<ChefProfileFormValues>({
    resolver: zodResolver(chefProfileSchema),
    defaultValues: {
      name: chefData.name,
      email: chefData.email,
      bio: chefData.bio,
      specialties: chefData.specialties.join(', '),
      experienceSummary: chefData.experienceSummary,
      skills: chefData.skills?.join(', '),
    },
  });
  
  useEffect(() => {
    form.reset({
      name: chefData.name,
      email: chefData.email,
      bio: chefData.bio,
      specialties: chefData.specialties.join(', '),
      experienceSummary: chefData.experienceSummary,
      skills: chefData.skills?.join(', '),
    });
    setProfilePicturePreview(chefData.profilePictureUrl || null);
  }, [chefData, form]);


  const handleResumeParsed = (data: ParseResumeOutput) => {
    setChefData(prev => ({
      ...prev,
      experienceSummary: data.experience,
      skills: data.skills,
    }));
    form.setValue('experienceSummary', data.experience);
    form.setValue('skills', data.skills.join(', '));
    toast({
        title: "Profile Updated",
        description: "Your profile information has been updated with the new resume data."
    })
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
      form.setValue('profilePicture', undefined); // Clear the file if deselected
      setProfilePicturePreview(chefData.profilePictureUrl || null); // Revert to original or null
    }
  };

  const onSubmit = (data: ChefProfileFormValues) => {
    console.log('Chef Profile Update Data:', data);
    // Simulate API call to update profile
    setChefData(prev => ({
      ...prev,
      name: data.name,
      email: data.email,
      bio: data.bio,
      specialties: data.specialties.split(',').map(s => s.trim()),
      experienceSummary: data.experienceSummary,
      skills: data.skills?.split(',').map(s => s.trim()),
      profilePictureUrl: profilePicturePreview || prev.profilePictureUrl, // Keep existing if no new one
    }));
    
    toast({
      title: 'Profile Updated Successfully',
      description: 'Your chef profile has been saved.',
    });
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center"><UserCircle className="mr-3 h-7 w-7 text-primary" /> Your Chef Profile</CardTitle>
          <CardDescription>Manage your public-facing profile information and resume.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-1 flex flex-col items-center">
                  <Image 
                    src={profilePicturePreview || "https://placehold.co/150x150.png"} 
                    alt={chefData.name} 
                    width={150} 
                    height={150} 
                    className="rounded-full object-cover shadow-md mb-4"
                    data-ai-hint="chef portrait"
                  />
                   <FormField
                      control={form.control}
                      name="profilePicture"
                      render={({ field }) => ( // field is not directly used for value, but for errors etc.
                        <FormItem className="w-full">
                          <FormControl>
                            <>
                              <Input 
                                type="file" 
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleProfilePictureChange} 
                                className="hidden"
                                id="profilePictureUpdate"
                              />
                              <Button type="button" variant="outline" asChild className="w-full">
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
                          <Input placeholder="e.g., Julia Child" {...field} />
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
                    <FormLabel>Specialties / Cuisine Types</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Italian, French, Pastry" {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated list of your culinary specialties.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-2 flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary" /> Experience Summary (from Resume)</h3>
                 <FormField
                    control={form.control}
                    name="experienceSummary"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Your professional experience summary will appear here after resume parsing..."
                            className="min-h-[120px] bg-muted/50"
                            readOnly={false} // Make editable as per requirements
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>This field can be auto-filled by resume parsing or edited manually.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-2 flex items-center"><Lightbulb className="mr-2 h-5 w-5 text-primary" /> Skills (from Resume)</h3>
                 <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                           <Input 
                            placeholder="Your skills will appear here, comma-separated..." 
                            className="bg-muted/50"
                            {...field} 
                           />
                        </FormControl>
                        <FormDescription>This field can be auto-filled by resume parsing or edited manually. Comma-separated.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              <Button type="submit" size="lg" className="w-full md:w-auto">
                <Save className="mr-2 h-5 w-5" /> Save Profile Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <ResumeUploadForm onResumeParsed={handleResumeParsed} initialData={{experience: chefData.experienceSummary || "", skills: chefData.skills || []}} />
    </div>
  );
}
