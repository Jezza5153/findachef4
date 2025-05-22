
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, addDays, startOfDay } from 'date-fns';
import { CalendarIcon, FileText, Send, DollarSign, Users, Utensils, Info, Loader2 } from 'lucide-react';
import type { CustomerRequest } from '@/types';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext'; // Added MapPin import
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react'; // Added useState for isSubmitting

const requestFormSchema = z.object({
  eventType: z.string().min(3, { message: 'Event type must be at least 3 characters.' }),
  budget: z.coerce.number().min(0, { message: 'Budget must be a positive number.' }),
  cuisinePreference: z.string().min(2, { message: 'Cuisine preference is required.' }),
  pax: z.coerce.number().min(1, { message: 'Number of guests must be at least 1.' }),
  eventDate: z.date({ required_error: 'Event date is required.' })
    .refine(date => date >= addDays(startOfDay(new Date()), 2), {
      message: 'Event date must be at least 48 hours from now.'
    }),
  notes: z.string().max().optional(),
  location: z.string().max().optional(),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

export default function NewRequestPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      eventType: '',
      budget: 0,
      cuisinePreference: '',
      pax: 1,
      eventDate: undefined,
      notes: '',
      location: '',
    },
  });

 useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/customer/requests/new');
    }
  }, [user, authLoading, router]);


  const onSubmit = async (data: RequestFormValues) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "Please log in to submit a request.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const newRequestData: Omit<CustomerRequest, 'id' | 'createdAt' | 'updatedAt' | 'activeProposal' | 'declinedChefIds' | 'respondingChefIds'> = {
        ...data,
        eventDate: Timestamp.fromDate(data.eventDate),
        customerId: user.uid,
        status: 'new',
      };

      const docRef = await addDoc(collection(db, "customerRequests"), {
        ...newRequestData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        activeProposal: null,
        declinedChefIds: [],
        respondingChefIds: [],
      });

      toast({
        title: 'Request Submitted Successfully!',
        description: 'Chefs matching your criteria will be notified. You can track responses in your messages.',
      });
      form.reset();
      router.push(`/customer/dashboard/messages?requestId=${docRef.id}`);
    } catch (error) {
      console.error("Error submitting new request:", error);
      toast({ title: "Submission Failed", description: "Could not submit your request. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4 sm:px-6 lg:px-8">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary" data-ai-hint="request form icon">
            <FileText className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-bold">Post Your Event Request</CardTitle>
          <CardDescription className="text-lg">
            Tell us about your event, and let our chefs come to you with proposals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Info className="mr-2 h-4 w-4 text-muted-foreground"/>Event Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Birthday Party, Corporate Dinner, Anniversary" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-muted-foreground"/>Your Budget (USD)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="e.g., 500" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="pax"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center"><Users className="mr-2 h-4 w-4 text-muted-foreground"/>Number of Guests (PAX)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="e.g., 10" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

              <FormField
                control={form.control}
                name="cuisinePreference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Utensils className="mr-2 h-4 w-4 text-muted-foreground"/>Cuisine Preference</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Italian, Mexican, Surprise Me!" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-muted-foreground"/>Event Location (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., My Home in Anytown, Event Venue Name" {...field} />
                    </FormControl>
                     <FormDescription>Provide an address or general area.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-1 flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Event Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < addDays(startOfDay(new Date()), 2) // Disable dates less than 48 hours from now
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription className="text-xs">
                        Minimum 48 hours notice required. Please note that cancellation policies apply. Review our <Link href="/terms#cancellation" className="underline hover:text-primary">Terms of Service</Link> for details.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any dietary restrictions, special requests, or other details..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-lg py-3" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                 Submit Request
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
