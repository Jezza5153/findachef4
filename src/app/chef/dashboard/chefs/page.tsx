
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ChefProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, MessageSquare, ListFilter } from 'lucide-react';
import Image from 'next/image';

// Mock Chef Data
const mockChefs: ChefProfile[] = [
  {
    id: 'chef1',
    name: 'Alice Waters',
    email: 'alice@example.com',
    tagline: 'Pioneer of Californian Cuisine',
    bio: 'Passionate about fresh, local, and organic ingredients. Founder of Chez Panisse.',
    specialties: ['Californian', 'Organic', 'Farm-to-Table'],
    profilePictureUrl: 'https://placehold.co/100x100.png',
    experienceSummary: 'Over 40 years of culinary experience.',
    education: 'Studied French cuisine in Paris.',
    skills: ['Menu Development', 'Seasonal Cooking', 'Restaurant Management'],
  },
  {
    id: 'chef2',
    name: 'Gordon Ramsay',
    email: 'gordon@example.com',
    tagline: 'Multi-Michelin Starred Chef',
    bio: 'Known for his high standards and award-winning restaurants worldwide.',
    specialties: ['British', 'French', 'Fine Dining'],
    profilePictureUrl: 'https://placehold.co/100x100.png',
    experienceSummary: 'Numerous Michelin stars across multiple restaurants.',
    education: 'Trained under Marco Pierre White and Joël Robuchon.',
    skills: ['Kitchen Leadership', 'Restaurant Turnaround', 'TV Personality'],
  },
  {
    id: 'chef3',
    name: 'Jiro Ono',
    email: 'jiro@example.com',
    tagline: 'Legendary Sushi Master',
    bio: 'Dedicated his life to perfecting the art of sushi. Subject of the documentary "Jiro Dreams of Sushi".',
    specialties: ['Sushi', 'Japanese', 'Edomae-style'],
    profilePictureUrl: 'https://placehold.co/100x100.png',
    experienceSummary: 'World-renowned sushi chef.',
    education: 'Apprenticed from a young age.',
    skills: ['Fish Preparation', 'Rice Perfection', 'Omakase Menu Curation'],
  },
  {
    id: 'chef4',
    name: 'Julia Child',
    email: 'julia.c@example.com', 
    tagline: 'Brought French Cuisine to America',
    bio: 'Beloved author and television personality who demystified French cooking for American audiences.',
    specialties: ['French', 'Classic European', 'Pastry'],
    profilePictureUrl: 'https://placehold.co/100x100.png',
    experienceSummary: 'Author of "Mastering the Art of French Cooking".',
    education: 'Le Cordon Bleu, Paris.',
    skills: ['Cooking Instruction', 'Cookbook Writing', 'Sauce Making'],
  },
  {
    id: 'chef5',
    name: 'Massimo Bottura',
    email: 'massimo@example.com',
    tagline: 'Innovative Italian Chef',
    bio: 'Chef patron of Osteria Francescana, a three-Michelin-star restaurant based in Modena, Italy.',
    specialties: ['Modern Italian', 'Avant-Garde', 'Regional Italian'],
    profilePictureUrl: 'https://placehold.co/100x100.png',
    experienceSummary: 'Repeatedly ranked among the world\'s best chefs.',
    education: 'Self-taught with apprenticeships.',
    skills: ['Food Waste Reduction', 'Artistic Plating', 'Storytelling through Food'],
  },
];

export default function ChefDirectoryPage() {
  const [allChefs, setAllChefs] = useState<ChefProfile[]>(mockChefs);
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [tagSearchTerm, setTagSearchTerm] = useState<string>('');
  const { toast } = useToast();

  const uniqueSpecialties = useMemo(() => {
    const specialties = new Set<string>();
    allChefs.forEach(chef => {
      chef.specialties.forEach(spec => specialties.add(spec));
    });
    return ['all', ...Array.from(specialties).sort()];
  }, [allChefs]);

  const filteredChefs = useMemo(() => {
    return allChefs.filter(chef => {
      const matchesSpecialty = specialtyFilter === 'all' || chef.specialties.includes(specialtyFilter);
      const searchLower = tagSearchTerm.toLowerCase();
      const matchesSearch = 
        chef.name.toLowerCase().includes(searchLower) ||
        (chef.tagline && chef.tagline.toLowerCase().includes(searchLower)) ||
        chef.specialties.some(spec => spec.toLowerCase().includes(searchLower));
      return matchesSpecialty && matchesSearch;
    });
  }, [allChefs, specialtyFilter, tagSearchTerm]);

  const handleInviteCollaborate = (chefName: string) => {
    toast({
      title: 'Collaboration Invite Sent',
      description: `Your invitation to collaborate has been sent to ${chefName}. (This is a placeholder action)`,
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center">
          <Users className="mr-3 h-8 w-8 text-primary" /> Chef Directory
        </h1>
        <p className="text-sm text-muted-foreground">Find and connect with other chefs for collaboration.</p>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center text-xl"><ListFilter className="mr-2 h-5 w-5"/> Filter Chefs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search-tags" className="block text-sm font-medium text-foreground mb-1">
              Search by Name or Tag
            </label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    id="search-tags"
                    placeholder="e.g., Gordon Ramsay, Pastry, Italian..."
                    value={tagSearchTerm}
                    onChange={(e) => setTagSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
          </div>
          <div>
            <label htmlFor="specialty-filter" className="block text-sm font-medium text-foreground mb-1">
              Filter by Specialty
            </label>
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger id="specialty-filter">
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                {uniqueSpecialties.map(spec => (
                  <SelectItem key={spec} value={spec}>
                    {spec === 'all' ? 'All Specialties' : spec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredChefs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredChefs.map(chef => (
            <Card key={chef.id} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
              <CardContent className="pt-6 flex flex-col items-center text-center flex-grow">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={chef.profilePictureUrl || `https://placehold.co/100x100.png?text=${chef.name.charAt(0)}`} alt={chef.name} data-ai-hint="chef portrait" />
                  <AvatarFallback>{chef.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-semibold">{chef.name}</h3>
                {chef.tagline && <p className="text-xs text-muted-foreground mb-2">{chef.tagline}</p>}
                <div className="flex flex-wrap justify-center gap-1 my-2">
                  {chef.specialties.slice(0, 3).map(spec => ( 
                    <Badge key={spec} variant="secondary">{spec}</Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="p-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleInviteCollaborate(chef.name)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Invite to Collaborate
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12 border-dashed">
          <CardContent>
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-3" data-ai-hint="empty state users"/>
            <p className="text-muted-foreground">No chefs found matching your criteria.</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
