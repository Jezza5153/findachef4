import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, CalendarDays, UserCircle, Search } from 'lucide-react';
import Image from 'next/image';

// Mock data for messages/requests
const mockRequests = [
  { id: 'req1', userName: 'Alice Smith', lastMessage: 'Hi Chef, I loved your Italian Feast menu! Are you available on Nov 15th?', timestamp: '2h ago', unread: true, avatarUrl: 'https://placehold.co/80x80.png' },
  { id: 'req2', userName: 'Bob Johnson', lastMessage: 'Can you customize the Modern French Dinner for a gluten-free guest?', timestamp: '1d ago', unread: false, avatarUrl: 'https://placehold.co/80x80.png' },
  { id: 'req3', userName: 'Carol White', lastMessage: 'Interested in a quote for a small party of 8 people.', timestamp: '3d ago', unread: false, avatarUrl: 'https://placehold.co/80x80.png' },
];

const mockSelectedChat = {
  userName: 'Alice Smith',
  messages: [
    { id: 'msg1', sender: 'Alice Smith', text: 'Hi Chef, I loved your Italian Feast menu! Are you available on Nov 15th?', time: '10:30 AM' },
    { id: 'msg2', sender: 'Chef Julia', text: 'Hello Alice! Thank you! Yes, I am available on Nov 15th. How many guests are you expecting?', time: '10:35 AM' },
    { id: 'msg3', sender: 'Alice Smith', text: 'Great! It will be for 12 guests.', time: '10:38 AM' },
  ]
};


export default function ChefRequestsPage() {
  return (
    <div className="h-[calc(100vh-var(--header-height,10rem))] flex flex-col md:flex-row gap-6"> {/* Adjust height based on your header */}
      {/* Sidebar for message list */}
      <Card className="w-full md:w-1/3 lg:w-1/4 flex flex-col shadow-lg">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Inbox</CardTitle>
            <span className="text-sm text-muted-foreground">{mockRequests.length} conversations</span>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search messages..." className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow overflow-y-auto">
          <div className="divide-y">
            {mockRequests.map(req => (
              <div key={req.id} className={`p-4 hover:bg-muted/50 cursor-pointer ${req.id === 'req1' ? 'bg-muted' : ''}`}>
                <div className="flex items-center space-x-3">
                  <Image src={req.avatarUrl} alt={req.userName} width={40} height={40} className="rounded-full" data-ai-hint="person avatar" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold truncate">{req.userName}</p>
                      <p className="text-xs text-muted-foreground">{req.timestamp}</p>
                    </div>
                    <p className={`text-xs truncate ${req.unread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{req.lastMessage}</p>
                  </div>
                  {req.unread && <div className="h-2.5 w-2.5 rounded-full bg-primary self-start mt-1"></div>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main chat area */}
      <Card className="w-full md:w-2/3 lg:w-3/4 flex flex-col shadow-lg">
        <CardHeader className="border-b p-4 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-3">
             <Image src="https://placehold.co/80x80.png" alt={mockSelectedChat.userName} width={40} height={40} className="rounded-full" data-ai-hint="person avatar" />
            <div>
              <CardTitle className="text-lg">{mockSelectedChat.userName}</CardTitle>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <CalendarDays className="h-5 w-5" />
            <span className="sr-only">Check Availability</span>
          </Button>
        </CardHeader>
        <CardContent className="p-6 flex-grow overflow-y-auto space-y-4">
          {mockSelectedChat.messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'Chef Julia' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${msg.sender === 'Chef Julia' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <p className="text-sm">{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.sender === 'Chef Julia' ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground/70 text-left'}`}>{msg.time}</p>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="p-4 border-t">
          <div className="flex w-full items-center space-x-2">
            <Input type="text" placeholder="Type your message..." className="flex-1" />
            <Button type="submit" size="icon">
              <Send className="h-5 w-5" />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
