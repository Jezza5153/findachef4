
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CalendarEvent, ChefProfile, Booking } from '@/types';
import { format, parseISO, isSameDay, startOfDay } from 'date-fns';
import { CalendarDays, Users, DollarSign, MapPin, Utensils, Info, Sun, ChefHat, AlertTriangle, CheckCircle, Clock, Ban, Loader2, InfoIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, Timestamp, collection, query, orderBy, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import { Html5Qrcode } from 'html5-qrcode';
import { BookingInvoiceDialog } from '@/components/booking-invoice-dialog';

export default function ChefCalendarPage() {
  const { user, userProfile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [isLoadingCalendarData, setIsLoadingCalendarData] = useState(true);
  const [isEventDetailsDialogOpen, setIsEventDetailsDialogOpen] = useState(false);
  const [selectedEventForDialog, setSelectedEventForDialog] = useState<CalendarEvent | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const { toast } = useToast();

  const [isScanQrDialogOpen, setIsScanQrDialogOpen] = useState(false);
  const [scannedBookingIdInput, setScannedBookingIdInput] = useState('');
  const [eventToComplete, setEventToComplete] = useState<CalendarEvent | null>(null);
  const qrCodeRegionRef = useRef<HTMLDivElement>(null);
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);
  const [qrScannerError, setQrScannerError] = useState<string | null>(null);

  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<Booking | null>(null);
  const [isFetchingBookingForInvoice, setIsFetchingBookingForInvoice] = useState(false);


  useEffect(() => {
    if (!user) {
      setIsLoadingCalendarData(false);
      setAllEvents([]);
      setBlockedDates([]);
      return;
    }

    setIsLoadingCalendarData(true);
    let unsubscribeUserProfile: (() => void) | undefined;
    let unsubscribeCalendarEvents: (() => void) | undefined;

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
    }, (error) => {
      console.error("Error fetching user profile for blocked dates:", error);
      toast({ title: "Error", description: "Could not fetch blocked dates.", variant: "destructive" });
    });

    const eventsCollectionRef = collection(db, `users/${user.uid}/calendarEvents`);
    const q = query(eventsCollectionRef, orderBy("date", "asc"));

    unsubscribeCalendarEvents = onSnapshot(q, (querySnapshot) => {
      const fetchedEvents = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let eventDate = data.date;
        if (eventDate instanceof Timestamp) {
          eventDate = eventDate.toDate();
        } else if (typeof eventDate === 'string') {
          eventDate = parseISO(eventDate);
        } else if (eventDate && typeof eventDate.toDate === 'function') {
          eventDate = eventDate.toDate();
        } else if (!(eventDate instanceof Date)) {
          eventDate = new Date();
        }

        return {
          id: docSnap.id,
          ...data,
          date: eventDate,
          createdAt: data.createdAt ? (data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt as any)) : undefined,
          updatedAt: data.updatedAt ? (data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt as any)) : undefined,
        } as CalendarEvent;
      });
      setAllEvents(fetchedEvents);
      setIsLoadingCalendarData(false);
    }, (error) => {
      console.error("Error fetching calendar events:", error);
      toast({ title: "Error", description: "Could not fetch calendar events.", variant: "destructive" });
      setIsLoadingCalendarData(false);
    });

    return () => {
      if (unsubscribeUserProfile) unsubscribeUserProfile();
      if (unsubscribeCalendarEvents) unsubscribeCalendarEvents();
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error("Error stopping QR scanner on unmount:", err));
      }
    };

  }, [user, toast, html5QrCode]);


  useEffect(() => {
    if (isScanQrDialogOpen && qrCodeRegionRef.current && !html5QrCode?.isScanning) {
      const newHtml5QrCode = new Html5Qrcode("qr-reader");
      setHtml5QrCode(newHtml5QrCode);
      setQrScannerError(null);

      const qrCodeSuccessCallback = (decodedText: string, decodedResult: any) => {
        console.log(`QR Code detected: ${decodedText}`, decodedResult);
        stopQrScannerAndProcess(decodedText);
      };

      const qrCodeErrorCallback = (errorMessage: string) => {
        // console.warn(`QR Code no longer in sight or error: ${errorMessage}`);
        // We can ignore "QR code not found" as it's common
      };

      newHtml5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      ).catch(err => {
        console.error("Unable to start QR scanning.", err);
        setQrScannerError("Failed to start camera. Please check permissions and try again.");
        toast({
          title: "QR Scan Error",
          description: "Could not start QR scanner. Ensure camera permissions are granted.",
          variant: "destructive"
        });
      });
    } else if (!isScanQrDialogOpen && html5QrCode && html5QrCode.isScanning) {
      html5QrCode.stop().catch(err => console.error("Error stopping QR scanner:", err));
    }
  }, [isScanQrDialogOpen, html5QrCode]);


  const stopQrScannerAndProcess = (decodedBookingId: string) => {
    if (html5QrCode && html5QrCode.isScanning) {
      html5QrCode.stop().catch(err => console.error("Error stopping QR scanner after scan:", err));
    }
    setIsScanQrDialogOpen(false);

    if (eventToComplete && decodedBookingId === eventToComplete.id) {
      handleProcessCompletion(eventToComplete);
    } else {
      toast({
        title: "QR Code Mismatch",
        description: "The scanned QR code does not match the selected event's Booking ID. Please try again.",
        variant: "destructive",
        duration: 7000,
      });
    }
    setEventToComplete(null);
  };


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
      case 'Completed': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'Confirmed': return <CheckCircle className="h-4 w-4 mr-1.5 text-green-600" />;
      case 'Pending': return <Clock className="h-4 w-4 mr-1.5 text-yellow-600" />;
      case 'Cancelled': return <AlertTriangle className="h-4 w-4 mr-1.5 text-red-600" />;
      case 'WallEvent': return <InfoIcon className="h-4 w-4 mr-1.5 text-blue-500" />;
      case 'Completed': return <CheckCircle className="h-4 w-4 mr-1.5 text-green-700" />;
      default: return <Info className="h-4 w-4 mr-1.5" />;
    }
  };

  const handleGoogleCalendarSync = () => {
    toast({
        title: "Google Calendar Sync (Placeholder)",
        description: "This feature is a placeholder. Real integration requires backend setup and Google API integration.",
    });
  };

  const openScanQrDialog = (event: CalendarEvent) => {
    if (html5QrCode && html5QrCode.isScanning) {
      html5QrCode.stop().catch(err => console.error("Error stopping QR scanner before new scan:", err));
    }
    setEventToComplete(event);
    setScannedBookingIdInput(''); // Clear previous input
    setIsScanQrDialogOpen(true);
  };

  const handleProcessCompletion = async (calendarEvent: CalendarEvent) => {
    if (!user || !calendarEvent) {
      toast({ title: "Error", description: "Booking ID is required.", variant: "destructive" });
      return;
    }

    setIsProcessingAction(true);
    toast({
        title: "Processing Event Completion...",
        description: `Marking event ${calendarEvent.id.substring(0,6)}... as complete.`,
    });

    try {
      const batch = writeBatch(db);
      const bookingDocRef = doc(db, "bookings", calendarEvent.id);
      batch.update(bookingDocRef, {
        status: 'completed',
        qrCodeScannedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const calendarEventDocRef = doc(db, `users/${user.uid}/calendarEvents`, calendarEvent.id);
      batch.update(calendarEventDocRef, {
        status: 'Completed',
        updatedAt: serverTimestamp()
      });

      await batch.commit();

      toast({
          title: "Event Marked as Complete!",
          description: `Event ${calendarEvent.id.substring(0,6)}... status updated. Final payout process initiated (simulated).`,
          duration: 7000,
      });
      setIsScanQrDialogOpen(false);
      setEventToComplete(null);
    } catch (error) {
      console.error("Error processing event completion:", error);
      toast({
        title: "Error",
        description: "Could not mark event as complete. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleToggleBlockDate = async () => {
    if (!user || !selectedDate) {
      toast({ title: "No Date Selected", description: "Please select a date to block or unblock.", variant: "destructive" });
      return;
    }
    setIsProcessingAction(true);
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
        .sort();
    }

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { blockedDates: newBlockedDatesIso, updatedAt: serverTimestamp() });
      toast({
        title: alreadyBlocked ? "Date Unblocked" : "Date Blocked",
        description: `${format(dateToToggle, 'PPP')} is now ${alreadyBlocked ? 'available' : 'marked as unavailable.'}`
      });
    } catch (error) {
      console.error("Error updating blocked dates:", error);
      toast({ title: "Update Error", description: "Could not update blocked status.", variant: "destructive"});
    } finally {
      setIsProcessingAction(false);
    }
  };

  const openEventDetailsDialog = (event: CalendarEvent) => {
    setSelectedEventForDialog(event);
    setIsEventDetailsDialogOpen(true);
  };

  const handleViewBookingInvoice = async (calendarEvent: CalendarEvent) => {
    setIsFetchingBookingForInvoice(true);
    setIsInvoiceDialogOpen(true);
    setSelectedBookingForInvoice(null); // Clear previous
    try {
      const bookingDocRef = doc(db, "bookings", calendarEvent.id);
      const bookingSnap = await getDoc(bookingDocRef);
      if (bookingSnap.exists()) {
        const bookingData = bookingSnap.data() as Omit<Booking, 'id'>;
        setSelectedBookingForInvoice({ id: bookingSnap.id, ...bookingData } as Booking);
      } else {
        toast({ title: "Error", description: "Booking details not found for this event.", variant: "destructive" });
        setIsInvoiceDialogOpen(false);
      }
    } catch (error) {
      console.error("Error fetching booking for invoice:", error);
      toast({ title: "Error", description: "Could not load booking details.", variant: "destructive" });
      setIsInvoiceDialogOpen(false);
    } finally {
      setIsFetchingBookingForInvoice(false);
    }
  };


  if (isLoadingCalendarData) {
     return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-ai-hint="loading spinner" />
        <p className="ml-2">Loading calendar data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center">
          <CalendarDays className="mr-3 h-8 w-8 text-primary" data-ai-hint="calendar icon" /> My Calendar &amp; Events
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
            <Button onClick={handleToggleBlockDate} variant="outline" className="mt-4 w-full" disabled={isProcessingAction}>
              {isProcessingAction && selectedDate && blockedDates.some(d => isSameDay(d, selectedDate)) ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Ban className="mr-2 h-4 w-4"/>}
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
                event.status === 'WallEvent' ? 'border-blue-500' :
                event.status === 'Completed' ? 'border-green-700' :
                'border-gray-300'
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
                    {event.status === 'Confirmed' && !event.isWallEvent && (
                        <>
                            <p className="text-xs text-muted-foreground">
                                <strong>Event Completion:</strong> Customer will provide a QR code with a Booking ID. Scan it to confirm completion and initiate the release of the remaining 50% of your funds.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openScanQrDialog(event)}
                                className="w-full sm:w-auto"
                                disabled={isProcessingAction}
                            >
                                {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-qr-code mr-2 h-4 w-4"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h.01"/><path d="M21 12v.01"/><path d="M12 21v-3a2 2 0 0 0-2-2H7"/><path d="M7 21h3a2 2 0 0 0 2-2v-3"/><path d="M16 7h3a2 2 0 0 1 2 2v3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>}
                                Scan Customer QR / Complete Event
                            </Button>
                        </>
                    )}
                     <div className="flex flex-wrap gap-2 w-full pt-2 border-t mt-2">
                        <Button variant="outline" size="sm" onClick={() => openEventDetailsDialog(event)} className="flex-1 min-w-[150px]">
                          View Event Details
                        </Button>
                        {(event.status === 'Confirmed' || event.status === 'Completed') && !event.isWallEvent && (
                            <Button variant="outline" size="sm" onClick={() => handleViewBookingInvoice(event)} className="flex-1 min-w-[150px]">
                                <FileText className="mr-2 h-4 w-4" /> View Invoice
                            </Button>
                        )}
                    </div>
                    {event.status === 'Cancelled' && (
                        <p className="text-xs text-destructive">This event has been cancelled.</p>
                    )}
                    {event.status === 'Completed' && (
                        <p className="text-xs text-green-700 font-medium">This event has been marked as completed.</p>
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

      <AlertDialog open={isEventDetailsDialogOpen} onOpenChange={setIsEventDetailsDialogOpen}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{selectedEventForDialog?.title || "Event Details"}</AlertDialogTitle>
          </AlertDialogHeader>
            {selectedEventForDialog ? (
              <div className="space-y-3 text-sm max-h-[60vh] overflow-y-auto p-1">
                <p><strong>Date:</strong> {selectedEventForDialog.date ? format(selectedEventForDialog.date, 'PPP p') : 'N/A'}</p>
                <p><strong>Status:</strong> <Badge variant={getStatusBadgeVariant(selectedEventForDialog.status)}>{selectedEventForDialog.status === 'WallEvent' ? 'My Wall Event' : selectedEventForDialog.status}</Badge></p>
                {selectedEventForDialog.customerName && <p><strong>Customer:</strong> {selectedEventForDialog.customerName}</p>}
                <p><strong>PAX:</strong> {selectedEventForDialog.pax}</p>
                <p><strong>Menu:</strong> {selectedEventForDialog.menuName}</p>
                <p><strong>Price:</strong> ${selectedEventForDialog.pricePerHead}/head</p>
                {selectedEventForDialog.location && <p><strong>Location:</strong> {selectedEventForDialog.location}</p>}
                {selectedEventForDialog.notes && <p><strong>Notes:</strong> {selectedEventForDialog.notes}</p>}
                {selectedEventForDialog.coChefs && selectedEventForDialog.coChefs.length > 0 && (
                    <p><strong>Co-Chefs:</strong> {selectedEventForDialog.coChefs.join(', ')}</p>
                )}
                {selectedEventForDialog.weather && <p><strong>Weather Forecast:</strong> {selectedEventForDialog.weather}</p>}
                {selectedEventForDialog.toolsNeeded && selectedEventForDialog.toolsNeeded.length > 0 && (
                     <p><strong>Tools Needed:</strong> {selectedEventForDialog.toolsNeeded.join(', ')}</p>
                )}
                 <p className="text-xs text-muted-foreground pt-2 border-t">Event ID: {selectedEventForDialog.id}</p>
              </div>
            ) : (
              <AlertDialogDescription>Loading event details...</AlertDialogDescription>
            )}
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isScanQrDialogOpen} onOpenChange={setIsScanQrDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Scan Customer QR Code</AlertDialogTitle>
            <AlertDialogDescription>
                Point the camera at the customer's QR code. The booking ID will be automatically detected.
                Alternatively, if scanning fails, you can manually enter the Booking ID below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div id="qr-reader" ref={qrCodeRegionRef} className="w-full aspect-square bg-muted rounded-md my-2">
            {qrScannerError && <p className="text-destructive text-sm p-2">{qrScannerError}</p>}
          </div>
           <div className="space-y-2 mt-2">
            <Label htmlFor="bookingIdInputManual">Manual Booking ID Entry (if scan fails)</Label>
            <Input
              id="bookingIdInputManual"
              placeholder="Enter Booking ID from customer"
              value={scannedBookingIdInput}
              onChange={(e) => setScannedBookingIdInput(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(err => console.error("Error stopping scanner on cancel:", err));
              }
              setEventToComplete(null);
              setIsScanQrDialogOpen(false);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={() => stopQrScannerAndProcess(scannedBookingIdInput)} 
                disabled={isProcessingAction || !scannedBookingIdInput.trim()}
            >
              {isProcessingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm with Entered ID
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BookingInvoiceDialog 
        isOpen={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        booking={selectedBookingForInvoice}
        customerName={selectedBookingForInvoice?.customerName || userProfile?.name || 'Customer'}
      />
    </div>
  );
}

    