
'use client';

import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChefWallEvent, CalendarEvent, AppUserProfileContext } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { PlusCircle, Edit3, Trash2, LayoutGrid, Users, CalendarClock, DollarSign, MapPin, Globe, Lock, AlertCircle, ChefHat, Loader2, InfoIcon, UploadCloud } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDoc, doc, updateDoc, deleteDoc, query, where, serverTimestamp, Timestamp, setDoc, onSnapshot, orderBy, Unsubscribe, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { format, parseISO, isValid, formatISO } from 'date-fns';
import dynamic from 'next/dynamic';

const Dialog = dynamic(() => import('@/components/ui/dialog').then(mod => mod.Dialog), { ssr: false, loading: () => <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin inline-block"/> Loading Dialog...</div> });
const DialogContent = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogContent), { ssr: false });
const DialogHeader = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogHeader), { ssr: false });
const DialogTitle = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogTitle), { ssr: false });
const DialogFooter = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogFooter), { ssr: false });
const DialogClose = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogClose), { ssr: false });
const ShadDialogDescription = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogDescription), { ssr: false });


const wallEventFormSchema = z.object({
  title: z.string().min(5, { message: 'Event title must be at least 5 characters.' }),
  description: z.string().min(20, { message: 'Description must be at least 20 characters.' }).max(500, { message: 'Description cannot exceed 500 characters.' }),
  maxPax: z.coerce.number().min(1, { message: 'Maximum PAX must be at least 1.' }),
  eventDateTime: z.string().refine(val => {
    try {
      const date = new Date(val);
      return isValid(date) && date > new Date(); 
    } catch {
      return false;
    }
  }, { message: 'Please enter a valid future date and time (e.g., YYYY-MM-DDTHH:MM).' }),
  location: z.string().min(3, { message: 'Location is required.' }),
  pricePerPerson: z.coerce.number().min(0, { message: 'Price must be a positive number or zero.' }),
  chefsInvolved: z.string().optional(), 
  tags: z.string().optional(), 
  eventImageFile: z.instanceof(File).optional()
    .refine(file => !file || file.size <= 2 * 1024 * 1024, `Max image size is 2MB.`)
    .refine(file => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), `Only JPG, PNG, WEBP files are allowed.`),
  dataAiHint: z.string().optional().max(30, "Hint should be brief, max 2 words."),
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
  
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null);

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
      eventImageFile: undefined,
      dataAiHint: '',
      isPublic: true,
    },
  });

  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;
    if (user) {
      setIsLoading(true);
      const eventsCollectionRef = collection(db, "chefWallEvents");
      const q = query(eventsCollectionRef, where("chefId", "==", user.uid), orderBy("createdAt", "desc"));
      
      
        unsubscribe = onSnapshot(q, (querySnapshot) => {
          const fetchedEvents = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            let eventDateTimeStr = data.eventDateTime;
            if (eventDateTimeStr instanceof Timestamp) {
              eventDateTimeStr = eventDateTimeStr.toDate().toISOString();
            } else if (eventDateTimeStr && typeof eventDateTimeStr.seconds === 'number' && typeof eventDateTimeStr.nanoseconds === 'number') {
               eventDateTimeStr = new Timestamp(eventDateTimeStr.seconds, eventDateTimeStr.nanoseconds).toDate().toISOString();
            } else if (typeof eventDateTimeStr !== 'string' || !isValid(parseISO(eventDateTimeStr))) {
                console.warn("Invalid eventDateTime format from Firestore:", eventDateTimeStr, "for event ID:", docSnap.id);
                eventDateTimeStr = new Date().toISOString(); 
            }
            
            return { 
              id: docSnap.id, 
              ...data,
              eventDateTime: eventDateTimeStr,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt as any) : undefined),
              updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt as any) : undefined),
            } as ChefWallEvent;
          });
          setWallEvents(fetchedEvents);
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching wall events:", error);
          toast({ title: "Error", description: "Could not fetch your event posts.", variant: "destructive" });
          setIsLoading(false);
        });
     
    } else {
      setIsLoading(false);
      setWallEvents([]);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, toast]);

  const handleEventImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('eventImageFile', file, { shouldValidate: true });
      setEventImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEventImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue('eventImageFile', undefined);
      setEventImageFile(null);
      setEventImagePreview(editingEvent?.imageUrl || null);
    }
  };

  const onSubmitEventPost = async (data: WallEventFormValues) => {
    if (!user || !userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    if (data.isPublic && !isChefSubscribed && !(userProfile as AppUserProfileContext).isAdmin) {
        toast({title: "Subscription Required", description: "An active subscription is needed to publish events publicly.", variant: "destructive"});
        return;
    }
    setIsSaving(true);

    // --- Start Date Validation ---
    // Moved date parsing here to ensure validity before proceeding with image upload/Firestore ops
    // This also ensures editingEvent.eventDateTime is only accessed if editingEvent exists.
    let eventDate: Date;

    let eventDate: Date;
    try {
      eventDate = new Date(data.eventDateTime); // HTML datetime-local input provides ISO string
      if (!isValid(eventDate)) throw new Error("Invalid date format from input.");
    } catch (e) {
      console.error("Invalid date provided:", data.eventDateTime, e);
      toast({ title: "Invalid Date", description: "Please ensure the event date and time are valid.", variant: "destructive" });
      setIsSaving(false);
      return;
    }
    
    // --- End Date Validation ---

    let imageUrlToSave = editingEvent?.imageUrl || '';
    const eventIdForPath = editingEvent?.id || doc(collection(db, 'chefWallEvents')).id;

    try {
      // --- Start Image Upload Logic ---
      if (eventImageFile) {

        // --- Start Old Image Deletion ---
        // Wrap old image deletion in try/catch as it's not critical if it fails
        // Delete old image if editing and new image provided
        if (editingEvent?.imageUrl && editingEvent.imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
          try {
            const oldImageRef = storageRef(storage, editingEvent.imageUrl);
            await deleteObject(oldImageRef);
          } catch (e: any) {
            if (e.code !== 'storage/object-not-found') {
              console.warn("ChefWallPage: Could not delete old event image during update:", e.message);
            }
          }
        }
        // --- End Old Image Deletion ---
        
        const fileExtension = eventImageFile.name.split('.').pop() || 'jpg';
        const imagePath = `users/${user.uid}/chefWallEvents/${eventIdForPath}/eventImage.${fileExtension}`;
        const imageStorageRefInstance = storageRef(storage, imagePath);
        
        toast({ title: "Uploading image...", description: "Please wait." });
        const uploadTask = uploadBytesResumable(imageStorageRefInstance, eventImageFile);
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', null,
            (error) => { 
              console.error("ChefWallPage: Event image upload error:", error);
              reject(error); 
            },
            async () => {
              try {
                imageUrlToSave = await getDownloadURL(uploadTask.snapshot.ref);
                resolve();
              } catch (getUrlError) {
                console.error("ChefWallPage: Error getting download URL for event image:", getUrlError);
                reject(getUrlError);
              }
            }
          );
        });
        // --- End Image Upload Logic ---
      }

      const finalEventData: Omit<ChefWallEvent, 'id' | 'createdAt' | 'updatedAt'> & { chefId: string, chefName: string, chefAvatarUrl?: string, updatedAt: any, createdAt?: any } = {
        title: data.title,
        description: data.description,
        maxPax: data.maxPax,
        eventDateTime: eventDate.toISOString(), // Store as ISO string
        location: data.location,
        pricePerPerson: data.pricePerPerson,
        chefsInvolved: data.chefsInvolved?.split(',').map(s => s.trim()).filter(s => s) || [],
        tags: data.tags?.split(',').map(s => s.trim()).filter(s => s) || [],
        imageUrl: imageUrlToSave,
        dataAiHint: data.dataAiHint,
        isPublic: data.isPublic,
        chefId: user.uid,
        chefName: (userProfile as AppUserProfileContext).name || user.displayName || "Chef",
        chefAvatarUrl: (userProfile as AppUserProfileContext).profilePictureUrl || user.photoURL || undefined,
        updatedAt: serverTimestamp(),
      };
      
      const calendarEventData: Partial<CalendarEvent> = { // Use Partial as some fields might only be on update
        title: finalEventData.title,
        date: Timestamp.fromDate(eventDate),
        location: finalEventData.location,
        pax: finalEventData.maxPax,
        menuName: `Event: ${finalEventData.title}`, 
        pricePerHead: finalEventData.pricePerPerson,
        notes: finalEventData.description,
        coChefs: finalEventData.chefsInvolved,
        status: 'WallEvent', 
        chefId: user.uid,
        isWallEvent: true,
        updatedAt: serverTimestamp(),
      };

      // --- Start Firestore Batch Write ---
      const batch = writeBatch(db);
      const eventDocRef = doc(db, "chefWallEvents", eventIdForPath);
      const calendarEventDocRef = doc(db, `users/${user.uid}/calendarEvents`, eventIdForPath);

      if (editingEvent) {
        batch.update(eventDocRef, finalEventData);
        batch.set(calendarEventDocRef, { ...calendarEventData, id: eventIdForPath }, { merge: true }); // Merge to update or create
        toast({ title: 'Event Post Updated', description: `"${finalEventData.title}" has been updated.` });
      } else {
        finalEventData.createdAt = serverTimestamp();
        calendarEventData.createdAt = serverTimestamp();
        batch.set(eventDocRef, {...finalEventData, id: eventDocRef.id});
        batch.set(calendarEventDocRef, { ...calendarEventData, id: eventIdForPath });
        toast({ title: 'Event Post Created', description: `"${finalEventData.title}" has been created.` });
      }
      
      await batch.commit(); // Commit the batch write (Firestore ops)
      // --- End Firestore Batch Write ---
      
      form.reset();
      setEditingEvent(null);
      setIsPostDialogOpen(false);
      setEventImageFile(null);
      setEventImagePreview(null);

    } catch (error: any) {
      console.error('Error saving wall event:', error);
      toast({ title: 'Save Failed', description: `Could not save event post. ${error.message}`, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditEventPost = (eventToEdit: ChefWallEvent) => {
    setEditingEvent(eventToEdit);
    let eventDate;
    try {
      eventDate = parseISO(eventToEdit.eventDateTime); // Parse ISO string from Firestore
      if (!isValid(eventDate)) throw new Error("Invalid date from data");
    } catch (e) {
      console.error("Error parsing eventDateTime for editing:", eventToEdit.eventDateTime, e);
      eventDate = new Date(); 
      toast({title: "Date Error", description: "Event has an invalid date, using current date.", variant: "destructive"})
    }
    
    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const localDateTimeString = formatISO(eventDate).substring(0, 16);
    
    form.reset({
      title: eventToEdit.title,
      description: eventToEdit.description,
      maxPax: eventToEdit.maxPax,
      eventDateTime: localDateTimeString,
      location: eventToEdit.location,
      pricePerPerson: eventToEdit.pricePerPerson,
      chefsInvolved: eventToEdit.chefsInvolved?.join(', ') || '',
      tags: eventToEdit.tags?.join(', ') || '',
      eventImageFile: undefined,
      dataAiHint: eventToEdit.dataAiHint || '',
      isPublic: eventToEdit.isPublic,
    });
    setEventImagePreview(eventToEdit.imageUrl || null);
    setEventImageFile(null);
    setIsPostDialogOpen(true);
  };

  const handleDeleteEventPost = async (eventIdToDelete: string) => {
    if (!user) {
        toast({title: "Error", description: "User not authenticated.", variant: "destructive"});
        return;
    }
    const eventToDelete = wallEvents.find(e => e.id === eventIdToDelete);
    if (!eventToDelete) {
        toast({title: "Error", description: "Event not found.", variant: "destructive"});
        return;
    }

    if (window.confirm(`Are you sure you want to delete the event post "${eventToDelete?.title}"? This will also remove it from your calendar.`)) {
      setIsSaving(true);
      // --- Start Deletion Logic ---
      try {
        const batch = writeBatch(db);
        const wallEventDocRef = doc(db, "chefWallEvents", eventIdToDelete);
        batch.delete(wallEventDocRef);
        
        const calendarEventDocRef = doc(db, `users/${user.uid}/calendarEvents`, eventIdToDelete);
        batch.delete(calendarEventDocRef);

        // --- Start Image Deletion ---
        // Delete image from Storage if it exists
        if (eventToDelete.imageUrl && eventToDelete.imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
          try {
            const imageRefToDelete = storageRef(storage, eventToDelete.imageUrl);
            await deleteObject(imageRefToDelete);
          } catch (e: any) {
            if (e.code !== 'storage/object-not-found') {
              console.warn("ChefWallPage: Could not delete event image from storage during event deletion:", e.message);
            }
          }
        }
        // --- End Image Deletion ---
        
        await batch.commit();
        toast({ title: 'Event Post Deleted', description: `"${eventToDelete?.title}" has been deleted.`, variant: 'destructive' });
      } catch (error: any) {
        console.error("Error deleting event post:", error);
        toast({ title: "Delete Error", description: `Could not delete event post. ${error.message}`, variant: "destructive" });
      } finally {
        setIsSaving(false);
        // --- End Deletion Logic ---
      }
    }
  };
  
  const openNewEventDialog = () => {
    const now = new Date();
    // Default to one hour in the future, adjust for local timezone offset for datetime-local input
    const localNow = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    localNow.setHours(localNow.getHours() + 1); 
    const defaultDateTime = localNow.toISOString().slice(0,16); // YYYY-MM-DDTHH:mm

    form.reset({
      title: '',
      description: '',
      maxPax: 10,
      eventDateTime: defaultDateTime,
      location: '',
      pricePerPerson: 50,
      chefsInvolved: '',
      tags: '',
      eventImageFile: undefined,
      dataAiHint: '',
      isPublic: true,
    });
    setEditingEvent(null);
    setEventImageFile(null);
    setEventImagePreview(null);
    setIsPostDialogOpen(true);
  };
  
  const formatEventDateTimeForDisplay = useCallback((dateTimeString: string | undefined) => {
    if (!dateTimeString) return "Date TBD";
    try {
      const date = parseISO(dateTimeString); 
      if (!isValid(date)) return "Invalid Date";
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
      console.warn("Could not format date for display:", dateTimeString, e);
      return String(dateTimeString); 
    }
  }, []);


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" data-ai-hint="loading spinner"/> Loading event posts...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h1 className="text-3xl font-bold flex items-center">
          <LayoutGrid className="mr-3 h-8 w-8 text-primary" data-ai-hint="layout grid icon" /> The Chef's Wall (Your Events)
        </h1>
        <Button onClick={openNewEventDialog} disabled={isSaving}>
          <PlusCircle className="mr-2 h-5 w-5" /> Post New Event
        </Button>
      </div>

      {isPostDialogOpen && Dialog && DialogContent && DialogHeader && DialogTitle && DialogFooter && DialogClose && (
        <Dialog open={isPostDialogOpen} onOpenChange={(open) => {
          if (isSaving && open) return; 
          setIsPostDialogOpen(open);
          if (!open) {
              form.reset();
              setEditingEvent(null);
              setEventImageFile(null);
              setEventImagePreview(null);
          }
        }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Edit Event Post' : 'Create New Event Post'}</DialogTitle>
              {ShadDialogDescription && <ShadDialogDescription>Share your upcoming public or private culinary events with the community.</ShadDialogDescription>}
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
                      <FormDescription>Be specific. Must be a future date.</FormDescription>
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
                  name="eventImageFile"
                  render={({ fieldState }) => ( // field prop not needed for direct file input handling
                    <FormItem>
                      <FormLabel>Event Image (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="file" 
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleEventImageFileChange} 
                          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                      </FormControl>
                      {eventImagePreview && (
                        <div className="mt-2">
                          <Image src={eventImagePreview} alt="Event image preview" width={200} height={150} className="rounded-md object-cover" data-ai-hint="event food crowd" />
                        </div>
                      )}
                      <FormDescription>A captivating image for your event (max 2MB, JPG/PNG/WEBP).</FormDescription>
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
                      <FormDescription>One or two keywords to help AI understand image content (max 2 words).</FormDescription>
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
                      <FormDescription>Comma-separated names. This can include team members or collaborators from your alliance.</FormDescription>
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
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Event Visibility</FormLabel>
                        <FormDescription>
                          {field.value ? "Public: Visible to all customers on the Customer Wall." : "Private: Invite-only or for your records."}
                          {(!isChefSubscribed && field.value && !(userProfile as AppUserProfileContext)?.isAdmin) && " Public visibility requires an active subscription."}
                          {(!isChefSubscribed && !field.value && !(userProfile as AppUserProfileContext)?.isAdmin) && " Publishing public events requires an active subscription."}
                        </FormDescription>
                      </div>
                       <TooltipProvider>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  if (checked && !isChefSubscribed && !(userProfile as AppUserProfileContext)?.isAdmin) {
                                    toast({ title: "Subscription Required", description: "You need an active subscription to make events public.", variant: "destructive"});
                                    return; 
                                  }
                                  field.onChange(checked);
                                }}
                                disabled={isSaving || (field.value && !isChefSubscribed && !(userProfile as AppUserProfileContext)?.isAdmin)} 
                              />
                            </FormControl>
                          </TooltipTrigger>
                          {(!isChefSubscribed && !(userProfile as AppUserProfileContext)?.isAdmin) && (
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
                  <Button type="submit" disabled={isSaving || (form.getValues('isPublic') && !isChefSubscribed && !(userProfile as AppUserProfileContext)?.isAdmin)}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingEvent ? 'Save Changes' : 'Create Event Post')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {wallEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallEvents.map(event => (
            <Card key={event.id} className="shadow-lg flex flex-col overflow-hidden">
              {event.imageUrl ? (
                <Image 
                    src={event.imageUrl} 
                    alt={event.title} 
                    width={600} 
                    height={300} 
                    className="w-full h-48 object-cover"
                    data-ai-hint={event.dataAiHint || "event food"}
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/600x300.png?text=Image+Error"; }}
                />
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground">
                  <LayoutGrid className="h-16 w-16 opacity-50" data-ai-hint="event placeholder" />
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    <Badge variant={event.isPublic ? "default" : "secondary"} className="text-xs">
                        {event.isPublic ? <Globe className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />}
                        {event.isPublic ? 'Public' : 'Private'}
                    </Badge>
                </div>
                {event.chefName && 
                  <CardDescription className="text-xs text-muted-foreground">
                    Posted by: {event.chefName}
                  </CardDescription>
                }
              </CardHeader>
              <CardContent className="space-y-3 text-sm flex-grow">
                <p className="line-clamp-3">{event.description}</p>
                <div className="flex items-center"><CalendarClock className="mr-2 h-4 w-4 text-primary" data-ai-hint="calendar clock"/> {formatEventDateTimeForDisplay(event.eventDateTime)}</div>
                <div className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" data-ai-hint="map pin location"/> {event.location}</div>
                <div className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-green-600" data-ai-hint="dollar sign money"/> ${event.pricePerPerson.toFixed(2)}/person</div>
                <div className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary" data-ai-hint="users group"/> Max {event.maxPax} guests</div>
                {event.chefsInvolved && event.chefsInvolved.length > 0 && (
                  <div className="flex items-center text-xs">
                    <ChefHat className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" data-ai-hint="chef hat"/>
                    <span className="font-medium mr-1">Chefs:</span> 
                    {event.chefsInvolved.map((chefName) => ( 
                       <Badge key={chefName} variant="outline" className="mr-1 text-xs">{chefName}</Badge>
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
    
