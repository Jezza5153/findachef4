import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, CalendarClock, DollarSign, LineChart, MessageCircleMore, NotebookText } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Bar, CartesianGrid, XAxis, YAxis, Line, ResponsiveContainer, BarChart as RechartsBarChart, LineChart as RechartsLineChart } from "recharts"
import type { ChartConfig } from "@/components/ui/chart"

constยอดBookingData = [
  { month: "Jan", bookings: 12 },
  { month: "Feb", bookings: 19 },
  { month: "Mar", bookings: 15 },
  { month: "Apr", bookings: 22 },
  { month: "May", bookings: 18 },
  { month: "Jun", bookings: 25 },
]

const menuEngagementData = [
  { menu: "Menu A", views: 150, requests: 15 },
  { menu: "Menu B", views: 120, requests: 22 },
  { menu: "Menu C", views: 90, requests: 8 },
  { menu: "Menu D", views: 200, requests: 30 },
]

const chartConfig: ChartConfig = {
  bookings: {
    label: "Bookings",
    color: "hsl(var(--primary))",
  },
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
            <MessageCircleMore className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">+2 from last week</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Menus</CardTitle>
            <NotebookText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">3 public, 9 private</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Next event in 5 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Booking Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <RechartsLineChart data={ยอดBookingData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="bookings" stroke="var(--color-bookings)" strokeWidth={2} dot={false} />
              </RechartsLineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Menu Engagement</CardTitle>
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
      </div>

      {/* Quick Actions or Recent Activity can be added here */}
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
