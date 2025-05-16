
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MenuCard } from '@/components/menu-card';
import type { Menu } from '@/types';
import { ArrowRight, CalendarCheck2, Send, UserCircle, Utensils, Search, Sparkles, CalendarSearch } from 'lucide-react';
import Image from 'next/image';

// Mock data for customer dashboard
const topMenus: Menu[] = [
  {
    id: 'tm1', title: 'Weekend Brunch Special', cuisine: 'American', pricePerHead: 50, isPublic: true,
    description: 'A delightful brunch spread with pancakes, eggs benedict, and mimosas.', dietaryInfo: ['Vegetarian option'],
    imageUrl: 'https://placehold.co/600x400.png', dataAiHint: 'brunch food',
  },
  {
    id: 'tm2', title: 'Romantic Dinner for Two', cuisine: 'Italian', pricePerHead: 150, isPublic: true,
    description: 'An intimate Italian dinner featuring homemade pasta and fine wine pairings.', dietaryInfo: [],
    imageUrl: 'https://placehold.co/600x400.png', dataAiHint: 'romantic dinner',
  },
  {
    id: 'tm3', title: 'Family Taco Night', cuisine: 'Mexican', pricePerHead: 40, isPublic: true,
    description: 'Build-your-own tacos with all the fixings. Fun for the whole family!', dietaryInfo: ['Gluten-Free Tortillas'],
    imageUrl: 'https://placehold.co/600x400.png', dataAiHint: 'taco night',
  },
  {
    id: 'tm4', title: 'Healthy Mediterranean Lunch', cuisine: 'Mediterranean', pricePerHead: 60, isPublic: true,
    description: 'Fresh salads, grilled halloumi, hummus, and pita bread.', dietaryInfo: ['Vegan Option'],
    imageUrl: 'https://placehold.co/600x400.png', dataAiHint: 'mediterranean food',
  },
  {
    id: 'tm5', title: 'Sushi Making Experience', cuisine: 'Japanese', pricePerHead: 90, isPublic: true,
    description: 'Learn to make your own sushi rolls with a professional chef.', dietaryInfo: [],
    imageUrl: 'https://placehold.co/600x400.png', dataAiHint: 'sushi making',
  },
];

const myBookedEvents = [
    { id: 'mbe1', name: 'Birthday Dinner with Chef Julia', date: 'Nov 15, 2024 - 7:00 PM', status: 'Confirmed', image: 'https://placehold.co/100x100.png', dataAiHint: 'dinner party' },
    { id: 'mbe2', name: 'Cooking Class: Pasta Making', date: 'Dec 02, 2024 - 2:00 PM', status: 'Confirmed', image: 'https://placehold.co/100x100.png', dataAiHint: 'cooking class' },
];

const discoverChefEvents = [
  { id: 'dce1', name: 'Neighborhood BBQ Fest', date: 'Upcoming: Sat, Nov 25', image: 'https://placehold.co/600x400.png' , dataAiHint: 'bbq food fest'},
  { id: 'dce2', name: 'Exclusive Wine Tasting', date: 'Upcoming: Fri, Dec 1', image: 'https://placehold.co/600x400.png', dataAiHint: 'wine tasting event' },
  { id: 'dce3', name: 'Farm-to-Table Pop-Up Dinner', date: 'Upcoming: Sat, Dec 9', image: 'https://placehold.co/600x400.png', dataAiHint: 'farm to table' },
];

const topChefs = [
  { id: 'tc1', name: 'Chef Ramsey Gordon', specialties: 'British, French', image: 'https://placehold.co/100x100.png', dataAiHint: 'chef portrait' },
  { id: 'tc2', name: 'Chef Alice Waters', specialties: 'Californian, Organic', image: 'https://placehold.co/100x100.png', dataAiHint: 'chef portrait' },
  { id: 'tc3', name: 'Chef Jiro Ono', specialties: 'Sushi, Japanese', image: 'https://placehold.co/100x100.png', dataAiHint: 'chef portrait' },
  { id: 'tc4', name: 'Chef Massimo Bottura', specialties: 'Modern Italian', image: 'https://placehold.co/100x100.png', dataAiHint: 'chef portrait' },
];


export default function CustomerDashboardPage() {
  return (
    <div className="space-y-12">
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 p-8 shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Welcome Back, Customer Name!</h1>
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
                 {myBookedEvents.length === 0 && ( /* This part will likely not show if the first condition is met, adjust logic if needed for different "empty states" */
                    <Card className="md:col-span-2 lg:col-span-3 p-6 text-center items-center justify-center flex flex-col border-dashed hover:border-primary transition-colors">
                        <p className="text-muted-foreground mb-2">No upcoming booked events.</p>
                        <Button variant="outline" asChild><Link href="/customer/menus">Book Your Next Event</Link></Button>
                    </Card>
                )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topMenus.slice(0, 5).map(menu => <MenuCard key={menu.id} menu={menu} showChefDetails={false} data-ai-hint={menu.dataAiHint} />)}
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {topChefs.slice(0,10).map(chef => (
            <Card key={chef.id} className="p-4 text-center shadow-md hover:shadow-lg transition-shadow flex flex-col items-center">
              <Image src={chef.image} alt={chef.name} width={80} height={80} className="rounded-full mx-auto mb-3" data-ai-hint={chef.dataAiHint}/>
              <h3 className="font-semibold text-md">{chef.name}</h3>
              <p className="text-xs text-muted-foreground truncate w-full px-2">{chef.specialties}</p>
              <Button variant="link" size="sm" className="mt-2">View Profile</Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

// Added dataAiHint to Menu interface in types, need to update that file too.
// This will be done in a subsequent step if not already present.
// For now, MenuCard doesn't use dataAiHint.
// I'll add it to the Menu interface manually.
declare module '@/types' {
    interface Menu {
        dataAiHint?: string;
    }
}
