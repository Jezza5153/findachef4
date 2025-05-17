
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MenuCard } from '@/components/menu-card';
import type { Menu, ChefProfile as ChefProfileType } from '@/types';
import { ArrowRight, CalendarCheck2, Send, UserCircle, Utensils, Search, Sparkles, CalendarSearch, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

const myBookedEventsMock = [
    { id: 'mbe1', name: 'Birthday Dinner with Chef Julia', date: 'Nov 15, 2024 - 7:00 PM', status: 'Confirmed', image: 'https://placehold.co/100x100.png', dataAiHint: 'dinner party' },
    { id: 'mbe2', name: 'Cooking Class: Pasta Making', date: 'Dec 02, 2024 - 2:00 PM', status: 'Confirmed', image: 'https://placehold.co/100x100.png', dataAiHint: 'cooking class' },
];

const discoverChefEventsMock = [
  { id: 'dce1', name: 'Neighborhood BBQ Fest', date: 'Upcoming: Sat, Nov 25', image: 'https://placehold.co/600x400.png' , dataAiHint: 'bbq food fest'},
  { id: 'dce2', name: 'Exclusive Wine Tasting', date: 'Upcoming: Fri, Dec 1', image: 'https://placehold.co/600x400.png', dataAiHint: 'wine tasting event' },
  { id: 'dce3', name: 'Farm-to-Table Pop-Up Dinner', date: 'Upcoming: Sat, Dec 9', image: 'https://placehold.co/600x400.png', dataAiHint: 'farm to table' },
];


export default function CustomerDashboardPage() {
  const [topMenus, setTopMenus] = useState<Menu[]>([]);
  const [featuredChefs, setFeaturedChefs] = useState<ChefProfileType[]>([]);
  const [myBookedEvents, setMyBookedEvents] = useState(myBookedEventsMock); // Stays mock for now
  const [discoverChefEvents, setDiscoverChefEvents] = useState(discoverChefEventsMock); // Stays mock for now
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [loadingChefs, setLoadingChefs] = useState(true);
  const { user } = useAuth();
  const [userName, setUserName] = useState("Customer");

  useEffect(() => {
    if (user && user.displayName) {
      setUserName(user.displayName);
    } else if (user && user.email) {
      setUserName(user.email.split('@')[0]);
    }
  }, [user]);

  useEffect(() => {
    const fetchTopMenus = async () => {
      setLoadingMenus(true);
      try {
        const menusQuery = query(
          collection(db, "menus"),
          where("isPublic", "==", true),
          orderBy("createdAt", "desc"), // Example: order by most recent
          limit(5)
        );
        const querySnapshot = await getDocs(menusQuery);
        const menusData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Menu));
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
          where("isApproved", "==", true), // Only approved chefs
          // Add orderBy for consistent results or a specific "featured" flag if you implement one
          limit(4) 
        );
        const querySnapshot = await getDocs(chefsQuery);
        const chefsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChefProfileType));
        setFeaturedChefs(chefsData);
      } catch (error) {
        console.error("Error fetching featured chefs: ", error);
      } finally {
        setLoadingChefs(false);
      }
    };

    fetchTopMenus();
    fetchFeaturedChefs();
  }, []);


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
        {myBookedEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myBookedEvents.slice(0,5).map(event => (
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
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading menus...</p>
          </div>
        ) : topMenus.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topMenus.map(menu => <MenuCard key={menu.id} menu={menu} showChefDetails={false} data-ai-hint={menu.dataAiHint} />)}
          </div>
        ) : (
          <p className="text-muted-foreground text-center">No public menus available right now. Check back soon!</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {discoverChefEvents.slice(0,5).map(event => (
            <Card key={event.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow group">
              <Image src={event.image} alt={event.name} width={600} height={300} className="w-full h-48 object-cover group-hover:scale-105 transition-transform" data-ai-hint={event.dataAiHint} />
              <CardContent className="p-4">
                <CardTitle className="text-lg mb-1">{event.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{event.date}</p>
              </CardContent>
              <CardFooter className="p-4 bg-muted/30">
                <Button variant="outline" className="w-full">View Event Details</Button>
              </CardFooter>
            </Card>
          ))}
           {discoverChefEvents.length === 0 && (
             <Card className="md:col-span-2 lg:col-span-3 p-6 text-center items-center justify-center flex flex-col border-dashed hover:border-primary transition-colors">
                <CalendarSearch className="h-12 w-12 text-muted-foreground mb-3"/>
                <p className="text-muted-foreground mb-2">No chef-hosted events posted right now.</p>
            </Card>
           )}
        </div>
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
                <Button variant="link" size="sm" className="mt-2">View Profile</Button>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center">No featured chefs available at the moment.</p>
        )}
      </section>
    </div>
  );
}
