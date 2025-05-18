
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { Booking } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { CalendarCheck2, Users, DollarSign, QrCode, Info, Loader2, ChefHat, MapPin, FileText, MessageSquare, XCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { BookingInvoiceDialog } from '@/components/booking-invoice-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as ShadAlertDialogDescription, // Renamed to avoid conflict
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CustomerBookedEventsPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [bookedEvents, setBookedEvents] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [selectedBookingForInvoice, setSelectedBookingForInvoice] = useState<Booking | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setBookedEvents([]);
      return;
    }
    setIsLoading(true);
    const bookingsCollectionRef = collection(db, 'bookings');
    const q = query(
      bookingsCollectionRef,
      where('customerId', '==', user.uid),
      orderBy('eventDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedEvents = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          eventDate: data.eventDate instanceof Timestamp ? data.eventDate.toDate() : new Date(data.eventDate as any),
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt as any),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt as any) : undefined),
          qrCodeScannedAt: data.qrCodeScannedAt instanceof Timestamp ? data.qrCodeScannedAt.toDate() : (data.qrCodeScannedAt ? new Date(data.qrCodeScannedAt as any) : undefined),
        } as Booking;
      });
      setBookedEvents(fetchedEvents);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching booked events:', error);
      toast({
        title: "Error Loading Bookings",
        description: "Could not fetch your booked events.",
        variant: "destructive",
      });
      setBookedEvents([]);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const getStatusVariant = (status?: Booking['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (!status) return 'outline';
    switch (status) {
      case 'confirmed': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled_by_customer':
      case 'cancelled_by_chef':
      case 'payment_failed':
        return 'destructive';
      case 'pending_payment': return 'outline';
      default: return 'outline';
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!user) return;
    const bookingToCancel = bookedEvents.find(b => b.id === bookingId);
    if (!bookingToCancel) {
      toast({ title: "Error", description: "Booking not found.", variant: "destructive" });
      return;
    }
    // Check if cancellation is allowed based on status and potentially event date
    if (bookingToCancel.status !== 'confirmed') {
      toast({ title: "Cancellation Not Allowed", description: "This booking cannot be cancelled at its current stage.", variant: "destructive" });
      return;
    }
    // Add logic for date-based cancellation policy if needed (e.g., no cancellations within 24h)

    setIsCancelling(bookingId);
    try {
      const bookingDocRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingDocRef, {
        status: 'cancelled_by_customer',
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Booking Cancelled",
        description: `Your booking for "${bookingToCancel.eventTitle}" has been cancelled.`,
      });
      // The UI will update via onSnapshot
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast({ title: "Error", description: "Could not cancel booking. Please try again.", variant: "destructive" });
    } finally {
      setIsCancelling(null);
    }
  };

  const handleViewInvoice = (booking: Booking) => {
    setSelectedBookingForInvoice(booking);
    setIsInvoiceDialogOpen(true);
  };

  const handleMessageChef = (booking: Booking) => {
    if (booking.requestId) {
      router.push(`/customer/dashboard/messages?requestId=${booking.requestId}`);
    } else {
      toast({
        title: "Messaging Not Available",
        description: "Direct messaging for this type of booking is not yet fully integrated.",
        variant: "default",
      });
    }
  };

  const isCancellable = (status?: Booking['status']) => {
    return status === 'confirmed'; // Simple rule for now
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-ai-hint="loading spinner" />
        <p className="ml-2">Loading your booked events...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center">
          <CalendarCheck2 className="mr-3 h-8 w-8 text-primary" data-ai-hint="calendar check" /> My Booked Events
        </h1>
      </div>

      {bookedEvents.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
           <CardHeader>
            <CalendarCheck2 className="mx-auto h-12 w-12 text-muted-foreground mb-3" data-ai-hint="calendar empty"/>
            <CardTitle>No Booked Events Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You haven't booked any events. Time to explore!</p>
            <div className="space-x-2">
                <Button asChild><Link href="/customer/menus">Browse Chef Menus</Link></Button>
                <Button variant="outline" asChild><Link href="/customer/wall">Discover Chef Events</Link></Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookedEvents.map((booking) => (
            <Card key={booking.id} className="shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{booking.eventTitle}</CardTitle>
                  <Badge variant={getStatusVariant(booking.status)} className="capitalize">
                    {booking.status?.replace(/_/g, ' ') || 'Unknown'}
                  </Badge>
                </div>
                {booking.chefName && (
                  <CardDescription className="flex items-center text-sm">
                    {booking.chefAvatarUrl ? (
                       <Image src={booking.chefAvatarUrl} alt={booking.chefName} width={24} height={24} className="rounded-full mr-2 object-cover" data-ai-hint="chef portrait"/>
                    ) : (
                       <ChefHat className="h-4 w-4 mr-2 text-muted-foreground" data-ai-hint="chef hat" />
                    )}
                     With Chef {booking.chefName}
                  </CardDescription>
                )}
                 {booking.menuTitle && <p className="text-xs text-muted-foreground">Menu: {booking.menuTitle}</p>}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <CalendarCheck2 className="h-4 w-4 mr-2 text-primary" data-ai-hint="calendar event" />
                  Date: <span className="font-medium text-foreground ml-1">{booking.eventDate ? format(new Date(booking.eventDate as any), 'PPpp') : 'Date TBD'}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Users className="h-4 w-4 mr-2 text-primary" data-ai-hint="people group" />
                  Guests: <span className="font-medium text-foreground ml-1">{booking.pax}</span>
                </div>
                 {booking.location && (
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2 text-primary" data-ai-hint="location map" />
                    Location: <span className="font-medium text-foreground ml-1">{booking.location}</span>
                  </div>
                )}
                <div className="flex items-center text-muted-foreground">
                  <DollarSign className="h-4 w-4 mr-2 text-green-600" data-ai-hint="money dollar" />
                  Total Price: <span className="font-medium text-foreground ml-1">${booking.totalPrice.toFixed(2)}</span>
                </div>
                
                {booking.status === 'confirmed' && !booking.qrCodeScannedAt && (
                  <Alert variant="default" className="mt-4 bg-blue-500/10 border-blue-500/30">
                     <QrCode className="h-5 w-5 text-blue-600" data-ai-hint="qr code" />
                    <AlertTitle className="text-blue-700 font-semibold">Event Completion QR Code</AlertTitle>
                    <ShadAlertDialogDescription className="text-blue-600 text-xs space-y-1">
                      <p>On the day of your event, show this QR code area and the Booking ID below to your chef. They will scan it or enter the ID to confirm completion.</p>
                      <div className="flex flex-col items-center justify-center p-2 bg-white rounded-md my-2 shadow">
                        <QRCodeSVG value={booking.id} size={120} bgColor={"#ffffff"} fgColor={"#000000"} level={"L"} />
                        <p className="text-xs font-mono mt-1.5 text-black">Booking ID: <span className="font-bold">{booking.id}</span></p>
                      </div>
                    </ShadAlertDialogDescription>
                  </Alert>
                )}
                {booking.status === 'completed' && booking.qrCodeScannedAt && (
                    <p className="text-xs text-green-700 flex items-center"><Info className="h-3 w-3 mr-1" data-ai-hint="information circle" />Event marked complete on {format(new Date(booking.qrCodeScannedAt as any), 'PP')}.</p>
                )}
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t space-y-2 sm:space-y-0 sm:gap-2">
                <Button variant="outline" size="sm" onClick={() => handleMessageChef(booking)} className="w-full sm:w-auto">
                    <MessageSquare className="mr-2 h-4 w-4"/> Message Chef
                </Button>
                <div className="flex space-x-2 w-full sm:w-auto">
                    {isCancellable(booking.status) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button 
                            variant="destructive" 
                            size="sm" 
                            disabled={isCancelling === booking.id}
                            className="flex-1 sm:flex-none"
                          >
                            {isCancelling === booking.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4"/>}
                            Cancel Booking
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <ShadAlertDialogDescription>
                              Are you sure you want to cancel this booking for "{booking.eventTitle}"? 
                              Please review our cancellation policy in the Terms of Service.
                            </ShadAlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancelBooking(booking.id)} className="bg-destructive hover:bg-destructive/90">
                              Yes, Cancel Booking
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {(booking.status === 'completed' || booking.status === 'confirmed') && (
                         <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 h-auto text-xs flex-1 sm:flex-none justify-center" 
                            onClick={() => handleViewInvoice(booking)}
                        >
                            <FileText className="mr-1 h-4 w-4"/> View Confirmation / Invoice
                         </Button>
                    )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
       <Alert className="mt-8">
          <Info className="h-4 w-4" data-ai-hint="information circle" />
          <AlertTitle>Booking Information</AlertTitle>
          <ShadAlertDialogDescription className="text-xs">
            This page shows your confirmed and past events. If you've just made a request or a chef has sent a proposal,
            check your <Link href="/customer/dashboard/messages" className="underline hover:text-primary">Messages</Link> for updates.
            Bookings are finalized after payment and mutual confirmation.
            Cancellation policies apply as per our <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link>.
          </ShadAlertDialogDescription>
        </Alert>

        <BookingInvoiceDialog 
            isOpen={isInvoiceDialogOpen}
            onOpenChange={setIsInvoiceDialogOpen}
            booking={selectedBookingForInvoice}
            customerName={userProfile?.name || user?.displayName || 'Valued Customer'}
        />
    </div>
  );
}
