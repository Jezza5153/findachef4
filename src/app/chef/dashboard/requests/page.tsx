
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, CalendarDays, UserCircle, Search, CheckCircle, XCircle, FilePlus2 } from 'lucide-react';
import Image from 'next/image';

// Mock data for messages/requests
const mockRequests = [
  { id: 'req1', userName: 'Alice Smith', eventTitle: 'Birthday Party', lastMessage: 'Hi Chef, I loved your Italian Feast menu! Are you available on Nov 15th?', timestamp: '2h ago', unread: true, avatarUrl: 'https://placehold.co/80x80.png', status: 'New Request' },
  { id: 'req2', userName: 'Bob Johnson', eventTitle: 'Corporate Lunch', lastMessage: 'Can you customize the Modern French Dinner for a gluten-free guest?', timestamp: '1d ago', unread: false, avatarUrl: 'https://placehold.co/80x80.png', status: 'Pending Response' },
  { id: 'req3', userName: 'Carol White', eventTitle: 'Anniversary Dinner', lastMessage: 'Interested in a quote for a small party of 8 people.', timestamp: '3d ago', unread: false, avatarUrl: 'https://placehold.co/80x80.png', status: 'Quoted' },
  { id: 'req4', userName: 'David Lee', eventTitle: 'Wedding Catering', lastMessage: 'Booking confirmed for June 5th!', timestamp: '5d ago', unread: false, avatarUrl: 'https://placehold.co/80x80.png', status: 'Confirmed' },
];

const mockSelectedChat = {
  requestId: 'req1',
  userName: 'Alice Smith',
  avatarUrl: 'https://placehold.co/80x80.png',
  eventDetails: 'Birthday Party - Nov 15th, 12 guests',
  status: 'New Request',
  messages: [
    { id: 'msg1', sender: 'Alice Smith', text: 'Hi Chef, I loved your Italian Feast menu! Are you available on Nov 15th?', time: '10:30 AM' },
    { id: 'msg2', sender: 'Chef Julia', text: 'Hello Alice! Thank you! Yes, I am available on Nov 15th. How many guests are you expecting?', time: '10:35 AM' },
    { id: 'msg3', sender: 'Alice Smith', text: 'Great! It will be for 12 guests.', time: '10:38 AM' },
    { id: 'msg4', sender: 'Alice Smith', text: 'Is typing...', time: '10:39 AM', isTypingIndicator: true },
  ]
};


export default function ChefRequestsPage() {
  // In a real app, selectedRequest would be managed by state
  const selectedRequest = mockRequests.find(req => req.id === mockSelectedChat.requestId) || mockRequests[0];

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
            <Input placeholder="Search requests..." className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow overflow-y-auto">
          <div className="divide-y">
            {mockRequests.map(req => (
              <div key={req.id} className={`p-4 hover:bg-muted/50 cursor-pointer ${req.id === selectedRequest.id ? 'bg-muted' : ''}`}>
                <div className="flex items-start space-x-3">
                  <Image src={req.avatarUrl} alt={req.userName} width={40} height={40} className="rounded-full" data-ai-hint="person avatar" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold truncate">{req.userName}</p>
                      <p className="text-xs text-muted-foreground">{req.timestamp}</p>
                    </div>
                    <p className={`text-xs font-medium ${req.unread ? 'text-primary' : 'text-muted-foreground'}`}>{req.status} {req.unread && <span className="text-primary">&#9679; New</span>}</p>
                    <p className={`text-xs truncate ${req.unread ? 'text-foreground' : 'text-muted-foreground'}`}>{req.lastMessage}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main chat area */}
      {mockSelectedChat && (
        <Card className="w-full md:w-2/3 lg:w-3/4 flex flex-col shadow-lg">
          <CardHeader className="border-b p-4 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-3">
               <Image src={mockSelectedChat.avatarUrl} alt={mockSelectedChat.userName} width={40} height={40} className="rounded-full" data-ai-hint="person avatar" />
              <div>
                <CardTitle className="text-lg">{mockSelectedChat.userName}</CardTitle>
                {mockSelectedChat.eventDetails && <p className="text-xs text-muted-foreground">{mockSelectedChat.eventDetails}</p>}
                <p className="text-xs text-primary font-medium">{mockSelectedChat.status}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" title="Check Availability / View Booking Info">
              <CalendarDays className="h-5 w-5" />
              <span className="sr-only">Check Availability</span>
            </Button>
          </CardHeader>
          <CardContent className="p-6 flex-grow overflow-y-auto space-y-4">
            {mockSelectedChat.messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'Chef Julia' ? 'justify-end' : 'justify-start'}`}>
                {msg.isTypingIndicator ? (
                  <div className="text-xs text-muted-foreground italic px-4 py-2">
                    {msg.sender} is typing...
                  </div>
                ) : (
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${msg.sender === 'Chef Julia' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'Chef Julia' ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground/70 text-left'}`}>{msg.time}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
          <CardFooter className="p-4 border-t space-y-3">
            <div className="flex w-full items-center space-x-2">
              <Input type="text" placeholder="Type your message..." className="flex-1" />
              <Button type="submit" size="icon">
                <Send className="h-5 w-5" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
            {selectedRequest.status !== 'Confirmed' && ( // Hide actions if already confirmed
                <div className="flex w-full items-center space-x-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1">
                        <FilePlus2 className="mr-2 h-4 w-4"/> Propose Menu
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1">
                        <XCircle className="mr-2 h-4 w-4"/> Decline Request
                    </Button>
                    <Button variant="default" size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                        <CheckCircle className="mr-2 h-4 w-4"/> Accept Request
                    </Button>
                </div>
            )}
             {selectedRequest.status === 'Confirmed' && (
                <div className="text-sm text-green-600 font-medium p-2 rounded-md bg-green-50 border border-green-200 w-full text-center">
                    This booking has been confirmed.
                </div>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
