
'use client';

import { useState, useEffect } from 'react';
import { MenuCard } from '@/components/menu-card';
import type { Menu, CustomerRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, ListFilter, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { collection, query, where, getDocs, orderBy, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function CustomerMenusPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoadingMenus, setIsLoadingMenus] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [dietaryFilter, setDietaryFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    const fetchPublicMenus = async () => {
      setIsLoadingMenus(true);
      try {
        const menusCollectionRef = collection(db, "menus");
        const q = query(menusCollectionRef, where("isPublic", "==", true), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedMenus = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt ? (docSnap.data().createdAt as Timestamp).toDate() : undefined,
          updatedAt: docSnap.data().updatedAt ? (docSnap.data().updatedAt as Timestamp).toDate() : undefined,
        } as Menu));
        setMenus(fetchedMenus);
      } catch (error) {
        console.error("Error fetching public menus:", error);
        toast({
          title: "Error Loading Menus",
          description: "Could not fetch menus at this time. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingMenus(false);
      }
    };
    fetchPublicMenus();
  }, [toast]);

  const handleRequestMenu = async (menu: Menu) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in or create an account to request a menu.',
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }

    try {
      const requestsCollectionRef = collection(db, "customerRequests");
      const newRequest: Omit<CustomerRequest, 'id' | 'createdAt' | 'updatedAt'> = {
        eventType: `Menu Request: ${menu.title}`,
        budget: menu.pricePerHead * (menu.pax || 1),
        cuisinePreference: menu.cuisine,
        pax: menu.pax || 1,
        eventDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // Placeholder: 7 days from now
        notes: `Interested in the menu: "${menu.title}" by Chef ${menu.chefName || 'Unknown Chef'}.`,
        status: 'new',
        customerId: user.uid,
        requestedMenuId: menu.id,
        requestedMenuTitle: menu.title,
        respondingChefIds: [menu.chefId], // Directly assign to the chef who owns the menu
      };

      const docRef = await addDoc(requestsCollectionRef, {
        ...newRequest,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Request Sent!',
        description: `Your request for "${menu.title}" has been sent. Check your messages for updates.`,
      });
      router.push(`/customer/dashboard/messages?requestId=${docRef.id}`);

    } catch (error) {
      console.error("Error creating customer request:", error);
      toast({
        title: "Request Failed",
        description: "Could not send your request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredMenus = menus.filter(menu => {
    const matchesSearch = menu.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          menu.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          menu.cuisine.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (menu.chefName && menu.chefName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCuisine = cuisineFilter === 'all' || menu.cuisine.toLowerCase() === cuisineFilter.toLowerCase();
    const matchesDietary = dietaryFilter === 'all' || (menu.dietaryInfo && menu.dietaryInfo.some(d => d.toLowerCase().includes(dietaryFilter.toLowerCase())));
    return matchesSearch && matchesCuisine && matchesDietary;
  });
  
  const uniqueCuisines = useMemo(() => ['all', ...new Set(menus.map(menu => menu.cuisine).filter(Boolean).sort())], [menus]);
  const uniqueDietaryOptions = useMemo(() => ['all', ...new Set(menus.flatMap(menu => menu.dietaryInfo).filter(Boolean).sort())], [menus]);

  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Explore Our Chefs' Menus</h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground/70">
          Discover a world of flavors. Browse menus anonymously. Chef details are revealed after a booking is confirmed.
        </p>
      </header>

      <Card className="mb-8 p-6 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label htmlFor="search-menus" className="block text-sm font-medium text-foreground mb-1">Search Menus</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="search-menus"
                type="text"
                placeholder="Search by title, cuisine, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="cuisine-filter" className="block text-sm font-medium text-foreground mb-1">Filter by Cuisine</label>
            <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
              <SelectTrigger id="cuisine-filter">
                <SelectValue placeholder="All Cuisines" />
              </SelectTrigger>
              <SelectContent>
                {uniqueCuisines.map(cuisine => (
                  <SelectItem key={cuisine} value={cuisine}>{cuisine === 'all' ? 'All Cuisines' : cuisine}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
           <div>
            <label htmlFor="dietary-filter" className="block text-sm font-medium text-foreground mb-1">Filter by Dietary Need</label>
            <Select value={dietaryFilter} onValueChange={setDietaryFilter}>
              <SelectTrigger id="dietary-filter">
                <SelectValue placeholder="Any Dietary Need" />
              </SelectTrigger>
              <SelectContent>
                {uniqueDietaryOptions.map(option => (
                  <SelectItem key={option} value={option}>{option === 'all' ? 'Any Dietary Need' : option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {isLoadingMenus ? (
        <div className="text-center py-16">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Loading menus...</p>
        </div>
      ) : filteredMenus.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMenus.map(menu => (
            <MenuCard
              key={menu.id}
              menu={menu}
              showChefDetails={false} 
              onRequest={() => handleRequestMenu(menu)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <ListFilter className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground">No Menus Found</h2>
          <p className="mt-2 text-muted-foreground">
            Try adjusting your search or filters, or check back later for new menus.
          </p>
           <Button variant="link" onClick={() => { setSearchTerm(''); setCuisineFilter('all'); setDietaryFilter('all');}} className="mt-4">
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
