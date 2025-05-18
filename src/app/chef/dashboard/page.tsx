
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarClock, MessageCircleMore, ShieldCheck, Loader2, ListChecks, Clock4 } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, BarChart as RechartsBarChart } from "recharts"
import type { ChartConfig } from "@/components/ui/chart"
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { ActivityItem, ChefProfile, Menu, CustomerRequest } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';


const initialMenuEngagementData = [ 
  { menu: "Example Menu 1", views: 100, requests: 10 },
  { menu: "Example Menu 2", views: 130, requests: 18 },
  { menu: "Example Menu 3", views: 70, requests: 5 },
  { menu: "Example Menu 4", views: 180, requests: 25 },
];

const chartConfig: ChartConfig = {
  views: {
    label: "Views",
    color: "hsl(var(--chart-1))",
  },
  requests: {
    label: "Requests",
    color: "hsl(var(--chart-2))",
  },
}


export default function ChefDashboardPage() {
  const { user, userProfile } = useAuth();
  const [upcomingEventsCount, setUpcomingEventsCount] = useState<number | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [recentActivityItems, setRecentActivityItems] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [bookingRequestsCount, setBookingRequestsCount] = useState<number | null>(null);
  const [loadingRequestsCount, setLoadingRequestsCount] = useState(true);
  const [menuEngagementData, setMenuEngagementData] = useState(initialMenuEngagementData);
  const [loadingMenuEngagement, setLoadingMenuEngagement] = useState(true);

  const chefProfile = userProfile as ChefProfile | null;

  useEffect(() => {
    if (!user) {
      setLoadingEvents(false);
      setLoadingActivity(false);
      setLoadingRequestsCount(false);
      setLoadingMenuEngagement(false);
      return;
    }

    // Fetch Upcoming Events Count (Real-time)
    setLoadingEvents(true);
    const todayForEvents = new Date();
    todayForEvents.setHours(0, 0, 0, 0); // Start of today for comparison

    const eventsCollectionRef = collection(db, `users/${user.uid}/calendarEvents`);
    const qEvents = query(
      eventsCollectionRef,
      where("status", "==", "Confirmed")
      // We'll filter by date client-side after fetching due to potential Timestamp vs Date comparison complexities in direct query
    );
    const unsubscribeEvents = onSnapshot(qEvents, (querySnapshot) => {
      let count = 0;
      querySnapshot.forEach(doc => {
        const eventData = doc.data();
        const eventDate = eventData.date instanceof Timestamp ? eventData.date.toDate() : new Date(eventData.date as any);
        if (eventDate >= todayForEvents) {
          count++;
        }
      });
      setUpcomingEventsCount(count);
      setLoadingEvents(false);
    }, (error) => {
      console.error("Error fetching upcoming events count:", error);
      setUpcomingEventsCount(0);
      setLoadingEvents(false);
    });

    // Fetch Recent Activity (Real-time)
    setLoadingActivity(true);
    const activityCollectionRef = collection(db, `users/${user.uid}/activities`);
    const activityQuery = query(activityCollectionRef, orderBy("timestamp", "desc"), limit(5));
    const unsubscribeActivity = onSnapshot(activityQuery, (activitySnapshot) => {
      const activities = activitySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp as any),
        } as ActivityItem;
      });
      setRecentActivityItems(activities);
      setLoadingActivity(false);
    }, (error) => {
      console.error("Error fetching recent activity:", error);
      setRecentActivityItems([]);
      setLoadingActivity(false);
    });

    // Fetch Booking Requests Count (Real-time)
    setLoadingRequestsCount(true);
    const customerRequestsRef = collection(db, "customerRequests");
    // This query aims to find requests relevant to the current chef.
    // It covers 'new' requests (potentially visible to many chefs, though ideally filtered further by specialty/location in a real app)
    // and requests where this chef is actively involved.
    const qRequests = query(
      customerRequestsRef,
      where("status", "in", ["new", "awaiting_customer_response", "proposal_sent", "chef_accepted"]),
      orderBy("createdAt", "desc") // General ordering, further client-side filtering might be needed for chef-specific relevance
    );

    const unsubscribeRequests = onSnapshot(qRequests, (querySnapshot) => {
      let count = 0;
      querySnapshot.forEach((doc) => {
        const requestData = doc.data() as CustomerRequest;
        if (
          requestData.status === 'new' || // All new requests
          (requestData.respondingChefIds && requestData.respondingChefIds.includes(user.uid) && requestData.status === 'awaiting_customer_response') || // Chef is responding
          (requestData.activeProposal?.chefId === user.uid && (requestData.status === 'proposal_sent' || requestData.status === 'chef_accepted')) // Chef's proposal is active
        ) {
          count++;
        }
      });
      setBookingRequestsCount(count);
      setLoadingRequestsCount(false);
    }, (error) => {
      console.error("Error fetching booking requests count:", error);
      setBookingRequestsCount(0);
      setLoadingRequestsCount(false);
    });


    // Fetch Menu Engagement Data (Dynamic Mock based on Chef's menus)
    setLoadingMenuEngagement(true);
    const menusCollectionRef = collection(db, "menus");
    const qMenus = query(menusCollectionRef, where("chefId", "==", user.uid), orderBy("createdAt", "desc"), limit(4));
    getDocs(qMenus).then(menusSnapshot => {
      if (menusSnapshot.empty) {
        setMenuEngagementData(initialMenuEngagementData); // Fallback to static examples
      } else {
        const dynamicMockData = menusSnapshot.docs.map(doc => {
          const menu = doc.data() as Menu;
          return {
            menu: menu.title.length > 15 ? menu.title.substring(0, 12) + "..." : menu.title, // Shorten long titles
            views: Math.floor(Math.random() * 200) + 50, // Random views
            requests: Math.floor(Math.random() * ( (Math.floor(Math.random() * 200) + 50) / 4 ) ),  // Random requests, somewhat proportional to views
          };
        });
        setMenuEngagementData(dynamicMockData);
      }
      setLoadingMenuEngagement(false);
    }).catch(error => {
      console.error("Error fetching menus for engagement chart:", error);
      setMenuEngagementData(initialMenuEngagementData); // Fallback on error
      setLoadingMenuEngagement(false);
    });


    return () => {
      unsubscribeEvents();
      unsubscribeActivity();
      unsubscribeRequests();
    };
  }, [user]);


  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Requests</CardTitle>
            <MessageCircleMore className="h-5 w-5 text-muted-foreground" data-ai-hint="message chat" />
          </CardHeader>
          <CardContent>
            {loadingRequestsCount ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
                <div className="text-2xl font-bold">{bookingRequestsCount ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
                {loadingRequestsCount ? "Fetching data..." : "Active requests needing attention."}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Confirmed Events</CardTitle>
            <CalendarClock className="h-5 w-5 text-muted-foreground" data-ai-hint="calendar event" />
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <div className="text-2xl font-bold">{upcomingEventsCount ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {loadingEvents ? "Fetching data..." : `Events confirmed and upcoming.`}
            </p>
          </CardContent>
        </Card>
         <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trust Score</CardTitle>
            <ShieldCheck className="h-5 w-5 text-muted-foreground" data-ai-hint="shield security" />
          </CardHeader>
          <CardContent>
            {chefProfile?.trustScore !== undefined ? (
              <>
                <div className="text-2xl font-bold">{chefProfile.trustScore.toFixed(1)}/5</div>
                <p className="text-xs text-muted-foreground">{chefProfile.trustScoreBasis || "Based on platform activity"}</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">N/A</div>
                <p className="text-xs text-muted-foreground">Awaiting activity to calculate score.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Menu Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMenuEngagement ? (
                <div className="flex justify-center items-center h-[250px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                </div>
            ) : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <RechartsBarChart data={menuEngagementData} layout="vertical" barCategoryGap="20%">
                    <CartesianGrid horizontal={false} />
                    <YAxis dataKey="menu" type="category" tickLine={false} axisLine={false} width={80} />
                    <XAxis type="number" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="views" fill="var(--color-views)" radius={4} />
                    <Bar dataKey="requests" fill="var(--color-requests)" radius={4} />
                  </RechartsBarChart>
                </ChartContainer>
            )}
             <p className="text-xs text-muted-foreground mt-2 text-center">(Example data based on your menus - real tracking requires advanced setup)</p>
          </CardContent>
        </Card>
       
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center"><ListChecks className="mr-2 h-5 w-5" data-ai-hint="checklist tasks"/> Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingActivity ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : recentActivityItems.length > 0 ? (
              <ul className="space-y-3">
                {recentActivityItems.map((activity) => (
                  <li key={activity.id} className="flex items-start justify-between text-sm pb-2 border-b border-dashed last:border-b-0">
                    <div>
                      {activity.linkTo ? (
                        <Button variant="link" asChild className="p-0 h-auto text-left">
                          <Link href={activity.linkTo} className="hover:underline">
                            {activity.description}
                          </Link>
                        </Button>
                      ) : (
                        <span>{activity.description}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      <Clock4 className="h-3 w-3 inline-block mr-1" data-ai-hint="clock time"/>
                      {activity.timestamp ? formatDistanceToNow(new Date(activity.timestamp as any), { addSuffix: true }) : 'Just now'}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity to display.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

