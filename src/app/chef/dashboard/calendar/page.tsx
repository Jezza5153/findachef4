
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CalendarEvent, ChefProfile } from '@/types';
import { format, parseISO, isSameDay, startOfDay } from 'date-fns';
import { CalendarDays, Users, DollarSign, MapPin, Utensils, Info, Sun, ChefHat, AlertTriangle, CheckCircle, Clock, QrCode, Ban, Loader2, InfoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp, collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function ChefCalendarPage() {
  const { user, userProfile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]); 
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [isLoadingCalendarData, setIsLoadingCalendarData] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setIsLoadingCalendarData(false);
      return;
    }

    setIsLoadingCalendarData(true);
    let unsubscribeUserProfile: (() => void) | undefined;
    let unsubscribeCalendarEvents: (() => void) | undefined;

    // Fetch blocked dates from user profile and listen for updates
    const userDocRef = doc(db, "users", user.uid);
    unsubscribeUserProfile = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data() as ChefProfile;
        if (userData.blockedDates) {
          setBlockedDates(userData.blockedDates.map(isoString => parseISO(isoString)));
        } else {
          setBlockedDates([]);
        }
      }
      // Consider setIsLoading to false only after both subscriptions are active or have failed
    }, (error) => {
      console.error("Error fetching user profile for blocked dates:", error);
      toast({ title: "Error", description: "Could not fetch blocked dates.", variant: "destructive" });
    });

    // Fetch calendar events and listen for updates
    const eventsCollectionRef = collection(db, `users/${user.uid}/calendarEvents`);
    const q = query(eventsCollectionRef, orderBy("date", "asc")); // Order by date
    
    unsubscribeCalendarEvents = onSnapshot(q, (querySnapshot) => {
      const fetchedEvents = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: (data.date as Timestamp).toDate(), // Convert Firestore Timestamp to Date
        } as CalendarEvent;
      });
      setAllEvents(fetchedEvents);
      setIsLoadingCalendarData(false); // Set loading to false after events are fetched
    }, (error) => {
      console.error("Error fetching calendar events:", error);
      toast({ title: "Error", description: "Could not fetch calendar events.", variant: "destructive" });
      setIsLoadingCalendarData(false);
    });
    
    return () => {
      if (unsubscribeUserProfile) unsubscribeUserProfile();
      if (unsubscribeCalendarEvents) unsubscribeCalendarEvents();
    };

  }, [user, toast]);

  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return allEvents.filter(event => isSameDay(event.date, selectedDate));
  }, [selectedDate, allEvents]);

  const isDateBlocked = useMemo(() => {
    if (!selectedDate) return false;
    const checkDate = startOfDay(selectedDate);
    return blockedDates.some(blockedDate => isSameDay(blockedDate, checkDate));
  }, [selectedDate, blockedDates]);

  const getStatusBadgeVariant = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'Confirmed': return 'default';
      case 'Pending': return 'secondary';
      case 'Cancelled': return 'destructive';
      case 'WallEvent': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'Confirmed': return <CheckCircle className="h-4 w-4 mr-1.5 text-green-600" />;
      case 'Pending': return <Clock className="h-4 w-4 mr-1.5 text-yellow-600" />;
      case 'Cancelled': return <AlertTriangle className="h-4 w-4 mr-1.5 text-red-600" />;
      case 'WallEvent': return <InfoIcon className="h-4 w-4 mr-1.5 text-blue-500" />;
      default: return <Info className="h-4 w-4 mr-1.5" />;
    }
  };

  const handleGoogleCalendarSync = () => {
    toast({
        title: "Google Calendar Sync (Placeholder)",
        description: "This feature is a placeholder. Real integration requires backend setup.",
    });
  };

  const handleProcessCompletion = (eventId: string) => {
    toast({
        title: "Process Event Completion (Placeholder)",
        description: `Action for event ${eventId} (e.g., QR Scan) initiated. This would trigger backend processes for fund release of the remaining 50%.`,
        duration: 7000,
    });
  };

  const handleToggleBlockDate = async () => {
    if (!user || !selectedDate) {
      toast({ title: "No Date Selected", description: "Please select a date to block or unblock.", variant: "destructive" });
      return;
    }
    const dateToToggle = startOfDay(selectedDate);
    const alreadyBlocked = blockedDates.some(d => isSameDay(d, dateToToggle));
    let newBlockedDatesIso: string[];
    
    if (alreadyBlocked) {
      newBlockedDatesIso = blockedDates
        .filter(d => !isSameDay(d, dateToToggle))
        .map(d => d.toISOString().split('T')[0]);
    } else {
      newBlockedDatesIso = [...blockedDates, dateToToggle]
        .map(d => d.toISOString().split('T')[0])
        .sort(); // Keep sorted for consistency
    }
    
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { blockedDates: newBlockedDatesIso });
      // No need to call setBlockedDates here, onSnapshot will update it
      toast({ 
        title: alreadyBlocked ? "Date Unblocked" : "Date Blocked", 
        description: `${format(dateToToggle, 'PPP')} is now ${alreadyBlocked ? 'available' : 'marked as unavailable.'}` 
      });
    } catch (error) {
      console.error("Error updating blocked dates:", error);
      toast({ title: "Update Error", description: "Could not update blocked status.", variant: "destructive"});
    }
  };

  if (isLoadingCalendarData) {
     return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading calendar data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center">
          <CalendarDays className="mr-3 h-8 w-8 text-primary" /> My Calendar & Events
        </h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleGoogleCalendarSync} variant="outline" className="text-sm">
              <svg className="fill-current w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/><path fill="none" d="M0 0h24v24H0z"/></svg>
              <span>Sync with Google Calendar</span>
          </Button>
          <p className="text-xs text-muted-foreground mt-2 sm:mt-0 self-center">Shared/Team calendars are coming soon!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 shadow-md">
          <CardHeader>
            <CardTitle>Select a Date</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              disabled={(date) => date < startOfDay(new Date(new Date().setDate(new Date().getDate() - 365))) || date > new Date(new Date().setDate(new Date().getDate() + 365*2))} 
              modifiers={{ blocked: blockedDates }}
              modifiersStyles={{ 
                blocked: { 
                  textDecoration: 'line-through', 
                  color: 'hsl(var(--destructive))', 
                  backgroundColor: 'hsl(var(--destructive) / 0.1)',
                  opacity: 0.6 
                } 
              }}
            />
            <Button onClick={handleToggleBlockDate} variant="outline" className="mt-4 w-full">
              <Ban className="mr-2 h-4 w-4"/>
              {isDateBlocked ? "Unblock Selected Date" : "Block Selected Date"}
            </Button>
             <p className="text-xs text-muted-foreground mt-2">Blocked dates will prevent new booking requests.</p>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-semibold">
            Events for: {selectedDate ? format(selectedDate, 'PPP') : 'No date selected'}
            {selectedDate && isDateBlocked && <Badge variant="destructive" className="ml-2">Date Blocked</Badge>}
          </h2>

          {selectedDate && isDateBlocked && eventsForSelectedDate.length === 0 && (
            <Card className="text-center py-12 border-dashed border-destructive/50 bg-destructive/5">
              <CardContent>
                <Ban className="mx-auto h-12 w-12 text-destructive mb-3" data-ai-hint="blocked warning" />
                <p className="text-destructive font-semibold">This date is marked as unavailable.</p>
                <p className="text-xs text-muted-foreground mt-1">You will not receive new requests for this date.</p>
              </CardContent>
            </Card>
          )}

          {eventsForSelectedDate.length > 0 ? (
            eventsForSelectedDate.map(event => (
              <Card key={event.id} className={`shadow-lg border-l-4 ${
                event.status === 'Confirmed' ? 'border-green-500' :
                event.status === 'Pending' ? 'border-yellow-500' :
                event.status === 'Cancelled' ? 'border-red-500' : 
                event.status === 'WallEvent' ? 'border-blue-500' : 'border-gray-300'
              }`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(event.status)} className="flex items-center">
                      {getStatusIcon(event.status)}
                      {event.status === 'WallEvent' ? 'My Wall Event' : event.status}
                    </Badge>
                  </div>
                  {event.customerName && <CardDescription>For: {event.customerName}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Users className="h-4 w-4 mr-2 text-primary" data-ai-hint="people group" />
                      PAX: <span className="font-medium text-foreground ml-1">{event.pax}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <DollarSign className="h-4 w-4 mr-2 text-green-600" data-ai-hint="money dollar" />
                      Price: <span className="font-medium text-foreground ml-1">${event.pricePerHead}/head</span>
                    </div>
                    <div className="flex items-center text-muted-foreground col-span-full sm:col-span-1">
                      <Utensils className="h-4 w-4 mr-2 text-primary" data-ai-hint="cutlery food" />
                      Menu: <span className="font-medium text-foreground ml-1">{event.menuName}</span>
                    </div>
                     {event.location && (
                      <div className="flex items-center text-muted-foreground col-span-full sm:col-span-1">
                        <MapPin className="h-4 w-4 mr-2 text-red-500" data-ai-hint="location map" />
                        Location: <span className="font-medium text-foreground ml-1">{event.location}</span>
                      </div>
                    )}
                  </div>

                  {event.notes && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-0.5 flex items-center"><Info className="h-3 w-3 mr-1"/>Notes:</h4>
                      <p className="text-sm bg-muted/50 p-2 rounded-md">{event.notes}</p>
                    </div>
                  )}

                  {event.coChefs && event.coChefs.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-0.5 flex items-center"><ChefHat className="h-3 w-3 mr-1"/>Co-Chefs:</h4>
                      <div className="flex flex-wrap gap-2">
                        {event.coChefs.map(chef => <Badge key={chef} variant="secondary">{chef}</Badge>)}
                      </div>
                    </div>
                  )}

                  {event.weather && (
                     <div className="text-xs text-muted-foreground flex items-center"><Sun className="h-3 w-3 mr-1 text-yellow-500" data-ai-hint="sun weather" />Weather: {event.weather}</div>
                  )}
                  {event.toolsNeeded && event.toolsNeeded.length > 0 && (
                     <div className="text-xs text-muted-foreground">Tools Checklist: {event.toolsNeeded.join(', ')}</div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col items-start space-y-2 pt-4 border-t">
                    {event.status === 'Confirmed' && !event.isWallEvent && ( // Only show QR for confirmed client bookings
                        <>
                            <p className="text-xs text-muted-foreground">
                                <strong>Event Completion:</strong> At the event, the customer will provide a QR code. Scan it to confirm completion and initiate the release of the remaining 50% of your funds. Remember to upload all related receipts.
                            </p>
                            <Button variant="outline" size="sm" onClick={() => handleProcessCompletion(event.id)} className="w-full sm:w-auto">
                                <QrCode className="mr-2 h-4 w-4" />
                                Scan Customer QR / Process Completion
                            </Button>
                        </>
                    )}
                    {(event.status === 'Confirmed' || event.status === 'Pending' || event.status === 'WallEvent') && (
                         <Button variant="link" size="sm" className="p-0 h-auto text-xs text-blue-500 hover:underline">View/Edit Details (Placeholder)</Button>
                    )}
                    {event.status === 'Cancelled' && (
                        <p className="text-xs text-destructive">This event has been cancelled.</p>
                    )}
                </CardFooter>
              </Card>
            ))
          ) : (
            selectedDate && !isDateBlocked && (
                <Card className="text-center py-12 border-dashed">
                <CardContent>
                    <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-3" data-ai-hint="calendar empty" />
                    <p className="text-muted-foreground">No events scheduled for this day.</p>
                    <p className="text-xs text-muted-foreground mt-1">Select another date to view events or manage your availability.</p>
                </CardContent>
                </Card>
            )
          )}
           {!selectedDate && (
                <Card className="text-center py-12 border-dashed">
                    <CardContent>
                        <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-3" data-ai-hint="calendar select"/>
                        <p className="text-muted-foreground">Please select a date to view events or manage availability.</p>
                    </CardContent>
                </Card>
           )}
        </div>
      </div>
    </div>
  );
}
