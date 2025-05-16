
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
import { UserCircle, Save, Edit3, Briefcase, Lightbulb, UploadCloud, GraduationCap, Images, Download } from 'lucide-react';

// Mock current chef data
const currentChefData: ChefProfileType = {
  id: 'chef123',
  name: 'Julia Child',
  email: 'julia.child@example.com',
  tagline: 'Master of French Cuisine',
  bio: 'Passionate chef with over 10 years of experience in French cuisine. Loves to create memorable dining experiences.',
  specialties: ['French Cuisine', 'Pastry', 'Classic European'],
  profilePictureUrl: 'https://placehold.co/150x150.png',
  experienceSummary: "Initial summary from a previous resume perhaps.",
  education: "Graduated from Le Cordon Bleu, Paris.",
  skills: ["Knife Skills", "Menu Planning", "Event Catering"],
  portfolioItem1Url: 'https://placehold.co/300x200.png',
  portfolioItem1Caption: 'Signature Beef Bourguignon',
  portfolioItem2Url: 'https://placehold.co/300x200.png',
  portfolioItem2Caption: 'Delicate Chocolate Soufflé',
  resumeFileUrl: '#', // Placeholder for actual resume URL
};

const chefProfileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  tagline: z.string().max(100, "Tagline cannot exceed 100 characters.").optional(),
  bio: z.string().min(20, {message: 'Bio must be at least 20 characters.'}).max(500, {message: "Bio cannot exceed 500 characters."}),
  specialties: z.string().min(1, { message: 'Please list at least one specialty.' }), // Comma-separated
  profilePicture: z.instanceof(File).optional()
    .refine(file => !file || file.size <= 2 * 1024 * 1024, `Max file size is 2MB.`)
    .refine(file => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), `Only JPG, PNG, WEBP files are allowed.`),
  experienceSummary: z.string().optional(),
  education: z.string().max(2000, "Education summary cannot exceed 2000 characters.").optional(),
  skills: z.string().optional(), // Comma-separated skills
  portfolioItem1Url: z.string().url({ message: "Invalid URL for portfolio item 1." }).optional().or(z.literal('')),
  portfolioItem1Caption: z.string().max(150, "Caption for item 1 cannot exceed 150 characters.").optional(),
  portfolioItem2Url: z.string().url({ message: "Invalid URL for portfolio item 2." }).optional().or(z.literal('')),
  portfolioItem2Caption: z.string().max(150, "Caption for item 2 cannot exceed 150 characters.").optional(),
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
      tagline: chefData.tagline || '',
      bio: chefData.bio,
      specialties: chefData.specialties.join(', '),
      experienceSummary: chefData.experienceSummary,
      education: chefData.education || '',
      skills: chefData.skills?.join(', '),
      portfolioItem1Url: chefData.portfolioItem1Url || '',
      portfolioItem1Caption: chefData.portfolioItem1Caption || '',
      portfolioItem2Url: chefData.portfolioItem2Url || '',
      portfolioItem2Caption: chefData.portfolioItem2Caption || '',
    },
  });
  
  useEffect(() => {
    form.reset({
      name: chefData.name,
      email: chefData.email,
      tagline: chefData.tagline || '',
      bio: chefData.bio,
      specialties: chefData.specialties.join(', '),
      experienceSummary: chefData.experienceSummary,
      education: chefData.education || '',
      skills: chefData.skills?.join(', '),
      portfolioItem1Url: chefData.portfolioItem1Url || '',
      portfolioItem1Caption: chefData.portfolioItem1Caption || '',
      portfolioItem2Url: chefData.portfolioItem2Url || '',
      portfolioItem2Caption: chefData.portfolioItem2Caption || '',
    });
    setProfilePicturePreview(chefData.profilePictureUrl || null);
  }, [chefData, form]);


  const handleResumeParsed = (data: ParseResumeOutput) => {
    setChefData(prev => ({
      ...prev,
      experienceSummary: data.experience,
      skills: data.skills,
      education: data.education || prev.education, // Update education if provided
    }));
    form.setValue('experienceSummary', data.experience);
    form.setValue('skills', data.skills.join(', '));
    if (data.education) {
      form.setValue('education', data.education);
    }
    toast({
        title: "Profile Updated from Resume",
        description: "Your experience, skills, and education have been updated."
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
      form.setValue('profilePicture', undefined);
      setProfilePicturePreview(chefData.profilePictureUrl || null); 
    }
  };

  const onSubmit = (data: ChefProfileFormValues) => {
    console.log('Chef Profile Update Data:', data);
    // Simulate API call to update profile
    setChefData(prev => ({
      ...prev,
      name: data.name,
      email: data.email,
      tagline: data.tagline,
      bio: data.bio,
      specialties: data.specialties.split(',').map(s => s.trim()),
      experienceSummary: data.experienceSummary,
      education: data.education,
      skills: data.skills?.split(',').map(s => s.trim()),
      profilePictureUrl: profilePicturePreview || prev.profilePictureUrl, 
      portfolioItem1Url: data.portfolioItem1Url,
      portfolioItem1Caption: data.portfolioItem1Caption,
      portfolioItem2Url: data.portfolioItem2Url,
      portfolioItem2Caption: data.portfolioItem2Caption,
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
          <CardDescription>Manage your public-facing profile information, portfolio, and resume.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
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
                      render={({ field }) => ( 
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
                          <Input type="email" placeholder="you@example.com" {...field} readOnly disabled // Email usually not editable after signup
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
                          <Input placeholder="e.g., Master of French Cuisine, Private Chef" {...field} />
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
                      <Input placeholder="e.g., Italian, French, Pastry" {...field} />
                    </FormControl>
                    <FormDescription>Comma-separated list of your culinary specialties.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-3 flex items-center"><GraduationCap className="mr-2 h-5 w-5 text-primary" /> Education</h3>
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
                          />
                        </FormControl>
                        <FormDescription>This field can be auto-filled by resume parsing or edited manually.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-3 flex items-center"><Briefcase className="mr-2 h-5 w-5 text-primary" /> Experience Summary (from Resume)</h3>
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
                          />
                        </FormControl>
                        <FormDescription>This field can be auto-filled by resume parsing or edited manually.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-3 flex items-center"><Lightbulb className="mr-2 h-5 w-5 text-primary" /> Skills (from Resume)</h3>
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
                           />
                        </FormControl>
                        <FormDescription>This field can be auto-filled by resume parsing or edited manually. Comma-separated.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-4 flex items-center"><Images className="mr-2 h-5 w-5 text-primary" /> Portfolio (Max 2 items)</h3>
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
                            <FormControl><Input placeholder="https://example.com/your-dish.jpg" {...field} /></FormControl>
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
                            <FormControl><Input placeholder="e.g., My Signature Dish" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                <Button type="submit" size="lg" className="w-full sm:w-auto">
                  <Save className="mr-2 h-5 w-5" /> Save Profile Changes
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="lg" 
                  className="w-full sm:w-auto"
                  onClick={() => {
                    if (chefData.resumeFileUrl && chefData.resumeFileUrl !== '#') {
                      window.open(chefData.resumeFileUrl, '_blank');
                    } else {
                      toast({ title: "Resume Not Available", description: "No resume file URL is currently set for download.", variant: "destructive" });
                    }
                  }}
                  disabled={!chefData.resumeFileUrl || chefData.resumeFileUrl === '#'}
                >
                  <Download className="mr-2 h-5 w-5" /> Download Resume
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <ResumeUploadForm 
        onResumeParsed={handleResumeParsed} 
        initialData={{
          experience: chefData.experienceSummary || "", 
          skills: chefData.skills || [],
          education: chefData.education || ""
        }} 
      />
    </div>
  );
}
