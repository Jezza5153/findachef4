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
import { format } from 'date-fns';
import { CalendarIcon, FileText, Send, DollarSign, Users, Utensils, Info } from 'lucide-react';
import type { CustomerRequest } from '@/types';

const requestFormSchema = z.object({
  eventType: z.string().min(3, { message: 'Event type must be at least 3 characters.' }),
  budget: z.coerce.number().min(0, { message: 'Budget must be a positive number.' }),
  cuisinePreference: z.string().min(2, { message: 'Cuisine preference is required.' }),
  pax: z.coerce.number().min(1, { message: 'Number of guests must be at least 1.' }),
  eventDate: z.date({ required_error: 'Event date is required.' }),
  notes: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

export default function NewRequestPage() {
  const { toast } = useToast();
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      eventType: '',
      budget: 0,
      cuisinePreference: '',
      pax: 1,
      eventDate: undefined,
      notes: '',
    },
  });

  const onSubmit = (data: RequestFormValues) => {
    const newRequest: CustomerRequest = {
      id: String(Date.now()), // Mock ID
      ...data,
    };
    console.log('New Customer Request:', newRequest);
    // Simulate API call
    toast({
      title: 'Request Submitted Successfully!',
      description: 'Chefs matching your criteria will be notified. You will receive proposals soon.',
    });
    form.reset();
  };

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4 sm:px-6 lg:px-8">
      <Card className="shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
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
                name="eventDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="mb-1">Event Date</FormLabel>
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
                            date < new Date(new Date().setDate(new Date().getDate() -1)) // Disable past dates
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
              <Button type="submit" className="w-full text-lg py-3" size="lg" disabled={form.formState.isSubmitting}>
                <Send className="mr-2 h-5 w-5" /> Submit Request
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
