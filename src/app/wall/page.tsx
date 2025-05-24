'use client';

import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection, query, where, orderBy, onSnapshot, getDocs, addDoc, serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Loader2, LayoutGrid, Globe, Lock, MessageSquare, CalendarSearch, MapPin, Users, DollarSign, Info } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// --- Types ---
import type { ChefWallEvent, CustomerWallPost, Comment as WallComment } from '@/types/wall';

// --- Constants ---
const WALL_TAB_BOTH = 'Both';
const WALL_TAB_CHEF = 'Chef Wall';
const WALL_TAB_CUSTOMER = 'Customer Wall';
const TABS_CHEF = [WALL_TAB_BOTH, WALL_TAB_CHEF, WALL_TAB_CUSTOMER];
const TABS_CUSTOMER = [WALL_TAB_CUSTOMER];

// --- Custom Data Fetching Hooks ---
function useChefWallEvents(isChef: boolean, userId?: string) {
  const [events, setEvents] = useState<ChefWallEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, "chefWallEvents"), orderBy("eventDateTime", "asc"));
    if (!isChef) {
      // Customers see only public events
      q = query(collection(db, "chefWallEvents"), where("isPublic", "==", true), orderBy("eventDateTime", "asc"));
    }
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map(doc => ({
        id: doc.id, ...doc.data(),
        eventDateTime: doc.data().eventDateTime instanceof Timestamp
          ? doc.data().eventDateTime.toDate().toISOString()
          : doc.data().eventDateTime,
        createdAt: doc.data().createdAt?.toDate?.() || null,
        updatedAt: doc.data().updatedAt?.toDate?.() || null,
      }) as ChefWallEvent));
      setLoading(false);
    });
    return () => unsub();
  }, [isChef, userId]);

  return { events, loading };
}

function useCustomerWallPosts() {
  const [posts, setPosts] = useState<CustomerWallPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "customerWallPosts"), where("isPublic", "==", true), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(doc => ({
        id: doc.id, ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null,
        updatedAt: doc.data().updatedAt?.toDate?.() || null,
      }) as CustomerWallPost));
      setLoading(false);
    });
    return () => unsub();
  }, []);
  return { posts, loading };
}

