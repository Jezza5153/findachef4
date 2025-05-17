
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import type { ChefWallEvent, CalendarEvent } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { PlusCircle, Edit3, Trash2, LayoutGrid, Users, CalendarClock, DollarSign, MapPin, Globe, Lock, AlertCircle, ChefHat, Loader2, InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, serverTimestamp, Timestamp, setDoc, onSnapshot } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';

const wallEventFormSchema = z.object({
  title: z.string().min(5, { message: 'Event title must be at least 5 characters.' }),
  description: z.string().min(20, { message: 'Description must be at least 20 characters.' }).max(500, { message: 'Description cannot exceed 500 characters.' }),
  maxPax: z.coerce.number().min(1, { message: 'Maximum PAX must be at least 1.' }),
  eventDateTime: z.string().refine(val => {
    try {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date > new Date(); // Ensure date is in the future
    } catch {
      return false;
    }
  }, { message: 'Please enter a valid future date and time (e.g., YYYY-MM-DDTHH:MM).' }),
  location: z.string().min(3, { message: 'Location is required.' }),
  pricePerPerson: z.coerce.number().min(0, { message: 'Price must be a positive number or zero.' }),
  chefsInvolved: z.string().optional(), 
  tags: z.string().optional(), 
  imageUrl: z.string().url({ message: "Please enter a valid image URL." }).optional().or(z.literal('')),
  dataAiHint: z.string().optional(),
  isPublic: z.boolean().default(true), 
});

type WallEventFormValues = z.infer<typeof wallEventFormSchema>;

