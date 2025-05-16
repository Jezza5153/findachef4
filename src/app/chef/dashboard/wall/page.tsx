
'use client';

import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import type { ChefWallEvent } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { PlusCircle, Edit3, Trash2, LayoutGrid, Users, CalendarClock, DollarSign, MapPin, Tag, Globe, Lock, AlertCircle, ChefHat } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

const wallEventFormSchema = z.object({
  title: z.string().min(5, { message: 'Event title must be at least 5 characters.' }),
  description: z.string().min(20, { message: 'Description must be at least 20 characters.' }).max(500, { message: 'Description cannot exceed 500 characters.' }),
  maxPax: z.coerce.number().min(1, { message: 'Maximum PAX must be at least 1.' }),
  eventDateTime: z.string().min(1, { message: 'Event date and time are required.' }), // Simple text for now
  location: z.string().min(3, { message: 'Location is required.' }),
  pricePerPerson: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  chefsInvolved: z.string().optional(), // Comma-separated string
  tags: z.string().optional(), // Comma-separated string
  imageUrl: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal('')),
  isPublic: z.boolean().default(true), // Default to public
  requiresSubscription: z.boolean().default(false).optional(), // Informational
});

type WallEventFormValues = z.infer<typeof wallEventFormSchema>;

const initialWallEvents: ChefWallEvent[] = [
  {
    id: 'wall1',
    title: 'Summer BBQ Cookout Masterclass',
    description: 'Join Chef Julia for an afternoon of grilling techniques and delicious BBQ food. Learn to make perfect ribs, brisket, and sides. All ingredients and equipment provided.',
    maxPax: 20,
    eventDateTime: '2024-08-15 14:00',
    location: 'Community Park Pavilion A',
    pricePerPerson: 75,
    chefsInvolved: ['Chef Julia', 'Chef Assistant Ben'],
    tags: ['BBQ', 'Outdoor', 'Casual', 'Grilling'],
    imageUrl: 'https://placehold.co/600x400.png',
    isPublic: true,
    chefId: 'chef123',
    chefName: 'Chef Julia',
    chefAvatarUrl: 'https://placehold.co/80x80.png',
    dataAiHint: 'bbq grilling',
  },
  {
    id: 'wall2',
    title: 'Exclusive Pasta Making Workshop (Private Group)',
    description: 'A hands-on workshop for you and your friends to learn the art of fresh pasta making from scratch. Enjoy the fruits of your labor with a delicious meal afterwards.',
    maxPax: 8,
    eventDateTime: '2024-09-05 18:00',
    location: 'Chef Julia\'s Kitchen Studio',
    pricePerPerson: 120,
    chefsInvolved: ['Chef Julia'],
    tags: ['Italian', 'Workshop', 'Hands-on', 'Private'],
    imageUrl: 'https://placehold.co/600x400.png',
    isPublic: false, // Example of a private event
    chefId: 'chef123',
    chefName: 'Chef Julia',
    chefAvatarUrl: 'https://placehold.co/80x80.png',
    dataAiHint: 'pasta making',
  },
];


