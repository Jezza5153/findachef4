
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarSearch, Users, DollarSign, MapPin, Search, Loader2, CalendarClock, ChefHat, Image as ImageIconLucide } from 'lucide-react';
import Image from 'next/image';
import type { ChefWallEvent, Booking, CalendarEvent } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const AlertDialog = dynamic(() => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialog), { ssr: false });
const AlertDialogAction = dynamic(() => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialogAction), { ssr: false });
const AlertDialogCancel = dynamic(() => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialogCancel), { ssr: false });
const AlertDialogContent = dynamic(() => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialogContent), { ssr: false });
const AlertDialogDescription = dynamic(() => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialogDescription), { ssr: false });
const AlertDialogFooter = dynamic(() => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialogFooter), { ssr: false });
const AlertDialogHeader = dynamic(() => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialogHeader), { ssr: false });
const AlertDialogTitle = dynamic(() => import('@/components/ui/alert-dialog').then(mod => mod.AlertDialogTitle), { ssr: false });

export default function CustomerWallPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allEvents, setAllEvents] = useState<ChefWallEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEventDetailsDialogOpen, setIsEventDetailsDialogOpen] = useState(false);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<ChefWallEvent | null>(null);
  const [isBookingConfirmationDialogOpen, setIsBookingConfirmationDialogOpen] = useState(false);
  const [isBookingEvent, setIsBookingEvent] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return; // Wait for auth state
    }
    if (!user) {
      router.push('/login?redirect=/customer/wall');
      return;
    }

    const fetchPublicEvents = async () => {
      setIsLoading(true);
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
            eventDateTime: data.eventDateTime instanceof Timestamp ? data.eventDateTime.toDate().toISOString() : data.eventDateTime as string,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt as any) : undefined),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt as any) : undefined),
          } as ChefWallEvent;
        });
        setAllEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching public chef events:", error);
        toast({
          title: "Error",
          description: "Could not load chef events. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchPublicEvents();
  }, [user, authLoading, router, toast]);

  const filteredEvents = useMemo(() => {
    if (!searchTerm) return allEvents;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allEvents.filter(event =>
      event.title.toLowerCase().includes(lowerSearchTerm) ||
      event.description.toLowerCase().includes(lowerSearchTerm) ||
      event.chefName.toLowerCase().includes(lowerSearchTerm) ||
      event.location.toLowerCase().includes(lowerSearchTerm) ||
      (event.tags && event.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)))
    );
  }, [allEvents, searchTerm]);

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

  const handleBookEventConfirmation = () => {
    if (!selectedEventForDetails) return;
    if (!user) { // Should be covered by page protection, but good to double check
      toast({
        title: "Login Required",
        description: "Please log in to book an event.",
        variant: "destructive",
      });
      router.push('/login?redirect=/customer/wall');
      return;
    }
    setIsEventDetailsDialogOpen(false);
    setIsBookingConfirmationDialogOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!user || !selectedEventForDetails) {
      toast({ title: "Error", description: "User or event details missing.", variant: "destructive" });
      return;
    }
    setIsBookingEvent(true);
    try {
      const newBookingRef = doc(collection(db, "bookings")); // Generate ID upfront
      const bookingData: Omit<Booking, 'id'> = {
        id: newBookingRef.id, // Add the ID to the data
        customerId: user.uid,
        chefId: selectedEventForDetails.chefId,
        chefName: selectedEventForDetails.chefName,
        chefAvatarUrl: selectedEventForDetails.chefAvatarUrl,
        eventTitle: selectedEventForDetails.title,
        eventDate: Timestamp.fromDate(new Date(selectedEventForDetails.eventDateTime)),
        pax: selectedEventForDetails.maxPax,
        totalPrice: selectedEventForDetails.pricePerPerson, // Assuming pricePerPerson is total for "ticket"
        pricePerHead: selectedEventForDetails.pricePerPerson,
        status: 'confirmed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        menuTitle: `Event: ${selectedEventForDetails.title}`,
        location: selectedEventForDetails.location,
        chefWallEventId: selectedEventForDetails.id,
      };
      await setDoc(newBookingRef, bookingData); // Use setDoc with the generated ref
      
      const calendarEventData: Omit<CalendarEvent, 'id'|'createdAt'|'updatedAt'> & { id: string } = {
        id: newBookingRef.id, // Use the same ID as the booking
        chefId: selectedEventForDetails.chefId,
        date: Timestamp.fromDate(new Date(selectedEventForDetails.eventDateTime)),
        title: `Booking: ${selectedEventForDetails.title}`,
        customerName: user.displayName || "Customer",
        pax: selectedEventForDetails.maxPax,
        menuName: `Event: ${selectedEventForDetails.title}`,
        pricePerHead: selectedEventForDetails.pricePerPerson,
        location: selectedEventForDetails.location,
        notes: `Booked via Chef's Wall. Event ID: ${selectedEventForDetails.id}. Booking ID: ${newBookingRef.id}`,
        status: 'Confirmed',
        isWallEvent: true,
        bookingId: newBookingRef.id,
      };
      await setDoc(doc(db, `users/${selectedEventForDetails.chefId}/calendarEvents`, newBookingRef.id), {
        ...calendarEventData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Event Booked!",
        description: `You've successfully booked "${selectedEventForDetails.title}". Check 'My Booked Events'.`,
      });
      router.push('/customer/dashboard/events');
    } catch (error) {
      console.error("Error booking event:", error);
      toast({ title: "Booking Failed", description: "Could not book the event. Please try again.", variant: "destructive" });
    } finally {
      setIsBookingEvent(false);
      setIsBookingConfirmationDialogOpen(false);
      setSelectedEventForDetails(null);
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
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl flex items-center justify-center">
          <CalendarSearch className="mr-4 h-10 w-10 text-primary" data-ai-hint="calendar search"/> The Chef's Wall
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground/70">
          Discover unique culinary events hosted by our talented chefs. Book your spot for an unforgettable experience!
        </p>
      </header>

      <Card className="mb-8 p-4 md:p-6 shadow-md sticky top-16 z-30 bg-background/90 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search events by title, chef, location, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </Card>

      {isLoading ? (
         <div className="text-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" data-ai-hint="loading spinner"/>
            <p className="text-lg text-muted-foreground">Loading chef events...</p>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map(event => (
            <Card key={event.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group">
              {event.imageUrl ? (
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  width={600}
                  height={300}
                  className="w-full h-56 object-cover group-hover:scale-105 transition-transform"
                  data-ai-hint={event.dataAiHint || "event food"}
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/600x300.png?text=Image+Error"; }}
                />
              ) : (
                <div className="w-full h-56 bg-muted flex items-center justify-center text-muted-foreground" data-ai-hint="event placeholder image">
                  <ImageIconLucide className="h-20 w-20 opacity-50" />
                </div>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-xl mb-1">{event.title}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground flex items-center">
                  <ChefHat className="h-4 w-4 mr-1.5 text-primary" data-ai-hint="chef hat"/> By Chef {event.chefName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm flex-grow">
                <p className="line-clamp-3 text-foreground/80">{event.description}</p>
                <div className="flex items-center text-muted-foreground"><CalendarClock className="mr-2 h-4 w-4 text-primary" data-ai-hint="calendar clock"/> {formatEventDateTimeForDisplay(event.eventDateTime)}</div>
                <div className="flex items-center text-muted-foreground"><MapPin className="mr-2 h-4 w-4 text-primary" data-ai-hint="location pin"/> {event.location}</div>
                <div className="flex items-center text-muted-foreground"><DollarSign className="mr-2 h-4 w-4 text-green-600" data-ai-hint="money dollar"/> ${event.pricePerPerson.toFixed(2)}/person</div>
                <div className="flex items-center text-muted-foreground"><Users className="mr-2 h-4 w-4 text-primary" data-ai-hint="users group"/> Up to {event.maxPax} guests</div>
                {event.tags && event.tags.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Tags:</h4>
                    <div className="flex flex-wrap gap-1">
                      {event.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                    </div>
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
        <div className="text-center py-16 col-span-full">
          <CalendarSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" data-ai-hint="empty search" />
          <h2 className="text-2xl font-semibold text-foreground">No Chef Events Found</h2>
          <p className="mt-2 text-muted-foreground">
            {searchTerm ? "No events match your current search. Try different keywords." : "There are currently no public events posted by chefs. Check back soon!"}
          </p>
        </div>
      )}

      {isEventDetailsDialogOpen && selectedEventForDetails && AlertDialogContent && AlertDialog && (
        <AlertDialog open={isEventDetailsDialogOpen} onOpenChange={setIsEventDetailsDialogOpen}>
          <AlertDialogContent className="sm:max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>{selectedEventForDetails?.title || "Event Details"}</AlertDialogTitle>
              {selectedEventForDetails?.imageUrl && (
                <div className="my-4 rounded-md overflow-hidden">
                  <Image src={selectedEventForDetails.imageUrl} alt={selectedEventForDetails.title} width={400} height={200} className="object-cover w-full" data-ai-hint={selectedEventForDetails.dataAiHint || "event food"}/>
                </div>
              )}
               {AlertDialogDescription && (
                <AlertDialogDescription className="text-left space-y-1 pt-2 text-sm">
                    <p><strong>Chef:</strong> {selectedEventForDetails?.chefName}</p>
                    <p><strong>Date & Time:</strong> {formatEventDateTimeForDisplay(selectedEventForDetails?.eventDateTime)}</p>
                    <p><strong>Location:</strong> {selectedEventForDetails?.location}</p>
                    <p><strong>Price:</strong> ${selectedEventForDetails?.pricePerPerson.toFixed(2)} per person</p>
                    <p><strong>Max Guests:</strong> {selectedEventForDetails?.maxPax}</p>
                    <p><strong>Description:</strong> {selectedEventForDetails?.description}</p>
                    {selectedEventForDetails?.tags && selectedEventForDetails.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1"><strong>Tags:</strong> {selectedEventForDetails.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}</div>
                    )}
                </AlertDialogDescription>
               )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
              <Button onClick={handleBookEventConfirmation} disabled={isBookingEvent}>
                {isBookingEvent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Book This Event
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      {isBookingConfirmationDialogOpen && selectedEventForDetails && AlertDialogContent && AlertDialog && (
        <AlertDialog open={isBookingConfirmationDialogOpen} onOpenChange={setIsBookingConfirmationDialogOpen}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Booking</AlertDialogTitle>
              {AlertDialogDescription && (
                <AlertDialogDescription className="text-left space-y-2 pt-2 text-sm">
                    <p>You are about to book the event:</p>
                    <p><strong>{selectedEventForDetails.title}</strong></p>
                    <p>with Chef {selectedEventForDetails.chefName}.</p>
                    <p>Price: <strong>${selectedEventForDetails.pricePerPerson.toFixed(2)} per person</strong>.</p>
                    <p className="text-xs text-muted-foreground"> (Note: Payment processing is simulated for this platform version.)</p>
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isBookingEvent}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmBooking} disabled={isBookingEvent}>
                {isBookingEvent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm & Book
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
