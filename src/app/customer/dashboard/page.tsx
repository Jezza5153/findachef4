import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MenuCard } from '@/components/menu-card';
import type { Menu } from '@/types';
import { ArrowRight, CalendarCheck2, Heart, Send, UserCircle, Utensils } from 'lucide-react';
import Image from 'next/image';

// Mock data for customer dashboard
const topMenus: Menu[] = [
  {
    id: 'tm1', title: 'Weekend Brunch Special', cuisine: 'American', pricePerHead: 50, isPublic: true,
    description: 'A delightful brunch spread with pancakes, eggs benedict, and mimosas.', dietaryInfo: ['Vegetarian option'],
    imageUrl: 'https://placehold.co/600x400.png',
  },
  {
    id: 'tm2', title: 'Romantic Dinner for Two', cuisine: 'Italian', pricePerHead: 150, isPublic: true,
    description: 'An intimate Italian dinner featuring homemade pasta and fine wine pairings.', dietaryInfo: [],
    imageUrl: 'https://placehold.co/600x400.png',
  },
];

const topEvents = [
  { id: 'te1', name: 'Neighborhood BBQ Fest', date: 'Upcoming: Sat, Nov 25', image: 'https://placehold.co/600x400.png' , dataAiHint: 'bbq food'},
  { id: 'te2', name: 'Exclusive Wine Tasting', date: 'Upcoming: Fri, Dec 1', image: 'https://placehold.co/600x400.png', dataAiHint: 'wine tasting' },
];

const topChefs = [
  { id: 'tc1', name: 'Chef Ramsey Gordon', specialties: 'British, French', image: 'https://placehold.co/100x100.png', dataAiHint: 'chef portrait' },
  { id: 'tc2', name: 'Chef Alice Waters', specialties: 'Californian, Organic', image: 'https://placehold.co/100x100.png', dataAiHint: 'chef portrait' },
];


export default function CustomerDashboardPage() {
  return (
    <div className="space-y-8">
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 p-8 shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Welcome Back, Customer Name!</h1>
                <p className="text-lg text-foreground/80 mt-2">Ready for your next culinary adventure?</p>
            </div>
            <div className="flex gap-3">
                <Button asChild size="lg">
                    <Link href="/customer/menus"><Heart className="mr-2 h-5 w-5"/> Browse Menus</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                    <Link href="/customer/requests/new"><Send className="mr-2 h-5 w-5"/> Make a Request</Link>
                </Button>
            </div>
        </div>
      </Card>

      {/* My Upcoming Events */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold flex items-center"><CalendarCheck2 className="mr-2 h-6 w-6 text-primary"/> My Upcoming Events</h2>
          <Button variant="link" asChild>
            <Link href="/customer/dashboard/events">View All <ArrowRight className="ml-1 h-4 w-4"/></Link>
          </Button>
        </div>
        {/* Placeholder - map over actual booked events here */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-4 flex items-center space-x-4 shadow-md">
                <Image src="https://placehold.co/100x100.png" alt="Event" width={80} height={80} className="rounded-lg object-cover" data-ai-hint="party event" />
                <div>
                    <h3 className="font-semibold">Birthday Dinner with Chef Julia</h3>
                    <p className="text-sm text-muted-foreground">Date: Nov 15, 2024 - 7:00 PM</p>
                    <p className="text-sm text-muted-foreground">Status: Confirmed</p>
                </div>
            </Card>
             <Card className="p-6 text-center items-center justify-center flex flex-col border-dashed hover:border-primary transition-colors">
                <p className="text-muted-foreground mb-2">No other upcoming events.</p>
                <Button variant="outline" asChild><Link href="/customer/menus">Book Your Next Event</Link></Button>
            </Card>
        </div>
      </section>

      {/* Top Menus Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold flex items-center"><Utensils className="mr-2 h-6 w-6 text-primary"/> Top Menus You Might Like</h2>
          <Button variant="link" asChild>
            <Link href="/customer/menus">View All Menus <ArrowRight className="ml-1 h-4 w-4"/></Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {topMenus.map(menu => <MenuCard key={menu.id} menu={menu} showChefDetails={false} />)}
        </div>
      </section>

      {/* Top Events Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Discover Chef-Hosted Events</h2>
           <Button variant="link" asChild>
            <Link href="#">View All Events <ArrowRight className="ml-1 h-4 w-4"/></Link> {/* Link to wall.html#customer or similar */}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {topEvents.map(event => (
            <Card key={event.id} className="overflow-hidden shadow-md">
              <Image src={event.image} alt={event.name} width={600} height={300} className="w-full h-40 object-cover" data-ai-hint={event.dataAiHint} />
              <CardContent className="p-4">
                <CardTitle className="text-lg">{event.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{event.date}</p>
              </CardContent>
              <CardFooter className="p-4 bg-muted/30">
                <Button variant="outline" className="w-full">View Event Details</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* Top Chefs Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Featured Chefs</h2>
          <Button variant="link" asChild>
            <Link href="#">View All Chefs <ArrowRight className="ml-1 h-4 w-4"/></Link> {/* Link to chefs.html or similar */}
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {topChefs.map(chef => (
            <Card key={chef.id} className="p-4 text-center shadow-md">
              <Image src={chef.image} alt={chef.name} width={80} height={80} className="rounded-full mx-auto mb-3" data-ai-hint={chef.dataAiHint}/>
              <h3 className="font-semibold">{chef.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{chef.specialties}</p>
              <Button variant="link" size="sm" className="mt-2">View Profile</Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