export default function ChefWallPage() {
  const [wallEvents, setWallEvents] = useState<ChefWallEvent[]>(initialWallEvents);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ChefWallEvent | null>(null);
  const [isChefSubscribed, setIsChefSubscribed] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const subscriptionStatus = localStorage.getItem('isChefSubscribed');
      setIsChefSubscribed(subscriptionStatus === 'true');
    }
  }, []);

  const form = useForm<WallEventFormValues>({
    resolver: zodResolver(wallEventFormSchema),
    defaultValues: {
      title: '',
      description: '',
      maxPax: 10,
      eventDateTime: '',
      location: '',
      pricePerPerson: 50,
      chefsInvolved: '',
      tags: '',
      imageUrl: '',
      isPublic: true,
      requiresSubscription: false,
    },
  });

  const onSubmitEventPost = (data: WallEventFormValues) => {
    // The 'requiresSubscription' field is purely informational for the form
    const { requiresSubscription, ...eventData } = data;

    const finalEventData = {
        ...eventData,
        chefsInvolved: data.chefsInvolved?.split(',').map(s => s.trim()).filter(s => s) || [],
        tags: data.tags?.split(',').map(s => s.trim()).filter(s => s) || [],
    };
    
    if (editingEvent) {
      setWallEvents(wallEvents.map(event => event.id === editingEvent.id ? { ...editingEvent, ...finalEventData } : event));
      toast({ title: 'Event Post Updated', description: `"${finalEventData.title}" has been successfully updated.` });
    } else {
      const newEvent: ChefWallEvent = {
        id: String(Date.now()),
        ...finalEventData,
        chefId: 'chef123', // Placeholder
        chefName: 'Chef Julia', // Placeholder
        chefAvatarUrl: 'https://placehold.co/80x80.png', // Placeholder
      };
      setWallEvents([...wallEvents, newEvent]);
      toast({ title: 'Event Post Created', description: `"${finalEventData.title}" has been successfully created.` });
    }
    form.reset();
    setEditingEvent(null);
    setIsPostDialogOpen(false);
  };

  const handleEditEventPost = (eventId: string) => {
    const eventToEdit = wallEvents.find(event => event.id === eventId);
    if (eventToEdit) {
      setEditingEvent(eventToEdit);
      form.reset({
        ...eventToEdit,
        chefsInvolved: eventToEdit.chefsInvolved.join(', '),
        tags: eventToEdit.tags.join(', '),
        requiresSubscription: !isChefSubscribed, // Set based on current subscription
      });
      setIsPostDialogOpen(true);
    }
  };

  const handleDeleteEventPost = (eventId: string) => {
    const eventToDelete = wallEvents.find(e => e.id === eventId);
    if (window.confirm(`Are you sure you want to delete the event post "${eventToDelete?.title}"?`)) {
      setWallEvents(wallEvents.filter(event => event.id !== eventId));
      toast({ title: 'Event Post Deleted', description: `"${eventToDelete?.title}" has been deleted.`, variant: 'destructive' });
    }
  };
  
  const openNewEventDialog = () => {
    form.reset({
      title: '',
      description: '',
      maxPax: 10,
      eventDateTime: '',
      location: '',
      pricePerPerson: 50,
      chefsInvolved: '',
      tags: '',
      imageUrl: '',
      isPublic: true,
      requiresSubscription: !isChefSubscribed, // Set based on current subscription
    });
    setEditingEvent(null);
    setIsPostDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center">
          <LayoutGrid className="mr-3 h-8 w-8 text-primary" /> The Chef's Wall (Your Events)
        </h1>
        <Button onClick={openNewEventDialog}>
          <PlusCircle className="mr-2 h-5 w-5" /> Post New Event
        </Button>
      </div>

      <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event Post' : 'Create New Event Post'}</DialogTitle>
            <CardDescription>Share your upcoming public or private culinary events with the community.</CardDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEventPost)} className="space-y-6 p-1">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl><Input placeholder="e.g., Pop-Up Dinner Series" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Description</FormLabel>
                    <FormControl><Textarea placeholder="Detailed description of the event experience..." {...field} className="min-h-[100px]" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="maxPax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum PAX (Guests)</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g., 25" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pricePerPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Person ($)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="e.g., 95.00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="eventDateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Date & Time</FormLabel>
                    <FormControl><Input placeholder="e.g., 2024-12-24 19:00 or Next Saturday at 7 PM" {...field} /></FormControl>
                    <FormDescription>Be specific (YYYY-MM-DD HH:MM) or descriptive.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input placeholder="e.g., My Studio, City Park, Client's Address (TBD)" {...field} /></FormControl>
                    <FormDescription>Specify address or general location.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="chefsInvolved"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Chefs Involved (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., Chef Jane Doe, Chef John Smith" {...field} /></FormControl>
                    <FormDescription>Comma-separated names. You can tag registered chefs later.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags / Keywords (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., Fine Dining, Vegan, Wine Pairing, Casual" {...field} /></FormControl>
                    <FormDescription>Comma-separated tags to help people find your event.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Image URL (Optional)</FormLabel>
                    <FormControl><Input placeholder="https://example.com/event_image.jpg" {...field} /></FormControl>
                    <FormDescription>A captivating image for your event post.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                  control={form.control}
                  name="requiresSubscription"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-muted/30">
                       {!isChefSubscribed && <AlertCircle className="h-5 w-5 text-destructive" />}
                      <FormControl>
                         <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled // This checkbox is purely informational
                         />
                      </FormControl>
                      <div className="space-y-0.5">
                        <FormLabel className="font-normal text-sm">
                          Publishing to the public Customer Wall requires a $1/month subscription (simulated).
                        </FormLabel>
                         {!isChefSubscribed && <p className="text-xs text-destructive">Your account is not currently subscribed.</p>}
                      </div>
                    </FormItem>
                  )}
                />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Event Visibility</FormLabel>
                      <FormDescription>
                        {field.value ? "Public: Visible to all customers on the Customer Wall." : "Private: Invite-only or for your records."}
                        {!isChefSubscribed && field.value && " Public visibility requires a subscription."}
                      </FormDescription>
                    </div>
                     <TooltipProvider>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!isChefSubscribed && field.value} // Disable if trying to set public without subscription
                              aria-readonly={!isChefSubscribed && field.value}
                            />
                          </FormControl>
                        </TooltipTrigger>
                        {!isChefSubscribed && field.value && (
                          <TooltipContent>
                            <p className="flex items-center"><AlertCircle className="mr-2 h-4 w-4" />Subscription required to make event public.</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={!isChefSubscribed && form.getValues('isPublic')}>
                  {editingEvent ? 'Save Changes' : 'Create Event Post'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {wallEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallEvents.map(event => (
            <Card key={event.id} className="shadow-lg flex flex-col overflow-hidden">
              {event.imageUrl && (
                <Image 
                    src={event.imageUrl} 
                    alt={event.title} 
                    width={600} 
                    height={300} 
                    className="w-full h-48 object-cover"
                    data-ai-hint={event.dataAiHint || "event food"}
                />
              )}
              <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    <Badge variant={event.isPublic ? "default" : "secondary"} className="text-xs">
                        {event.isPublic ? <Globe className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />}
                        {event.isPublic ? 'Public' : 'Private'}
                    </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Posted by: {event.chefName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm flex-grow">
                <p className="line-clamp-3">{event.description}</p>
                <div className="flex items-center"><CalendarClock className="mr-2 h-4 w-4 text-primary" /> {event.eventDateTime}</div>
                <div className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" /> {event.location}</div>
                <div className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-green-600" /> ${event.pricePerPerson}/person</div>
                <div className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary" /> Max {event.maxPax} guests</div>
                {event.chefsInvolved && event.chefsInvolved.length > 0 && (
                  <div className="flex items-center text-xs">
                    <ChefHat className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium mr-1">Chefs:</span> 
                    {event.chefsInvolved.map((chef, index) => (
                       <Badge key={chef} variant="outline" className="mr-1 text-xs">{chef}</Badge>
                    ))}
                  </div>
                )}
                {event.tags && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {event.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 border-t bg-muted/20">
                <div className="flex space-x-2 w-full">
                  <Button variant="outline" size="sm" onClick={() => handleEditEventPost(event.id)} className="flex-1">
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteEventPost(event.id)} className="flex-1">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12 border-dashed">
          <CardHeader>
            <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <CardTitle>No Event Posts Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You haven't posted any events. Share your upcoming culinary experiences!</p>
            <Button onClick={openNewEventDialog}>
              <PlusCircle className="mr-2 h-5 w-5" /> Create Your First Event Post
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
