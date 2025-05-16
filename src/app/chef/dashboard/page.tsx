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
  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2"> {/* Adjusted grid for 2 cards */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Requests</CardTitle>
            <MessageCircleMore className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div> {/* Placeholder */}
            <p className="text-xs text-muted-foreground">+2 from last week</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div> {/* Placeholder */}
            <p className="text-xs text-muted-foreground">Next event in 5 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Menu Engagement Stats</CardTitle>
          </CardHeader>
          <CardContent>
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
            <div className="text-2xl font-bold">4.8/5</div> {/* Placeholder */}
            <p className="text-xs text-muted-foreground">Based on reviews & platform activity</p>
          </CardContent>
        </Card>
      </div>

       <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-center justify-between text-sm">
              <div>New booking request for "Italian Feast" menu.</div>
              <div className="text-xs text-muted-foreground">2 hours ago</div>
            </li>
            <li className="flex items-center justify-between text-sm">
              <div>"Summer BBQ Special" menu published.</div>
              <div className="text-xs text-muted-foreground">1 day ago</div>
            </li>
            <li className="flex items-center justify-between text-sm">
              <div>Message from Jane Doe regarding birthday party.</div>
              <div className="text-xs text-muted-foreground">3 days ago</div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
