
'use client';

import { useState, useEffect } from 'react';
import { MenuCard } from '@/components/menu-card';
import type { Menu } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, ListFilter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Mock public menus data
const mockPublicMenus: Menu[] = [
  {
    id: 'pub1',
    title: 'Gourmet Burger Experience',
    description: 'Juicy gourmet burgers with artisanal buns and a variety of toppings. Comes with hand-cut fries.',
    cuisine: 'American',
    pricePerHead: 45,
    dietaryInfo: ['Vegetarian Option (Beyond Burger)'],
    isPublic: true,
    imageUrl: 'https://placehold.co/600x400.png',
    pax: 4,
    averageRating: 4.5,
    numberOfRatings: 25,
    dataAiHint: "burger gourmet",
  },
  {
    id: 'pub2',
    title: 'Authentic Thai Green Curry',
    description: 'Aromatic Thai green curry with chicken or tofu, served with jasmine rice. Spicy and flavorful.',
    cuisine: 'Thai',
    pricePerHead: 55,
    dietaryInfo: ['Vegan Option', 'Gluten-Free'],
    isPublic: true,
    imageUrl: 'https://placehold.co/600x400.png',
    pax: 6,
    averageRating: 4.8,
    numberOfRatings: 40,
    dataAiHint: "thai curry",
  },
  {
    id: 'pub3',
    title: 'Spanish Tapas Selection',
    description: 'A vibrant selection of traditional Spanish tapas, perfect for sharing. Includes patatas bravas, gambas al ajillo, and more.',
    cuisine: 'Spanish',
    pricePerHead: 65,
    dietaryInfo: [],
    isPublic: true,
    imageUrl: 'https://placehold.co/600x400.png',
    pax: 8,
    averageRating: 4.2,
    numberOfRatings: 18,
    dataAiHint: "spanish tapas",
  },
   {
    id: 'pub4',
    title: 'Fresh Sushi Platter',
    description: 'Assortment of fresh nigiri, sashimi, and maki rolls. Prepared with high-quality seafood.',
    cuisine: 'Japanese',
    pricePerHead: 80,
    dietaryInfo: ['Gluten-Free (with tamari)'],
    isPublic: true,
    imageUrl: 'https://placehold.co/600x400.png',
    pax: 2,
    averageRating: 4.9,
    numberOfRatings: 55,
    dataAiHint: "sushi platter",
  },
  {
    id: 'pub5',
    title: 'Italian Pasta Workshop',
    description: 'Hands-on pasta making class followed by a delicious meal with your creations.',
    cuisine: 'Italian',
    pricePerHead: 70,
    dietaryInfo: ['Vegetarian Option'],
    isPublic: true,
    imageUrl: 'https://placehold.co/600x400.png',
    pax: 10,
    averageRating: 4.6,
    numberOfRatings: 30,
    dataAiHint: "pasta workshop",
  },
];

export default function CustomerMenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [dietaryFilter, setDietaryFilter] = useState('all');
  const { toast } = useToast();

  // Simulate fetching menus
  useEffect(() => {
    // In a real app, you'd fetch this data
    setMenus(mockPublicMenus);
  }, []);

  const handleRequestMenu = (menuId: string) => {
    const requestedMenu = menus.find(m => m.id === menuId);
    // Simulate sending an anonymized request
    toast({
      title: 'Availability Check & Request Sent (Simulated)',
      description: `Your request for "${requestedMenu?.title}" has been sent. The chef will be in touch if available.`,
    });
    // In a real app, this would trigger a notification/message to the chef without revealing identities yet.
  };

  const filteredMenus = menus.filter(menu => {
    const matchesSearch = menu.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          menu.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          menu.cuisine.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCuisine = cuisineFilter === 'all' || menu.cuisine.toLowerCase() === cuisineFilter.toLowerCase();
    const matchesDietary = dietaryFilter === 'all' || (menu.dietaryInfo && menu.dietaryInfo.some(d => d.toLowerCase().includes(dietaryFilter.toLowerCase())));
    return matchesSearch && matchesCuisine && matchesDietary;
  });
  
  const uniqueCuisines = ['all', ...new Set(mockPublicMenus.map(menu => menu.cuisine).filter(Boolean))];
  const uniqueDietaryOptions = ['all', ...new Set(mockPublicMenus.flatMap(menu => menu.dietaryInfo).filter(Boolean))];


  return (
    <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Explore Our Chefs' Menus</h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground/70">
          Discover a world of flavors. Check availability and request a menu to connect with talented chefs.
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

      {filteredMenus.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMenus.map(menu => (
            <MenuCard
              key={menu.id}
              menu={menu}
              showChefDetails={false} // Anonymized: chef details not shown
              onRequest={handleRequestMenu}
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
