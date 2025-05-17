
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarClock, MessageCircleMore, ShieldCheck } from 'lucide-react';
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
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

const menuEngagementData = [
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
  const { user } = useAuth();
  const [upcomingEventsCount, setUpcomingEventsCount] = useState<number | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Placeholder for booking requests count - real implementation needs backend logic
  const bookingRequestsCount = 5; // Static placeholder
  const bookingRequestsChange = "+2 from last week"; // Static placeholder

  // Placeholder for trust score - real implementation needs backend logic
  const trustScore = "4.8/5"; // Static placeholder
  const trustScoreDescription = "Based on reviews & platform activity"; // Static placeholder

  // Placeholder for recent activity - real implementation needs a feed system
  const recentActivity = [
    { description: "New booking request for \"Italian Feast\" menu.", time: "2 hours ago" },
    { description: "\"Summer BBQ Special\" menu published.", time: "1 day ago" },
    { description: "Message from Jane Doe regarding birthday party.", time: "3 days ago" },
  ];

  useEffect(() => {
    const fetchUpcomingEventsCount = async () => {
      if (!user) {
        setLoadingEvents(false);
        return;
      }
      setLoadingEvents(true);
      try {
        const today = Timestamp.fromDate(new Date(new Date().setHours(0, 0, 0, 0))); // Start of today
        const eventsCollectionRef = collection(db, `users/${user.uid}/calendarEvents`);
        // Assuming event.date is stored as a string 'YYYY-MM-DD' or Firestore Timestamp
        // For string dates, direct comparison 'event.date >= todayISOString' is needed
        // For Firestore Timestamps, 'where("date", ">=", today)' should work if 'date' is the field name
        
        // Adjusting query based on how dates are stored in calendarEvents
        // If 'date' in calendarEvents is a string 'YYYY-MM-DD', this query needs adjustment
        // For this example, assuming 'date' is a Firestore Timestamp representing the event start
        const q = query(
          eventsCollectionRef,
          where("status", "==", "Confirmed"),
          // If 'date' is a Timestamp field for the event's date:
          where("date", ">=", today) 
          // If 'date' is a string 'YYYY-MM-DD', you might need to fetch all confirmed events
          // and filter client-side, or structure your data/queries differently.
          // For now, this assumes 'date' can be compared with a Timestamp.
        );
        
        const querySnapshot = await getDocs(q);
        
        // If 'date' is a string, and you fetched all confirmed, filter here:
        // const todayStr = new Date().toISOString().split('T')[0];
        // const count = querySnapshot.docs.filter(doc => doc.data().date >= todayStr).length;
        // setUpcomingEventsCount(count);

        setUpcomingEventsCount(querySnapshot.size);

      } catch (error) {
        console.error("Error fetching upcoming events count:", error);
        setUpcomingEventsCount(0); // Default to 0 on error
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchUpcomingEventsCount();
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Requests</CardTitle>
            <MessageCircleMore className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {/* Booking requests count is a placeholder. Real data would require more complex backend logic 
                to determine which requests are relevant/new for this specific chef. */}
            <div className="text-2xl font-bold">{bookingRequestsCount}</div>
            <p className="text-xs text-muted-foreground">{bookingRequestsChange}</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Confirmed Events</CardTitle>
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="text-2xl font-bold">Loading...</div>
            ) : (
              <div className="text-2xl font-bold">{upcomingEventsCount ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {loadingEvents ? "Fetching data..." : `Events confirmed and upcoming.`}
            </p>
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
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trust Score</CardTitle>
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {/* Trust score is a placeholder. Real calculation/fetching needs backend logic. */}
            <div className="text-2xl font-bold">{trustScore}</div>
            <p className="text-xs text-muted-foreground">{trustScoreDescription}</p>
          </CardContent>
        </Card>
      </div>

       <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Recent activity is placeholder. Real implementation requires a feed/notification system. */}
          <ul className="space-y-3">
            {recentActivity.map((activity, index) => (
              <li key={index} className="flex items-center justify-between text-sm">
                <div>{activity.description}</div>
                <div className="text-xs text-muted-foreground">{activity.time}</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