// --- Main Wall Page ---
export default function WallPage() {
  const { user, userProfile, isChef, isCustomer, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // --- Tab logic based on role ---
  const [activeTab, setActiveTab] = useState<string>(WALL_TAB_CUSTOMER);
  useEffect(() => {
    if (isChef) setActiveTab(WALL_TAB_BOTH);
    if (isCustomer) setActiveTab(WALL_TAB_CUSTOMER);
  }, [isChef, isCustomer]);

  // --- Data Fetching (custom hooks) ---
  const { events: chefEvents, loading: loadingChef } = useChefWallEvents(isChef, user?.uid);
  const { posts: customerWallPosts, loading: loadingCustomer } = useCustomerWallPosts();

  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPost, setSelectedPost] = useState<ChefWallEvent | CustomerWallPost | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // --- Comments logic ---
  const [comments, setComments] = useState<WallComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommentLoading, setIsCommentLoading] = useState(false);

  // --- Permissions: Only logged-in users ---
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/wall');
    }
  }, [authLoading, user, router]);

  // --- Filtered content based on search and tab ---
  const filteredChefEvents = useMemo(() => {
    return chefEvents.filter(ev => {
      const s = searchTerm.toLowerCase();
      return (
        ev.title?.toLowerCase().includes(s) ||
        ev.description?.toLowerCase().includes(s) ||
        ev.location?.toLowerCase().includes(s) ||
        (ev.chefName && ev.chefName.toLowerCase().includes(s)) ||
        (ev.tags && ev.tags.some((tag: string) => tag.toLowerCase().includes(s)))
      );
    });
  }, [chefEvents, searchTerm]);

  const filteredCustomerPosts = useMemo(() => {
    return customerWallPosts.filter(post => {
      const s = searchTerm.toLowerCase();
      return (
        post.title?.toLowerCase().includes(s) ||
        post.description?.toLowerCase().includes(s) ||
        post.location?.toLowerCase().includes(s) ||
        (post.customerName && post.customerName.toLowerCase().includes(s)) ||
        (post.tags && post.tags.some((tag: string) => tag.toLowerCase().includes(s)))
      );
    });
  }, [customerWallPosts, searchTerm]);

  // --- Format date for display ---
  function formatEventDateTimeForDisplay(dateTimeString: string | undefined) {
    if (!dateTimeString) return "Date TBD";
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
      return String(dateTimeString);
    }
  }

  // --- View details handler ---
  function handleViewDetails(post: ChefWallEvent | CustomerWallPost) {
    setSelectedPost(post);
    setIsDetailsOpen(true);
    fetchComments(post);
  }

  // --- Comments fetch/post ---
  async function fetchComments(post: ChefWallEvent | CustomerWallPost) {
    setIsCommentLoading(true);
    try {
      const collectionPath =
        'pricePerPerson' in post
          ? `chefWallEvents/${post.id}/comments`
          : `customerWallPosts/${post.id}/comments`;
      const q = query(collection(db, collectionPath), orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WallComment)));
    } catch {
      setComments([]);
    } finally {
      setIsCommentLoading(false);
    }
  }
  async function handlePostComment() {
    if (!user || !selectedPost || !newComment.trim()) return;
    setIsCommentLoading(true);
    try {
      const collectionPath =
        'pricePerPerson' in selectedPost
          ? `chefWallEvents/${selectedPost.id}/comments`
          : `customerWallPosts/${selectedPost.id}/comments`;
      await addDoc(collection(db, collectionPath), {
        userId: user.uid,
        userName: user.displayName || user.email || 'User',
        userAvatar: user.photoURL || '',
        comment: newComment,
        createdAt: serverTimestamp()
      });
      setNewComment('');
      fetchComments(selectedPost);
    } catch (e) {
      toast({ title: "Error", description: "Failed to post comment.", variant: "destructive" });
    } finally {
      setIsCommentLoading(false);
    }
  }

  // --- UI: Tabs ---
  function Tabs() {
    const tabs = isChef ? TABS_CHEF : TABS_CUSTOMER;
    return (
      <div className="flex mb-8 gap-2 justify-center">
        {tabs.map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>
    );
  }

  // --- UI: Wall Card ---
  function WallCard({ post }: { post: ChefWallEvent | CustomerWallPost }) {
    const isChefEvent = 'pricePerPerson' in post;
    return (
      <Card className="shadow-lg flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-200">
        {/* Image/Header */}
        {isChefEvent && (post as ChefWallEvent).imageUrl ? (
          <Image
            src={(post as ChefWallEvent).imageUrl}
            alt={post.title}
            width={600}
            height={300}
            className="w-full h-48 object-cover"
            data-ai-hint={post.dataAiHint || "event food crowd"}
          />
        ) : (
          <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground">
            <LayoutGrid className="h-16 w-16 opacity-50" />
          </div>
        )}

        <CardHeader className="pb-2 pt-4">
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl">{post.title}</CardTitle>
            {isChefEvent ? (
              <Badge variant={(post as ChefWallEvent).isPublic ? "default" : "secondary"} className="text-xs">
                {(post as ChefWallEvent).isPublic ? <Globe className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />}
                {(post as ChefWallEvent).isPublic ? 'Public' : 'Private'}
              </Badge>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            {isChefEvent
              ? `Posted by: ${(post as ChefWallEvent).chefName}`
              : `Customer: ${(post as CustomerWallPost).customerName}`}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm flex-grow pt-2">
          <p className="line-clamp-3 text-foreground/80">{post.description}</p>
          <div className="flex items-center">
            <CalendarSearch className="mr-2 h-4 w-4 text-primary" />
            {formatEventDateTimeForDisplay(isChefEvent ? (post as ChefWallEvent).eventDateTime : (post as CustomerWallPost).eventDateTime)}
          </div>
          <div className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" /> {post.location}</div>
          {isChefEvent && (
            <>
              <div className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-green-600" /> ${(post as ChefWallEvent).pricePerPerson?.toFixed(2)}/person</div>
              <div className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary" /> Max {(post as ChefWallEvent).maxPax} guests</div>
            </>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {post.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
            </div>
          )}
        </CardContent>
        <CardFooter className="p-4 border-t bg-muted/20 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleViewDetails(post)} className="flex-1">
            <Info className="mr-1 h-4 w-4" /> Details
          </Button>
          {/* You can add "Book"/"Join" buttons here as needed */}
        </CardFooter>
      </Card>
    );
  }

  // --- Main render ---
  if (authLoading || loadingChef || loadingCustomer) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading Wall...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-2">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center justify-center">
          <LayoutGrid className="mr-3 h-8 w-8 text-primary" /> FindAChef Wall
        </h1>
        <p className="mt-2 text-foreground/70">Browse chef events & customer experiences. Connect, comment, and discover new opportunities.</p>
      </header>

      <Tabs />

      <Card className="mb-8 p-4 shadow-md">
        <label htmlFor="search-events" className="block text-sm font-medium text-foreground mb-1">Search Wall</label>
        <div className="relative">
          <Input
            id="search-events"
            type="text"
            placeholder="Search by title, location, or tags..."
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Wall Content */}
      {(activeTab === WALL_TAB_BOTH || activeTab === WALL_TAB_CHEF) && isChef && (
        <>
          <h2 className="text-2xl font-semibold my-4">Chef Wall Events</h2>
          {filteredChefEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredChefEvents.map(ev => <WallCard key={ev.id} post={ev} />)}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No chef events found.</div>
          )}
        </>
      )}
      {(activeTab === WALL_TAB_BOTH || activeTab === WALL_TAB_CUSTOMER) && (
        <>
          <h2 className="text-2xl font-semibold my-4">Customer Wall</h2>
          {filteredCustomerPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomerPosts.map(post => <WallCard key={post.id} post={post} />)}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No customer wall posts found.</div>
          )}
        </>
      )}

      {/* Post details dialog (with comments) */}
      {selectedPost && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl">{selectedPost.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto p-1">
              <div>
                <p className="text-foreground/90">{selectedPost.description}</p>
                <div className="text-xs text-muted-foreground">
                  {selectedPost.location} | {formatEventDateTimeForDisplay(
                    'eventDateTime' in selectedPost ? selectedPost.eventDateTime : selectedPost.eventDateTime
                  )}
                </div>
                {selectedPost.tags && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedPost.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                  </div>
                )}
              </div>
              {/* Comments thread */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center"><MessageSquare className="mr-2 h-4 w-4" />Comments</h4>
                <div className="max-h-40 overflow-y-auto bg-muted/30 rounded-md p-2 mb-2">
                  {isCommentLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : comments.length === 0
                      ? <div className="text-xs text-muted-foreground">No comments yet.</div>
                      : comments.map(c => (
                        <div key={c.id} className="mb-1">
                          <span className="font-semibold text-xs">{c.userName}:</span> <span className="text-xs">{c.comment}</span>
                        </div>
                      ))
                  }
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1"
                    disabled={!user || isCommentLoading}
                  />
                  <Button size="sm" onClick={handlePostComment} disabled={!newComment.trim() || isCommentLoading || !user}>Post</Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
