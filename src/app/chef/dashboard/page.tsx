
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
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import type { ActivityItem, ChefProfile } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';


const menuEngagementData = [ // This will remain mock data for now
  { menu: "Menu A", views: 150, requests: 15 },
  { menu: "Menu B", views: 120, requests: 22 },
  { menu: "Menu C", views: 90, requests: 8 },
  { menu: "Menu D", views: 200, requests: 30 },
]

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

  // Placeholder for booking requests count - real implementation needs backend logic
  // to determine which requests are relevant/new for this specific chef.
  // This might involve querying a 'proposals' or 'requests' collection where the chef is involved.
  const bookingRequestsCount = 5; // Static placeholder
  const bookingRequestsChange = "+2 from last week"; // Static placeholder

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        setLoadingEvents(false);
        setLoadingActivity(false);
        return;
      }

      // Fetch Upcoming Events Count
      setLoadingEvents(true);
      try {
        const today = Timestamp.fromDate(new Date(new Date().setHours(0, 0, 0, 0)));
        const eventsCollectionRef = collection(db, `users/${user.uid}/calendarEvents`);
        const q = query(
          eventsCollectionRef,
          where("status", "==", "Confirmed"),
          where("date", ">=", today) 
        );
        const querySnapshot = await getDocs(q);
        setUpcomingEventsCount(querySnapshot.size);
      } catch (error) {
        console.error("Error fetching upcoming events count:", error);
        setUpcomingEventsCount(0);
      } finally {
        setLoadingEvents(false);
      }

      // Fetch Recent Activity
      setLoadingActivity(true);
      try {
        const activityCollectionRef = collection(db, `users/${user.uid}/activities`);
        const activityQuery = query(activityCollectionRef, orderBy("timestamp", "desc"), limit(5));
        const activitySnapshot = await getDocs(activityQuery);
        const activities = activitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityItem));
        setRecentActivityItems(activities);
      } catch (error) {
        console.error("Error fetching recent activity:", error);
        setRecentActivityItems([]);
      } finally {
        setLoadingActivity(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const chefProfile = userProfile as ChefProfile | null;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"> {/* Adjusted for 3 cards in a row */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Requests</CardTitle>
            <MessageCircleMore className="h-5 w-5 text-muted-foreground" data-ai-hint="message chat" />
          </CardHeader>
          <CardContent>
            {/* This remains a placeholder as its logic is complex */}
            <div className="text-2xl font-bold">{bookingRequestsCount}</div>
            <p className="text-xs text-muted-foreground">{bookingRequestsChange}</p>
            <p className="text-xs text-muted-foreground mt-1">(Placeholder - real data requires backend integration for request status)</p>
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
            <CardTitle>Menu Engagement Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Menu engagement chart will be tackled later. */}
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
               <RechartsBarChart data={menuEngagementData} layout="vertical" barCategoryGap="20%">
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="menu" type="category" tickLine={false} axisLine={false} />
                <XAxis type="number" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="views" fill="var(--color-views)" radius={4} />
                <Bar dataKey="requests" fill="var(--color-requests)" radius={4} />
              </RechartsBarChart>
            </ChartContainer>
             <p className="text-xs text-muted-foreground mt-2 text-center">(Placeholder - real data requires advanced tracking)</p>
          </CardContent>
        </Card>
       
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center"><ListChecks className="mr-2 h-5 w-5" /> Recent Activity</CardTitle>
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
                      <Clock4 className="h-3 w-3 inline-block mr-1"/>
                      {activity.timestamp ? formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
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
