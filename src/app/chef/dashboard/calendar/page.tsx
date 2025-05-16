
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CalendarEvent } from '@/types';
import { format, parseISO, isSameDay, startOfDay } from 'date-fns';
import { CalendarDays, Users, DollarSign, MapPin, Utensils, Info, Sun, ChefHat, AlertTriangle, CheckCircle, Clock, QrCode, Ban } from 'lucide-react';
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

// Mock initial events
const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: 'event1',
    date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0], // 2 days from now
    title: 'Corporate Lunch Catering',
    customerName: 'Tech Solutions Inc.',
    pax: 50,
    menuName: 'Gourmet Sandwich Platter',
    pricePerHead: 35,
    location: '123 Business Park, Suite 100',
    notes: 'Ensure vegetarian options are clearly marked. 2 gluten-free meals needed.',
    coChefs: ['Chef John Doe', 'Chef Assistant Jane'],
    status: 'Confirmed',
    weather: 'Sunny, 22°C (Weather data is a placeholder)',
    toolsNeeded: ['Serving platters', 'Chafing dishes', 'Cooler boxes (Placeholder)'],
  },
  {
    id: 'event2',
    date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], // 7 days from now
    title: 'Anniversary Dinner for Two',
    customerName: 'Mr. & Mrs. Smith',
    pax: 2,
    menuName: 'Luxury Seafood Menu',
    pricePerHead: 150,
    location: 'Client\'s Residence - 456 Ocean View Dr.',
    notes: 'Surprise dessert with "Happy Anniversary" message.',
    status: 'Confirmed',
    weather: 'Clear night, 18°C (Weather data is a placeholder)',
    coChefs: [],
  },
  {
    id: 'event3',
    date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], // Another event on the same day
    title: 'Kids Birthday Party',
    customerName: 'Jane Doe (for Leo)',
    pax: 15,
    menuName: 'Fun & Healthy Kids Menu',
    pricePerHead: 25,
    location: 'Community Park Pavilion',
    notes: 'Nut-free. Include a small birthday cake.',
    status: 'Pending',
    coChefs: [],
  },
   {
    id: 'event4',
    date: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString().split('T')[0], // 10 days from now
    title: 'Private Cooking Class',
    customerName: 'Maria Rodriguez',
    pax: 4,
    menuName: 'Italian Pasta Making',
    pricePerHead: 75,
    location: 'Chef\'s Studio',
    notes: 'Focus on hands-on experience. All ingredients provided by chef.',
    status: 'Confirmed',
    toolsNeeded: ['Pasta machine', 'Aprons', 'Ingredients checklist (Placeholder)'],
    coChefs: ['Chef Luigi'],
  },
  {
    id: 'event5',
    date: new Date(new Date().setDate(new Date().getDate() + 12)).toISOString().split('T')[0],
    title: 'Cancelled Event Example',
    customerName: 'Old Booking',
    pax: 10,
    menuName: 'Standard Buffet',
    pricePerHead: 40,
    location: 'Previous Venue',
    status: 'Cancelled',
    coChefs: [],
  },
];


export default function ChefCalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>(MOCK_EVENTS); 
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const { toast } = useToast();

  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return allEvents.filter(event => isSameDay(parseISO(event.date), selectedDate));
  }, [selectedDate, allEvents]);

  const isDateBlocked = useMemo(() => {
    if (!selectedDate) return false;
    return blockedDates.some(blockedDate => isSameDay(blockedDate, selectedDate));
  }, [selectedDate, blockedDates]);

  const getStatusBadgeVariant = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'Confirmed': return 'default';
      case 'Pending': return 'secondary';
      case 'Cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'Confirmed': return <CheckCircle className="h-4 w-4 mr-1.5 text-green-600" />;
      case 'Pending': return <Clock className="h-4 w-4 mr-1.5 text-yellow-600" />;
      case 'Cancelled': return <AlertTriangle className="h-4 w-4 mr-1.5 text-red-600" />;
      default: return <Info className="h-4 w-4 mr-1.5" />;
    }
  };

  const handleGoogleCalendarSync = () => {
    toast({
        title: "Google Calendar Sync",
        description: "This feature is a placeholder. Real integration requires backend setup.",
    });
  };

  const handleProcessCompletion = (eventId: string) => {
    toast({
        title: "Process Event Completion",
        description: `Action for event ${eventId} (e.g., QR Scan) initiated. This would trigger backend processes for fund release.`,
        duration: 7000,
    });
  };

  const handleToggleBlockDate = () => {
    if (!selectedDate) {
      toast({ title: "No Date Selected", description: "Please select a date to block or unblock.", variant: "destructive" });
      return;
    }
    const dateToToggle = startOfDay(selectedDate);
    const alreadyBlocked = blockedDates.some(d => isSameDay(d, dateToToggle));

    if (alreadyBlocked) {
      setBlockedDates(prev => prev.filter(d => !isSameDay(d, dateToToggle)));
      toast({ title: "Date Unblocked", description: `${format(dateToToggle, 'PPP')} is now available.` });
    } else {
      setBlockedDates(prev => [...prev, dateToToggle]);
      toast({ title: "Date Blocked", description: `${format(dateToToggle, 'PPP')} is now marked as unavailable.` });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center">
          <CalendarDays className="mr-3 h-8 w-8 text-primary" /> My Calendar & Events
        </h1>
        <Button
            onClick={handleGoogleCalendarSync}
            variant="outline"
            className="text-sm"
        >
            <svg className="fill-current w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/><path fill="none" d="M0 0h24v24H0z"/></svg>
            <span>Sync with Google Calendar</span>
        </Button>
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
              disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 365)) || date > new Date(new Date().setDate(new Date().getDate() + 365*2))} // Example: 1 year past, 2 years future
              modifiers={{ blocked: blockedDates }}
              modifiersStyles={{ blocked: { textDecoration: 'line-through', color: 'hsl(var(--destructive))', opacity: 0.6 } }}
            />
            <Button onClick={handleToggleBlockDate} variant="outline" className="mt-4 w-full">
              <Ban className="mr-2 h-4 w-4"/>
              {isDateBlocked ? "Unblock Selected Date" : "Block Selected Date"}
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-semibold">
            Events for: {selectedDate ? format(selectedDate, 'PPP') : 'No date selected'}
            {isDateBlocked && <Badge variant="destructive" className="ml-2">Date Blocked</Badge>}
          </h2>

          {isDateBlocked && eventsForSelectedDate.length === 0 && (
            <Card className="text-center py-12 border-dashed border-destructive/50">
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
                event.status === 'Cancelled' ? 'border-red-500' : 'border-gray-300'
              }`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(event.status)} className="flex items-center">
                      {getStatusIcon(event.status)}
                      {event.status}
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
                    {event.status === 'Confirmed' && (
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
                    {(event.status === 'Confirmed' || event.status === 'Pending') && (
                         <Button variant="link" size="sm" className="p-0 h-auto text-xs text-blue-500 hover:underline">View/Edit Details (Placeholder)</Button>
                    )}
                    {event.status === 'Cancelled' && (
                        <p className="text-xs text-destructive">This event has been cancelled.</p>
                    )}
                </CardFooter>
              </Card>
            ))
          ) : (
            !isDateBlocked && (
                <Card className="text-center py-12 border-dashed">
                <CardContent>
                    <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground mb-3" data-ai-hint="calendar empty" />
                    <p className="text-muted-foreground">No events scheduled for this day.</p>
                    <p className="text-xs text-muted-foreground mt-1">Select another date to view events.</p>
                </CardContent>
                </Card>
            )
          )}
        </div>
      </div>
    </div>
  );
}
