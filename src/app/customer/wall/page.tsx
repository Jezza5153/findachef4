
'use client';

import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription as ShadDialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ChefWallEvent, Booking, CalendarEvent } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { CalendarSearch, Search, ListFilter, Users, CalendarClock, DollarSign, MapPin, Info, ChefHat, UserCircle, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, Timestamp, addDoc, serverTimestamp, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export default function CustomerWallPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [events, setEvents] = useState<ChefWallEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // const [filterTags, setFilterTags] = useState<string[]>([]); // For future tag filtering

  const [isEventDetailsDialogOpen, setIsEventDetailsDialogOpen] = useState(false);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<ChefWallEvent | null>(null);
  
  const [isConfirmBookingDialogOpen, setIsConfirmBookingDialogOpen] = useState(false);
  const [eventToBook, setEventToBook] = useState<ChefWallEvent | null>(null);
  const [isBookingEvent, setIsBookingEvent] = useState(false);

  const isLoading = authLoading || isLoadingEvents;

  useEffect(() => {
    if (authLoading) return; // Wait for auth state to resolve

    if (!user) {
      router.push('/login?redirect=/customer/wall');
      return;
    }

    const fetchPublicEvents = async () => {
      setIsLoadingEvents(true);
      try {
        const eventsCollectionRef = collection(db, "chefWallEvents");
        const q = query(
          eventsCollectionRef,
          where("isPublic", "==", true),
          orderBy("eventDateTime", "asc") // Show upcoming events first
        );
        const querySnapshot = await getDocs(q);
        const fetchedEvents = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            eventDateTime: data.eventDateTime, // Assuming it's already ISO string or compatible
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt as any) : undefined),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt as any) : undefined),
          } as ChefWallEvent;
        });
        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching public chef events:", error);
        toast({
          title: "Error Loading Events",
          description: "Could not fetch chef-hosted events at this time.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingEvents(false);
      }
    };
    fetchPublicEvents();
  }, [user, authLoading, router, toast]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        event.title.toLowerCase().includes(searchLower) ||
        event.description.toLowerCase().includes(searchLower) ||
        event.location.toLowerCase().includes(searchLower) ||
        (event.chefName && event.chefName.toLowerCase().includes(searchLower)) ||
        (event.tags && event.tags.some(tag => tag.toLowerCase().includes(searchLower)));
      // Add tag filtering logic here if `filterTags` state is used
      return matchesSearch;
    });
  }, [events, searchTerm]);

  const formatEventDateTimeForDisplay = (dateTimeString: string | undefined) => {
    if (!dateTimeString) return "Date TBD";
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
      return String(dateTimeString);
    }
  };

  const handleViewEventDetails = (event: ChefWallEvent) => {
    setSelectedEventForDetails(event);
    setIsEventDetailsDialogOpen(true);
  };

  const handleBookEvent = (event: ChefWallEvent) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please log in to book this event.", variant: "destructive" });
      router.push('/login?redirect=/customer/wall');
      return;
    }
    setEventToBook(event);
    setIsEventDetailsDialogOpen(false); // Close details dialog if open
    setIsConfirmBookingDialogOpen(true);
  };

  const confirmBookEvent = async () => {
    if (!user || !eventToBook) return;
    setIsBookingEvent(true);

    try {
      const bookingDate = eventToBook.eventDateTime instanceof Timestamp 
                          ? eventToBook.eventDateTime 
                          : Timestamp.fromDate(new Date(eventToBook.eventDateTime));

      const newBookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> = {
        customerId: user.uid,
        chefId: eventToBook.chefId,
        chefName: eventToBook.chefName,
        chefAvatarUrl: eventToBook.chefAvatarUrl,
        eventTitle: eventToBook.title,
        eventDate: bookingDate,
        pax: eventToBook.maxPax, // For wall events, pax might be 1 for a ticket, or could be maxPax if it's a group booking
        totalPrice: eventToBook.pricePerPerson, // Assuming pricePerPerson is total for one ticket/spot
        pricePerHead: eventToBook.pricePerPerson,
        status: 'confirmed', // Or 'pending_payment' if there was a real payment step
        menuTitle: `Event: ${eventToBook.title}`,
        location: eventToBook.location,
        chefWallEventId: eventToBook.id, // Link to the wall event
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const bookingDocRef = doc(collection(db, "bookings"));
      const calendarEventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> & { id: string } = {
        id: bookingDocRef.id, // Use booking ID for calendar event ID
        chefId: eventToBook.chefId,
        date: bookingDate,
        title: `Booking: ${eventToBook.title}`,
        customerName: user.displayName || "Customer",
        pax: newBookingData.pax,
        menuName: newBookingData.menuTitle,
        pricePerHead: newBookingData.pricePerHead || 0,
        location: newBookingData.location,
        notes: `Booked from Chef's Wall. Wall Event ID: ${eventToBook.id}`,
        status: 'Confirmed',
        isWallEvent: true, // Indicates origin
        bookingId: bookingDocRef.id,
      };

      const batch = writeBatch(db);
      batch.set(bookingDocRef, newBookingData);
      const chefCalendarEventRef = doc(db, `users/${eventToBook.chefId}/calendarEvents`, bookingDocRef.id);
      batch.set(chefCalendarEventRef, { ...calendarEventData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      
      await batch.commit();

      toast({
        title: "Event Booked!",
        description: `You've successfully booked "${eventToBook.title}". Check 'My Booked Events'.`,
      });
      router.push('/customer/dashboard/events');

    } catch (error) {
      console.error("Error booking event:", error);
      toast({ title: "Booking Failed", description: "Could not book the event. Please try again.", variant: "destructive" });
    } finally {
      setIsBookingEvent(false);
      setIsConfirmBookingDialogOpen(false);
      setEventToBook(null);
    }
  };

  if (isLoading) { // Use the isLoading state that combines auth and data fetching
    return ( // Corrected return statement
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl flex items-center justify-center">
            <CalendarSearch className="mr-4 h-10 w-10 text-primary" data-ai-hint="calendar search"/> The Chef's Wall
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground/70">
            Discover unique culinary events hosted by our talented chefs.
          </p>
        </header>
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl flex items-center justify-center">
          <CalendarSearch className="mr-4 h-10 w-10 text-primary" data-ai-hint="calendar search"/> The Chef's Wall
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground/70">
          Discover unique culinary events hosted by our talented chefs.
        </p>
      </header>

      <Card className="mb-8 p-6 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label htmlFor="search-events" className="block text-sm font-medium text-foreground mb-1">Search Events</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="search-events"
                type="text"
                placeholder="Search by title, chef, location, or tags..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            {/* Placeholder for future tag filtering */}
            <label htmlFor="tag-filter" className="block text-sm font-medium text-foreground mb-1">Filter by Tag (Coming Soon)</label>
            <Input id="tag-filter" placeholder="e.g., Italian, Wine Pairing" disabled />
          </div>
        </div>
      </Card>

      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map(event => (
            <Card key={event.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col overflow-hidden">
              {event.imageUrl ? (
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  width={600}
                  height={300}
                  className="w-full h-56 object-cover"
                  data-ai-hint={event.dataAiHint || "event food crowd"}
                />
              ) : (
                <div className="w-full h-56 bg-muted flex items-center justify-center text-muted-foreground" data-ai-hint="event placeholder">
                  <CalendarSearch className="h-20 w-20 opacity-50" />
                </div>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-xl line-clamp-2">{event.title}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Hosted by: {event.chefName || "Chef"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm flex-grow">
                <p className="line-clamp-3 text-foreground/80">{event.description}</p>
                <div className="flex items-center"><CalendarClock className="mr-2 h-4 w-4 text-primary" /> {formatEventDateTimeForDisplay(event.eventDateTime)}</div>
                <div className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" /> {event.location}</div>
                <div className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-green-600" /> ${event.pricePerPerson.toFixed(2)}/person</div>
                <div className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary" /> Max {event.maxPax} guests</div>
                {event.tags && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {event.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 border-t bg-muted/20">
                <Button className="w-full" onClick={() => handleViewEventDetails(event)}>
                  View Details & Book
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ListFilter className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">No Events Found</h2>
          <p className="mt-2 text-muted-foreground">
            {searchTerm ? "Try adjusting your search terms." : "There are currently no public chef events listed. Check back soon!"}
          </p>
        </div>
      )}

      {selectedEventForDetails && (
        <Dialog open={isEventDetailsDialogOpen} onOpenChange={setIsEventDetailsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedEventForDetails.title}</DialogTitle>
              {selectedEventForDetails.chefName && 
                <DialogDescription>Hosted by Chef {selectedEventForDetails.chefName}</DialogDescription>
              }
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
              {selectedEventForDetails.imageUrl && (
                <div className="aspect-video relative rounded-md overflow-hidden my-2">
                  <Image src={selectedEventForDetails.imageUrl} alt={selectedEventForDetails.title} fill className="object-cover" data-ai-hint={selectedEventForDetails.dataAiHint || "event feature image"}/>
                </div>
              )}
              <p className="text-foreground/90">{selectedEventForDetails.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 text-sm">
                <div className="flex items-center"><CalendarClock className="mr-2 h-4 w-4 text-primary" /> <strong>Date:</strong> <span className="ml-1">{formatEventDateTimeForDisplay(selectedEventForDetails.eventDateTime)}</span></div>
                <div className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" /> <strong>Location:</strong> <span className="ml-1">{selectedEventForDetails.location}</span></div>
                <div className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-green-600" /> <strong>Price:</strong> <span className="ml-1">${selectedEventForDetails.pricePerPerson.toFixed(2)}/person</span></div>
                <div className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary" /> <strong>Max Guests:</strong> <span className="ml-1">{selectedEventForDetails.maxPax}</span></div>
              </div>
              {selectedEventForDetails.chefsInvolved && selectedEventForDetails.chefsInvolved.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground">Other Chefs Involved:</h4>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {selectedEventForDetails.chefsInvolved.map(chef => <Badge key={chef} variant="outline" className="text-xs">{chef}</Badge>)}
                  </div>
                </div>
              )}
              {selectedEventForDetails.tags && selectedEventForDetails.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground">Tags:</h4>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {selectedEventForDetails.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Close</Button>
              </DialogClose>
              <Button type="button" onClick={() => handleBookEvent(selectedEventForDetails)} disabled={isBookingEvent}>
                 {isBookingEvent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Book This Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {eventToBook && (
         <AlertDialog open={isConfirmBookingDialogOpen} onOpenChange={setIsConfirmBookingDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Your Booking</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to book "<strong>{eventToBook.title}</strong>" for <strong>${eventToBook.pricePerPerson.toFixed(2)}</strong>.
                Please confirm to proceed. This action will create a confirmed booking.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isBookingEvent}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmBookEvent} disabled={isBookingEvent}>
                {isBookingEvent ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Confirm Booking
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
