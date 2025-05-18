
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { Booking } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { CalendarCheck2, Users, DollarSign, QrCode, Info, Loader2, ChefHat, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function CustomerBookedEventsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [bookedEvents, setBookedEvents] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleCancelBooking = (bookingId: string) => {
    toast({
        title: "Cancel Booking (Placeholder)",
        description: `Cancelling booking ${bookingId.substring(0,6)}... requires backend logic and policy enforcement.`,
        variant: "default"
    });
  };

  const handleViewReceipts = (bookingId: string) => {
     toast({
        title: "View Receipts/Invoice (Placeholder)",
        description: `Functionality to view invoice for booking ${bookingId.substring(0,6)}... is coming soon.`,
        variant: "default"
    });
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
                    {booking.status.replace(/_/g, ' ')}
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
                  Date: <span className="font-medium text-foreground ml-1">{booking.eventDate ? format(booking.eventDate, 'PPpp') : 'Date TBD'}</span>
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
                    <AlertDescription className="text-blue-600 text-xs space-y-1">
                      <p>On the day of your event, show this QR code area and the Booking ID below to your chef. They will scan it (or enter the ID) to confirm completion.</p>
                      <div className="flex flex-col items-center justify-center p-2 bg-white rounded-md my-2">
                        <Image src="https://placehold.co/150x150.png?text=SCAN+ME" alt="QR Code Placeholder" width={120} height={120} data-ai-hint="qr code scan" />
                        <p className="text-xs font-mono mt-1 text-black">Booking ID: <span className="font-bold">{booking.id}</span></p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                {booking.status === 'completed' && booking.qrCodeScannedAt && (
                    <p className="text-xs text-green-600 flex items-center"><Info className="h-3 w-3 mr-1" data-ai-hint="information circle" />Event marked complete on {format(booking.qrCodeScannedAt, 'PP')}.</p>
                )}

              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t space-y-2 sm:space-y-0">
                <Button variant="outline" size="sm" onClick={() => handleMessageChef(booking)}>
                    Message Chef
                </Button>
                <div className="flex space-x-2">
                    {booking.status === 'confirmed' && (
                        <Button variant="destructive" size="sm" onClick={() => handleCancelBooking(booking.id)}>
                            Cancel Booking
                        </Button>
                    )}
                    {(booking.status === 'completed' || booking.status === 'confirmed') && (
                         <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleViewReceipts(booking.id)}>
                            View Related Receipts/Invoice
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
          <AlertDescription className="text-xs">
            This page shows your confirmed and past events. If you've just made a request or a chef has sent a proposal,
            check your <Link href="/customer/dashboard/messages" className="underline hover:text-primary">Messages</Link> for updates.
            Bookings are finalized after payment and mutual confirmation.
            Cancellation policies apply as per our <Link href="/terms" className="underline hover:text-primary">Terms of Service</Link>.
          </AlertDescription>
        </Alert>
    </div>
  );
}
