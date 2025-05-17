
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarSearch, Users, DollarSign, MapPin, Utensils, Search, InfoIcon, Loader2, CalendarClock, ChefHat } from 'lucide-react';
import Image from 'next/image';
import type { ChefWallEvent } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function CustomerWallPage() {
  const [allEvents, setAllEvents] = useState<ChefWallEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
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
        const fetchedEvents = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Ensure eventDateTime is a string; convert if it's a Timestamp
            eventDateTime: data.eventDateTime instanceof Timestamp ? data.eventDateTime.toDate().toISOString() : data.eventDateTime,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,

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
  }, [toast]);

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

  const formatEventDateTimeForDisplay = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
      return dateTimeString; 
    }
  };
  
  const handleViewEventDetails = (eventId: string) => {
    // Placeholder: In a real app, this would navigate to a detailed event page
    // or open a modal with more information and registration options.
    toast({
      title: "View Event Details (Placeholder)",
      description: `Further details and registration for event ${eventId.substring(0,6)}... would be shown here.`,
    });
  };


  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">Loading chef events...</p>
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
        {/* Placeholder for more advanced tag filtering */}
        {/* <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground">Filter by tags:</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button variant="outline" size="sm">Italian</Button>
            <Button variant="outline" size="sm">Vegan</Button>
            <Button variant="outline" size="sm">Pop-Up</Button>
          </div>
        </div> */}
      </Card>

      {filteredEvents.length > 0 ? (
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
                <div className="w-full h-56 bg-muted flex items-center justify-center text-muted-foreground" data-ai-hint="event placeholder">
                  <CalendarSearch className="h-20 w-20 opacity-50" />
                </div>
              )}
              <CardHeader className="pb-3">
                <CardTitle className="text-xl mb-1">{event.title}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground flex items-center">
                  <ChefHat className="h-4 w-4 mr-1.5 text-primary" /> By Chef {event.chefName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm flex-grow">
                <p className="line-clamp-3 text-foreground/80">{event.description}</p>
                <div className="flex items-center text-muted-foreground"><CalendarClock className="mr-2 h-4 w-4 text-primary" /> {formatEventDateTimeForDisplay(event.eventDateTime)}</div>
                <div className="flex items-center text-muted-foreground"><MapPin className="mr-2 h-4 w-4 text-primary" /> {event.location}</div>
                <div className="flex items-center text-muted-foreground"><DollarSign className="mr-2 h-4 w-4 text-green-600" /> ${event.pricePerPerson}/person</div>
                <div className="flex items-center text-muted-foreground"><Users className="mr-2 h-4 w-4 text-primary" /> Up to {event.maxPax} guests</div>
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
                <Button className="w-full" onClick={() => handleViewEventDetails(event.id)}>
                  View Details & Book
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 col-span-full">
          <CalendarSearch className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">No Chef Events Found</h2>
          <p className="mt-2 text-muted-foreground">
            {searchTerm ? "No events match your current search. Try different keywords." : "There are currently no public events posted by chefs. Check back soon!"}
          </p>
        </div>
      )}
    </div>
  );
}

