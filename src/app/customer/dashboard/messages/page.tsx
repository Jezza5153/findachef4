
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, CalendarDays, UserCircle, Search, Inbox, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

// Mock data for messages - similar to chef's request page for consistency
const mockConversations = [
  { id: 'conv1', chefName: 'Chef Julia Child', lastMessage: 'Looking forward to your birthday dinner!', timestamp: '1h ago', unread: true, avatarUrl: 'https://placehold.co/80x80.png' },
  { id: 'conv2', chefName: 'Chef Gordon Ramsey', lastMessage: 'Your quote for the corporate event is ready.', timestamp: '5h ago', unread: false, avatarUrl: 'https://placehold.co/80x80.png' },
  { id: 'conv3', chefName: 'Chef Alice Waters', lastMessage: 'Can we confirm the dietary requirements?', timestamp: '2d ago', unread: false, avatarUrl: 'https://placehold.co/80x80.png' },
];

const mockSelectedChat = {
  chefName: 'Chef Julia Child',
  messages: [
    { id: 'msg1', sender: 'Chef Julia Child', text: 'Hello! Confirming your booking for Nov 15th. Any special requests?', time: '09:15 AM' },
    { id: 'msg2', sender: 'Customer Name', text: 'Hi Chef Julia! No special requests for now, just excited!', time: '09:20 AM' },
    { id: 'msg3', sender: 'Chef Julia Child', text: 'Wonderful! I look forward to cooking for you.', time: '09:22 AM' },
  ]
};

export default function CustomerMessagesPage() {
  return (
    <div className="h-[calc(100vh-var(--header-height,10rem))] flex flex-col md:flex-row gap-6">
      {/* Sidebar for message list */}
      <Card className="w-full md:w-1/3 lg:w-1/4 flex flex-col shadow-lg">
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center"><Inbox className="mr-2 h-5 w-5 text-primary"/> Conversations</CardTitle>
            <span className="text-sm text-muted-foreground">{mockConversations.length} active</span>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search messages..." className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow overflow-y-auto">
          <div className="divide-y">
            {mockConversations.map(conv => (
              <div key={conv.id} className={`p-4 hover:bg-muted/50 cursor-pointer ${conv.id === 'conv1' ? 'bg-muted' : ''}`}>
                <div className="flex items-center space-x-3">
                  <Image src={conv.avatarUrl} alt={conv.chefName} width={40} height={40} className="rounded-full" data-ai-hint="chef portrait" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold truncate">{conv.chefName}</p>
                      <p className="text-xs text-muted-foreground">{conv.timestamp}</p>
                    </div>
                    <p className={`text-xs truncate ${conv.unread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{conv.lastMessage}</p>
                  </div>
                  {conv.unread && <div className="h-2.5 w-2.5 rounded-full bg-primary self-start mt-1"></div>}
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
             <Image src="https://placehold.co/80x80.png" alt={mockSelectedChat.chefName} width={40} height={40} className="rounded-full" data-ai-hint="chef portrait"/>
            <div>
              <CardTitle className="text-lg">{mockSelectedChat.chefName}</CardTitle>
              <p className="text-xs text-muted-foreground">Online</p> {/* Placeholder status */}
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <UserCircle className="h-5 w-5" />
            <span className="sr-only">View Chef Profile</span>
          </Button>
        </CardHeader>
        <CardContent className="p-6 flex-grow overflow-y-auto space-y-4">
          {mockSelectedChat.messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'Customer Name' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${msg.sender === 'Customer Name' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <p className="text-sm">{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.sender === 'Customer Name' ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground/70 text-left'}`}>{msg.time}</p>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter className="p-4 border-t flex flex-col space-y-3">
           <div className="flex items-center text-xs text-muted-foreground p-2 rounded-md bg-muted/50 border border-dashed w-full">
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600 flex-shrink-0" />
              <span>Remember: Keep all communication and payment on FindAChef until a booking is confirmed. Do not share personal contact details.</span>
            </div>
          <div className="flex w-full items-center space-x-2">
            <Input type="text" placeholder="Type your message to the chef..." className="flex-1" />
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

