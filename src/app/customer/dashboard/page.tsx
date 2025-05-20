
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MenuCard } from '@/components/menu-card';
import type { Menu, ChefProfile as ChefProfileType, ChefWallEvent, Booking } from '@/types';
import { ArrowRight, CalendarCheck2, Send, UserCircle, Utensils, Search, Sparkles, CalendarSearch, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

export default function CustomerDashboardPage() {
  const [topMenus, setTopMenus] = useState<Menu[]>([]);
  const [featuredChefs, setFeaturedChefs] = useState<ChefProfileType[]>([]);
  const [discoverChefEvents, setDiscoverChefEvents] = useState<ChefWallEvent[]>([]);
  const [myBookedEvents, setMyBookedEvents] = useState<Booking[]>([]);

  const [loadingMenus, setLoadingMenus] = useState(true);
  const [loadingChefs, setLoadingChefs] = useState(true);
  const [loadingDiscoverEvents, setLoadingDiscoverEvents] = useState(true);
  const [loadingBookedEvents, setLoadingBookedEvents] = useState(true);

  const { user } = useAuth();
  const [userName, setUserName] = useState("Customer");

  useEffect(() => {
    if (user) {
      setUserName(user.displayName || user.email?.split('@')[0] || "Customer");
    }
  }, [user]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Fetch Top Menus
      setLoadingMenus(true);
      try {
        const menusQuery = query(
          collection(db, "menus"),
          where("isPublic", "==", true),
          orderBy("createdAt", "desc"),
          limit(3)
        );
        const menusSnapshot = await getDocs(menusQuery);
        const menusData = menusSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : undefined,
            updatedAt: doc.data().updatedAt instanceof Timestamp ? doc.data().updatedAt.toDate() : undefined,
        } as Menu));
        setTopMenus(menusData);
      } catch (error) {
        console.error("Error fetching top menus: ", error);
      } finally {
        setLoadingMenus(false);
      }

      // Fetch Featured Chefs
      setLoadingChefs(true);
      try {
        const chefsQuery = query(
          collection(db, "users"),
          where("role", "==", "chef"),
          where("isApproved", "==", true),
          orderBy("createdAt", "desc"),
          limit(4)
        );
        const chefsSnapshot = await getDocs(chefsQuery);
        const chefsData = chefsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : undefined,
            updatedAt: doc.data().updatedAt instanceof Timestamp ? doc.data().updatedAt.toDate() : undefined,
        } as ChefProfileType));
        setFeaturedChefs(chefsData);
      } catch (error) {
        console.error("Error fetching featured chefs: ", error);
      } finally {
        setLoadingChefs(false);
      }

      // Fetch Discover Chef Events
      setLoadingDiscoverEvents(true);
      try {
        const eventsQuery = query(
          collection(db, "chefWallEvents"),
          where("isPublic", "==", true),
          orderBy("createdAt", "desc"),
          limit(3)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData = eventsSnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
          eventDateTime: docSnap.data().eventDateTime,
          createdAt: docSnap.data().createdAt instanceof Timestamp ? docSnap.data().createdAt.toDate() : undefined,
          updatedAt: docSnap.data().updatedAt instanceof Timestamp ? docSnap.data().updatedAt.toDate() : undefined,
        } as ChefWallEvent));
        setDiscoverChefEvents(eventsData);
      } catch (error) {
        console.error("Error fetching discoverable chef events: ", error);
      } finally {
        setLoadingDiscoverEvents(false);
      }

      // Fetch My Booked Events if user is logged in
      if (user) {
        setLoadingBookedEvents(true);
        try {
          const bookingsQuery = query(
            collection(db, "bookings"),
            where("customerId", "==", user.uid),
            orderBy("eventDate", "desc"), // Show most recent or upcoming first
            limit(3)
          );
          const bookingsSnapshot = await getDocs(bookingsQuery);
          const bookingsData = bookingsSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              eventDate: data.eventDate instanceof Timestamp ? data.eventDate.toDate() : new Date(data.eventDate as any),
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt as any),
            } as Booking;
          });
          setMyBookedEvents(bookingsData);
        } catch (error) {
          console.error("Error fetching booked events: ", error);
          setMyBookedEvents([]); // Set to empty on error
        } finally {
          setLoadingBookedEvents(false);
        }
      } else {
        setMyBookedEvents([]);
        setLoadingBookedEvents(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const formatEventDateForDisplay = (dateTimeInput: string | Date | Timestamp | undefined) => {
    if (!dateTimeInput) return "Date TBD";
    try {
      const date = dateTimeInput instanceof Timestamp ? dateTimeInput.toDate() : new Date(dateTimeInput);
      if (isNaN(date.getTime())) return "Invalid Date";
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    } catch (e) {
      return String(dateTimeInput);
    }
  };


  return (
    <div className="space-y-12">
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 p-8 shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Welcome Back, {userName}!</h1>
                <p className="text-lg text-foreground/80 mt-2">Ready for your next culinary adventure?</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg">
                    <Link href="/customer/menus"><Search className="mr-2 h-5 w-5"/> Browse Chef Menus</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                    <Link href="/customer/requests/new"><Send className="mr-2 h-5 w-5"/> Make a New Request</Link>
                </Button>
            </div>
        </div>
      </Card>

      {/* My Booked Events */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold flex items-center"><CalendarCheck2 className="mr-3 h-7 w-7 text-primary"/> My Booked Events</h2>
          <Button variant="link" asChild>
            <Link href="/customer/dashboard/events">View All My Events <ArrowRight className="ml-1 h-4 w-4"/></Link>
          </Button>
        </div>
        {loadingBookedEvents ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, index) => (
                     <Card key={index} className="p-4 flex items-center space-x-4 shadow-md">
                        <div className="h-20 w-20 rounded-lg bg-muted animate-pulse"></div>
                        <div className="space-y-2 flex-1">
                            <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                            <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                            <div className="h-3 bg-muted rounded w-1/4 animate-pulse"></div>
                        </div>
                    </Card>
                ))}
            </div>
        ) : myBookedEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myBookedEvents.map(event => (
                    <Card key={event.id} className="p-4 flex items-center space-x-4 shadow-md hover:shadow-lg transition-shadow">
                        <Image 
                            src={event.chefAvatarUrl || "https://placehold.co/80x80.png"} 
                            alt={event.eventTitle || 'Event image'} 
                            width={80} height={80} 
                            className="rounded-lg object-cover" 
                            data-ai-hint="event food" 
                        />
                        <div>
                            <h3 className="font-semibold">{event.eventTitle}</h3>
                            <p className="text-sm text-muted-foreground">Date: {formatEventDateForDisplay(event.eventDate)}</p>
                            <p className="text-sm text-primary capitalize">{event.status.replace(/_/g, ' ')}</p>
                        </div>
                    </Card>
                ))}
            </div>
        ) : (
             <Card className="p-6 text-center items-center justify-center flex flex-col border-dashed hover:border-primary transition-colors">
                <CalendarCheck2 className="h-12 w-12 text-muted-foreground mb-3" data-ai-hint="calendar empty"/>
                <p className="text-muted-foreground mb-2">You haven't booked any events yet.</p>
                <Button variant="outline" asChild><Link href="/customer/menus">Explore Menus to Book</Link></Button>
            </Card>
        )}
      </section>

      {/* Top Menus Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold flex items-center"><Utensils className="mr-3 h-7 w-7 text-primary"/> Top Menus You Might Like</h2>
          <Button variant="link" asChild>
            <Link href="/customer/menus">View All Menus <ArrowRight className="ml-1 h-4 w-4"/></Link>
          </Button>
        </div>
        {loadingMenus ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, index) => <Card key={index} className="h-96 bg-muted animate-pulse"></Card>)}
          </div>
        ) : topMenus.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topMenus.map(menu => <MenuCard key={menu.id} menu={menu} showChefDetails={false} data-ai-hint={menu.dataAiHint || "food delicious"} />)}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No public menus available right now. Check back soon!</p>
        )}
      </section>

      {/* Discover Chef-Hosted Events Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold flex items-center"><CalendarSearch className="mr-3 h-7 w-7 text-primary"/>Discover Chef-Hosted Events</h2>
           <Button variant="link" asChild>
            <Link href="/customer/wall">View All Events <ArrowRight className="ml-1 h-4 w-4"/></Link>
          </Button>
        </div>
        {loadingDiscoverEvents ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[...Array(3)].map((_, index) => (
                 <Card key={index} className="overflow-hidden shadow-md group">
                    <div className="w-full h-48 bg-muted animate-pulse"></div>
                    <CardContent className="p-4 space-y-2">
                        <div className="h-5 bg-muted rounded w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                        <div className="h-3 bg-muted rounded w-1/3 animate-pulse"></div>
                    </CardContent>
                    <CardFooter className="p-4 bg-muted/30">
                        <div className="h-9 bg-muted rounded w-full animate-pulse"></div>
                    </CardFooter>
                </Card>
               ))}
            </div>
        ) : discoverChefEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {discoverChefEvents.map(event => (
                <Card key={event.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow group">
                {event.imageUrl ? (
                    <Image src={event.imageUrl} alt={event.title} width={600} height={300} className="w-full h-48 object-cover group-hover:scale-105 transition-transform" data-ai-hint={event.dataAiHint || "event food"} />
                ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground">
                        <CalendarSearch className="h-16 w-16 opacity-50" data-ai-hint="event placeholder" />
                    </div>
                )}
                <CardContent className="p-4">
                    <CardTitle className="text-lg mb-1">{event.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{formatEventDateForDisplay(event.eventDateTime)}</p>
                    <p className="text-xs text-muted-foreground">By: {event.chefName}</p>
                </CardContent>
                <CardFooter className="p-4 bg-muted/30">
                    <Button variant="outline" className="w-full" asChild>
                        <Link href={`/customer/wall#event-${event.id}`}>View Event Details</Link>
                    </Button>
                </CardFooter>
                </Card>
            ))}
            </div>
        ) : (
             <Card className="md:col-span-2 lg:col-span-3 p-6 text-center items-center justify-center flex flex-col border-dashed hover:border-primary transition-colors">
                <CalendarSearch className="h-12 w-12 text-muted-foreground mb-3" data-ai-hint="calendar empty"/>
                <p className="text-muted-foreground mb-2">No chef-hosted events posted right now.</p>
            </Card>
        )}
      </section>

      {/* Featured Chefs Section */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold flex items-center"><Sparkles className="mr-3 h-7 w-7 text-primary"/>Featured Chefs</h2>
          <Button variant="link" asChild>
            <Link href="/customer/directory/chefs">View All Chefs <ArrowRight className="ml-1 h-4 w-4"/></Link>
          </Button>
        </div>
        {loadingChefs ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
             {[...Array(4)].map((_, index) => (
                <Card key={index} className="p-4 text-center shadow-md flex flex-col items-center">
                    <div className="h-20 w-20 rounded-full bg-muted mx-auto mb-3 animate-pulse"></div>
                    <div className="h-5 bg-muted rounded w-3/4 mb-1 animate-pulse"></div>
                    <div className="h-3 bg-muted rounded w-1/2 mb-2 animate-pulse"></div>
                    <div className="h-8 bg-muted rounded w-2/3 animate-pulse"></div>
                </Card>
             ))}
           </div>
        ) : featuredChefs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {featuredChefs.map(chef => (
              <Card key={chef.id} className="p-4 text-center shadow-md hover:shadow-lg transition-shadow flex flex-col items-center">
                <Image 
                  src={chef.profilePictureUrl || "https://placehold.co/100x100.png"} 
                  alt={chef.name} 
                  width={80} height={80} 
                  className="rounded-full mx-auto mb-3 object-cover" 
                  data-ai-hint={chef.name ? `${chef.name.split(" ")[0].toLowerCase()} portrait` : "chef portrait"}
                />
                <h3 className="font-semibold text-md">{chef.name}</h3>
                <p className="text-xs text-muted-foreground truncate w-full px-2">{chef.specialties?.join(', ')}</p>
                <Button variant="link" size="sm" className="mt-2" asChild>
                    <Link href="#">View Profile</Link> 
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No featured chefs available at the moment.</p>
        )}
      </section>
    </div>
  );
}
