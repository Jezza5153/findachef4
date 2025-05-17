
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MenuCard } from '@/components/menu-card';
import type { Menu, ChefProfile as ChefProfileType, ChefWallEvent } from '@/types'; // Added ChefWallEvent
import { ArrowRight, CalendarCheck2, Send, UserCircle, Utensils, Search, Sparkles, CalendarSearch, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

const myBookedEventsMock = [ // This remains mock data as booking system is not yet fully integrated
    { id: 'mbe1', name: 'Birthday Dinner with Chef Julia', date: 'Nov 15, 2024 - 7:00 PM', status: 'Confirmed', image: 'https://placehold.co/100x100.png', dataAiHint: 'dinner party' },
    { id: 'mbe2', name: 'Cooking Class: Pasta Making', date: 'Dec 02, 2024 - 2:00 PM', status: 'Confirmed', image: 'https://placehold.co/100x100.png', dataAiHint: 'cooking class' },
];


export default function CustomerDashboardPage() {
  const [topMenus, setTopMenus] = useState<Menu[]>([]);
  const [featuredChefs, setFeaturedChefs] = useState<ChefProfileType[]>([]);
  const [myBookedEvents, setMyBookedEvents] = useState(myBookedEventsMock); 
  const [discoverChefEvents, setDiscoverChefEvents] = useState<ChefWallEvent[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [loadingChefs, setLoadingChefs] = useState(true);
  const [loadingDiscoverEvents, setLoadingDiscoverEvents] = useState(true);
  const { user } = useAuth();
  const [userName, setUserName] = useState("Customer");

  useEffect(() => {
    if (user) {
      setUserName(user.displayName || user.email?.split('@')[0] || "Customer");
    }
  }, [user]);

  useEffect(() => {
    const fetchTopMenus = async () => {
      setLoadingMenus(true);
      try {
        const menusQuery = query(
          collection(db, "menus"),
          where("isPublic", "==", true),
          orderBy("createdAt", "desc"), 
          limit(3) // Reduced to 3 to match event display count
        );
        const querySnapshot = await getDocs(menusQuery);
        const menusData = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            createdAt: doc.data().createdAt ? (doc.data().createdAt as Timestamp).toDate() : undefined,
            updatedAt: doc.data().updatedAt ? (doc.data().updatedAt as Timestamp).toDate() : undefined,
        } as Menu));
        setTopMenus(menusData);
      } catch (error) {
        console.error("Error fetching top menus: ", error);
      } finally {
        setLoadingMenus(false);
      }
    };

    const fetchFeaturedChefs = async () => {
      setLoadingChefs(true);
      try {
        const chefsQuery = query(
          collection(db, "users"),
          where("role", "==", "chef"),
          where("isApproved", "==", true),
          orderBy("createdAt", "desc"), // Example ordering
          limit(4) 
        );
        const querySnapshot = await getDocs(chefsQuery);
        const chefsData = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            createdAt: doc.data().createdAt ? (doc.data().createdAt as Timestamp).toDate() : undefined,
            updatedAt: doc.data().updatedAt ? (doc.data().updatedAt as Timestamp).toDate() : undefined,
        } as ChefProfileType));
        setFeaturedChefs(chefsData);
      } catch (error) {
        console.error("Error fetching featured chefs: ", error);
      } finally {
        setLoadingChefs(false);
      }
    };

    const fetchDiscoverChefEvents = async () => {
      setLoadingDiscoverEvents(true);
      try {
        const eventsQuery = query(
          collection(db, "chefWallEvents"),
          where("isPublic", "==", true),
          orderBy("createdAt", "desc"),
          limit(3) 
        );
        const querySnapshot = await getDocs(eventsQuery);
        const eventsData = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
          // Ensure eventDateTime is handled correctly if it's a string or Timestamp
          eventDateTime: docSnap.data().eventDateTime, 
          createdAt: docSnap.data().createdAt ? (docSnap.data().createdAt as Timestamp).toDate() : undefined,
          updatedAt: docSnap.data().updatedAt ? (docSnap.data().updatedAt as Timestamp).toDate() : undefined,
        } as ChefWallEvent));
        setDiscoverChefEvents(eventsData);
      } catch (error) {
        console.error("Error fetching discoverable chef events: ", error);
      } finally {
        setLoadingDiscoverEvents(false);
      }
    };

    fetchTopMenus();
    fetchFeaturedChefs();
    fetchDiscoverChefEvents();
  }, []);

  const formatEventDateForDisplay = (dateTimeString: string | Timestamp) => {
    try {
      const date = dateTimeString instanceof Timestamp ? dateTimeString.toDate() : new Date(dateTimeString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    } catch (e) {
      return String(dateTimeString); 
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

      {/* My Booked Events - Remains Mock for now */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold flex items-center"><CalendarCheck2 className="mr-3 h-7 w-7 text-primary"/> My Booked Events</h2>
          <Button variant="link" asChild>
            <Link href="/customer/dashboard/events">View All My Events <ArrowRight className="ml-1 h-4 w-4"/></Link>
          </Button>
        </div>
        {myBookedEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myBookedEvents.slice(0,3).map(event => ( // Display max 3 mock events
                    <Card key={event.id} className="p-4 flex items-center space-x-4 shadow-md hover:shadow-lg transition-shadow">
                        <Image src={event.image} alt={event.name} width={80} height={80} className="rounded-lg object-cover" data-ai-hint={event.dataAiHint} />
                        <div>
                            <h3 className="font-semibold">{event.name}</h3>
                            <p className="text-sm text-muted-foreground">Date: {event.date}</p>
                            <p className="text-sm text-primary">{event.status}</p>
                        </div>
                    </Card>
                ))}
            </div>
        ) : (
             <Card className="p-6 text-center items-center justify-center flex flex-col border-dashed hover:border-primary transition-colors">
                <CalendarCheck2 className="h-12 w-12 text-muted-foreground mb-3"/>
                <p className="text-muted-foreground mb-2">You haven't booked any events yet.</p>
                <Button variant="outline" asChild><Link href="/customer/menus">Explore Menus to Book</Link></Button>
            </Card>
        )}
         <p className="text-xs text-muted-foreground mt-2 text-center">(My Booked Events section is using placeholder data. Full booking system integration pending.)</p>
      </section>

      {/* Top Menus Section - Already Dynamic */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold flex items-center"><Utensils className="mr-3 h-7 w-7 text-primary"/> Top Menus You Might Like</h2>
          <Button variant="link" asChild>
            <Link href="/customer/menus">View All Menus <ArrowRight className="ml-1 h-4 w-4"/></Link>
          </Button>
        </div>
        {loadingMenus ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading menus...</p>
          </div>
        ) : topMenus.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topMenus.map(menu => <MenuCard key={menu.id} menu={menu} showChefDetails={false} data-ai-hint={menu.dataAiHint} />)}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No public menus available right now. Check back soon!</p>
        )}
      </section>

      {/* Discover Chef-Hosted Events Section - Now Dynamic */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold flex items-center"><CalendarSearch className="mr-3 h-7 w-7 text-primary"/>Discover Chef-Hosted Events</h2>
           <Button variant="link" asChild>
            <Link href="/customer/wall">View All Events <ArrowRight className="ml-1 h-4 w-4"/></Link>
          </Button>
        </div>
        {loadingDiscoverEvents ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading events...</p>
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
                <CalendarSearch className="h-12 w-12 text-muted-foreground mb-3"/>
                <p className="text-muted-foreground mb-2">No chef-hosted events posted right now.</p>
            </Card>
        )}
      </section>

      {/* Featured Chefs Section - Already Dynamic */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold flex items-center"><Sparkles className="mr-3 h-7 w-7 text-primary"/>Featured Chefs</h2>
          <Button variant="link" asChild>
            <Link href="/customer/directory/chefs">View All Chefs <ArrowRight className="ml-1 h-4 w-4"/></Link>
          </Button>
        </div>
        {loadingChefs ? (
           <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading chefs...</p>
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
                  data-ai-hint={chef.name.split(" ")[0].toLowerCase() + " portrait"}
                />
                <h3 className="font-semibold text-md">{chef.name}</h3>
                <p className="text-xs text-muted-foreground truncate w-full px-2">{chef.specialties?.join(', ')}</p>
                <Button variant="link" size="sm" className="mt-2" asChild>
                    {/* This link will eventually go to a public chef profile page if we create one */}
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