export default function ChefWallPage() {
  const { user, userProfile, isChefSubscribed } = useAuth();
  const [wallEvents, setWallEvents] = useState<ChefWallEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ChefWallEvent | null>(null);
  const { toast } = useToast();

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
      dataAiHint: '',
      isPublic: true,
    },
  });

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const eventsCollectionRef = collection(db, "chefWallEvents");
    const q = query(eventsCollectionRef, where("chefId", "==", user.uid), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedEvents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChefWallEvent));
      setWallEvents(fetchedEvents);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching wall events:", error);
      toast({ title: "Error", description: "Could not fetch your event posts.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const onSubmitEventPost = async (data: WallEventFormValues) => {
    if (!user || !userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    if (data.isPublic && !isChefSubscribed) {
        toast({title: "Subscription Required", description: "An active subscription is needed to publish events publicly.", variant: "destructive"});
        return;
    }
    setIsSaving(true);

    const eventDate = new Date(data.eventDateTime);

    const finalEventData: Omit<ChefWallEvent, 'id' | 'createdAt' | 'updatedAt' | 'chefId' | 'chefName' | 'chefAvatarUrl'> & { chefId: string, chefName: string, chefAvatarUrl?: string } = {
      title: data.title,
      description: data.description,
      maxPax: data.maxPax,
      eventDateTime: eventDate.toISOString(), // Store as ISO string
      location: data.location,
      pricePerPerson: data.pricePerPerson,
      chefsInvolved: data.chefsInvolved?.split(',').map(s => s.trim()).filter(s => s) || [],
      tags: data.tags?.split(',').map(s => s.trim()).filter(s => s) || [],
      imageUrl: data.imageUrl,
      dataAiHint: data.dataAiHint,
      isPublic: data.isPublic,
      chefId: user.uid,
      chefName: userProfile.name || user.displayName || "Chef",
      chefAvatarUrl: userProfile.profilePictureUrl || user.photoURL || undefined,
    };
    
    try {
      let eventId: string;
      const calendarEventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
        title: finalEventData.title,
        date: Timestamp.fromDate(eventDate),
        location: finalEventData.location,
        pax: finalEventData.maxPax,
        menuName: `Event: ${finalEventData.title}`,
        pricePerHead: finalEventData.pricePerPerson,
        notes: finalEventData.description,
        coChefs: finalEventData.chefsInvolved,
        status: 'WallEvent', // Mark as a Chef Wall event
        chefId: user.uid,
        isWallEvent: true,
      };

      if (editingEvent) {
        eventId = editingEvent.id;
        const eventDocRef = doc(db, "chefWallEvents", eventId);
        await updateDoc(eventDocRef, { ...finalEventData, updatedAt: serverTimestamp() });
        
        const calendarEventDocRef = doc(db, `users/${user.uid}/calendarEvents`, eventId);
        await setDoc(calendarEventDocRef, { ...calendarEventData, updatedAt: serverTimestamp() }, { merge: true });

        toast({ title: 'Event Post Updated', description: `"${finalEventData.title}" has been successfully updated.` });
      } else {
        const newDocRef = doc(collection(db, "chefWallEvents")); 
        eventId = newDocRef.id;
        await setDoc(newDocRef, { ...finalEventData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        
        const calendarEventDocRef = doc(db, `users/${user.uid}/calendarEvents`, eventId);
        await setDoc(calendarEventDocRef, { ...calendarEventData, id: eventId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        
        toast({ title: 'Event Post Created', description: `"${finalEventData.title}" has been successfully created.` });
      }
      
      form.reset();
      setEditingEvent(null);
      setIsPostDialogOpen(false);

    } catch (error) {
      console.error('Error saving wall event:', error);
      toast({ title: 'Save Failed', description: 'Could not save your event post. Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditEventPost = (eventToEdit: ChefWallEvent) => {
    setEditingEvent(eventToEdit);
    // Format date for datetime-local input
    const eventDate = new Date(eventToEdit.eventDateTime);
    const formattedDateTime = `${eventDate.getFullYear()}-${('0' + (eventDate.getMonth() + 1)).slice(-2)}-${('0' + eventDate.getDate()).slice(-2)}T${('0' + eventDate.getHours()).slice(-2)}:${('0' + eventDate.getMinutes()).slice(-2)}`;
    
    form.reset({
      ...eventToEdit,
      eventDateTime: formattedDateTime,
      chefsInvolved: eventToEdit.chefsInvolved?.join(', ') || '',
      tags: eventToEdit.tags?.join(', ') || '',
    });
    setIsPostDialogOpen(true);
  };

  const handleDeleteEventPost = async (eventIdToDelete: string) => {
    if (!user) return;
    const eventToDelete = wallEvents.find(e => e.id === eventIdToDelete);
    if (!eventToDelete) return;

    if (window.confirm(`Are you sure you want to delete the event post "${eventToDelete?.title}"? This will also remove it from your calendar.`)) {
      setIsSaving(true);
      try {
        await deleteDoc(doc(db, "chefWallEvents", eventIdToDelete));
        await deleteDoc(doc(db, `users/${user.uid}/calendarEvents`, eventIdToDelete));
        // Note: Image deletion from Storage would be handled here if images were uploaded to Storage
        toast({ title: 'Event Post Deleted', description: `"${eventToDelete?.title}" has been deleted.`, variant: 'destructive' });
      } catch (error) {
        console.error("Error deleting event post:", error);
        toast({ title: "Delete Error", description: "Could not delete event post.", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }
  };
  
  const openNewEventDialog = () => {
    // Get current date and time, format for datetime-local input
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1 - now.getTimezoneOffset()); // Adjust for local time and add 1 minute
    const defaultDateTime = now.toISOString().slice(0,16);

    form.reset({
      title: '',
      description: '',
      maxPax: 10,
      eventDateTime: defaultDateTime,
      location: '',
      pricePerPerson: 50,
      chefsInvolved: '',
      tags: '',
      imageUrl: '',
      dataAiHint: '',
      isPublic: true,
    });
    setEditingEvent(null);
    setIsPostDialogOpen(true);
  };
  
  const formatEventDateTimeForDisplay = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    } catch (e) {
      return dateTimeString; 
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading event posts...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center">
          <LayoutGrid className="mr-3 h-8 w-8 text-primary" /> The Chef's Wall (Your Events)
        </h1>
        <Button onClick={openNewEventDialog} disabled={isSaving}>
          <PlusCircle className="mr-2 h-5 w-5" /> Post New Event
        </Button>
      </div>

      <Dialog open={isPostDialogOpen} onOpenChange={(open) => {
        if (isSaving && open) return; 
        setIsPostDialogOpen(open);
        if (!open) {
            form.reset();
            setEditingEvent(null);
        }
      }}>
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
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormDescription>Be specific (YYYY-MM-DD HH:MM). Must be a future date.</FormDescription>
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
                    <FormDescription>Comma-separated names. This can include team members or collaborators.</FormDescription>
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
                    <FormDescription>A captivating image for your event post. (Direct upload coming soon)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dataAiHint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image Description Hint (for AI)</FormLabel>
                    <FormControl><Input placeholder="e.g., outdoor cooking, fine dining" {...field} /></FormControl>
                    <FormDescription>One or two keywords to help AI understand the image content (max 2 words).</FormDescription>
                    <FormMessage />
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
                        {field.value && !isChefSubscribed && " Public visibility requires an active subscription."}
                      </FormDescription>
                    </div>
                     <TooltipProvider>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                if (checked && !isChefSubscribed) {
                                  toast({ title: "Subscription Required", description: "You need an active subscription to make events public.", variant: "destructive"});
                                  // form.setValue('isPublic', false); // Revert if not subscribed - optional, or let validation handle
                                  return; 
                                }
                                field.onChange(checked);
                              }}
                              // Disable if trying to set to public without subscription
                              disabled={isSaving || (field.value && !isChefSubscribed)} 
                            />
                          </FormControl>
                        </TooltipTrigger>
                        {field.value && !isChefSubscribed && (
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
                    <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving || (form.getValues('isPublic') && !isChefSubscribed)}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingEvent ? 'Save Changes' : 'Create Event Post')}
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
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/600x300.png?text=Image+Error"; }}
                />
              )}
              {!event.imageUrl && <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground"><InfoIcon className="h-8 w-8"/></div>}
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
                <div className="flex items-center"><CalendarClock className="mr-2 h-4 w-4 text-primary" /> {formatEventDateTimeForDisplay(event.eventDateTime)}</div>
                <div className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" /> {event.location}</div>
                <div className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-green-600" /> ${event.pricePerPerson}/person</div>
                <div className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary" /> Max {event.maxPax} guests</div>
                {event.chefsInvolved && event.chefsInvolved.length > 0 && (
                  <div className="flex items-center text-xs">
                    <ChefHat className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium mr-1">Chefs:</span> 
                    {event.chefsInvolved.map((chef) => (
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
                  <Button variant="outline" size="sm" onClick={() => handleEditEventPost(event)} className="flex-1" disabled={isSaving}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteEventPost(event.id)} className="flex-1" disabled={isSaving}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        !isLoading && (
            <Card className="text-center py-12 border-dashed">
                <CardHeader>
                    <LayoutGrid className="mx-auto h-12 w-12 text-muted-foreground mb-3" data-ai-hint="grid empty" />
                    <CardTitle>No Event Posts Yet</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">You haven't posted any events. Share your upcoming culinary experiences!</p>
                    <Button onClick={openNewEventDialog}>
                    <PlusCircle className="mr-2 h-5 w-5" /> Create Your First Event Post
                    </Button>
                </CardContent>
            </Card>
        )
      )}
    </div>
  );
}
