
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { Booking } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { CalendarCheck2, User, Users, DollarSign, QrCode, Info, Loader2, ChefHat, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function CustomerBookedEventsPage() {
  const { user } = useAuth();
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
      setBookedEvents([]); // Clear on error
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on component unmount

  }, [user]);

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
    // Placeholder for cancel booking logic
    alert(`Cancel booking ${bookingId} - (Feature to be implemented)`);
    // This would involve updating the booking status in Firestore and handling refund logic.
  };
  
  const handleViewReceipts = (bookingId: string) => {
    // Placeholder for viewing receipts related to this booking
     alert(`View receipts for booking ${bookingId} - (Feature to be implemented)`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading your booked events...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center">
          <CalendarCheck2 className="mr-3 h-8 w-8 text-primary" /> My Booked Events
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
                       <ChefHat className="h-4 w-4 mr-2 text-muted-foreground" />
                    )}
                     With Chef {booking.chefName}
                  </CardDescription>
                )}
                 {booking.menuTitle && <p className="text-xs text-muted-foreground">Menu: {booking.menuTitle}</p>}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center text-muted-foreground">
                  <CalendarCheck2 className="h-4 w-4 mr-2 text-primary" />
                  Date: <span className="font-medium text-foreground ml-1">{booking.eventDate ? format(booking.eventDate, 'PPpp') : 'Date TBD'}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Users className="h-4 w-4 mr-2 text-primary" />
                  Guests: <span className="font-medium text-foreground ml-1">{booking.pax}</span>
                </div>
                 {booking.location && (
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2 text-primary" />
                    Location: <span className="font-medium text-foreground ml-1">{booking.location}</span>
                  </div>
                )}
                <div className="flex items-center text-muted-foreground">
                  <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                  Total Price: <span className="font-medium text-foreground ml-1">${booking.totalPrice.toFixed(2)}</span>
                </div>
                
                {booking.status === 'confirmed' && !booking.qrCodeScannedAt && (
                  <Alert variant="default" className="mt-4 bg-blue-500/10 border-blue-500/30">
                     <QrCode className="h-5 w-5 text-blue-600" />
                    <AlertTitle className="text-blue-700 font-semibold">Event Completion</AlertTitle>
                    <AlertDescription className="text-blue-600 text-xs">
                      On the day of your event, the chef will scan a QR code that will be displayed here to confirm completion.
                      Please have this page ready or your confirmation email. (QR code display coming soon).
                    </AlertDescription>
                  </Alert>
                )}
                {booking.status === 'completed' && booking.qrCodeScannedAt && (
                    <p className="text-xs text-green-600 flex items-center"><Info className="h-3 w-3 mr-1"/>Event marked complete on {format(booking.qrCodeScannedAt, 'PP')}.</p>
                )}

              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t space-y-2 sm:space-y-0">
                <Button variant="outline" size="sm" onClick={() => alert(`Messaging for booking ${booking.id} - (Feature to be implemented)`)}>
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
          <Info className="h-4 w-4" />
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
