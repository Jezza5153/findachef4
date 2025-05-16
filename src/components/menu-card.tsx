'use client';

import Image from 'next/image';
import type { Menu } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChefHat, DollarSign, Eye, EyeOff, Leaf, Users, WheatOff, Vegan as VeganIcon } from 'lucide-react';

interface MenuCardProps {
  menu: Menu;
  showChefDetails?: boolean; // To control anonymity
  onEdit?: (menuId: string) => void;
  onDelete?: (menuId: string) => void;
  onRequest?: (menuId: string) => void; // For customer requesting a menu
  isChefOwner?: boolean; // If the current user is the chef who owns this menu
}

export function MenuCard({ menu, showChefDetails = false, onEdit, onDelete, onRequest, isChefOwner = false }: MenuCardProps) {
  
  const getDietaryIcon = (dietaryItem: string) => {
    if (dietaryItem.toLowerCase().includes('vegetarian')) return <Leaf className="h-4 w-4 text-green-600" />;
    if (dietaryItem.toLowerCase().includes('vegan')) return <VeganIcon className="h-4 w-4 text-green-700" />;
    if (dietaryItem.toLowerCase().includes('gluten-free')) return <WheatOff className="h-4 w-4 text-yellow-600" />;
    return null;
  };

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <CardHeader className="p-0 relative">
        <Image
          src={menu.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(menu.title)}`}
          alt={menu.title}
          width={600}
          height={400}
          className="w-full h-48 object-cover"
          data-ai-hint="food photography"
        />
        {isChefOwner && (
            <Badge variant={menu.isPublic ? "default" : "secondary"} className="absolute top-2 right-2">
                {menu.isPublic ? <Eye className="mr-1 h-3 w-3" /> : <EyeOff className="mr-1 h-3 w-3" />}
                {menu.isPublic ? 'Public' : 'Private'}
            </Badge>
        )}
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <CardTitle className="text-2xl font-semibold mb-2">{menu.title}</CardTitle>
        {showChefDetails && menu.chefName && (
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            {menu.chefProfilePictureUrl ? (
              <Image 
                src={menu.chefProfilePictureUrl} 
                alt={menu.chefName} 
                width={24} height={24} 
                className="rounded-full mr-2"
                data-ai-hint="chef portrait"
              />
            ) : (
              <ChefHat className="h-4 w-4 mr-2" />
            )}
            <span>By Chef {menu.chefName}</span>
          </div>
        )}
        <div className="flex items-center text-sm text-primary mb-1">
          <ChefHat className="h-4 w-4 mr-1.5" />
          <span>{menu.cuisine}</span>
        </div>
        <CardDescription className="text-sm text-foreground/80 mb-4 line-clamp-3">{menu.description}</CardDescription>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center text-muted-foreground">
            <DollarSign className="h-4 w-4 mr-1.5 text-green-600" />
            Price: <span className="font-semibold text-foreground ml-1">${menu.pricePerHead.toFixed(2)} per head</span>
          </div>
          {menu.pax && (
            <div className="flex items-center text-muted-foreground">
              <Users className="h-4 w-4 mr-1.5" />
              Serves: <span className="font-semibold text-foreground ml-1">{menu.pax} people</span>
            </div>
          )}
        </div>

        {menu.dietaryInfo && menu.dietaryInfo.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Dietary Options:</h4>
            <div className="flex flex-wrap gap-2">
              {menu.dietaryInfo.map((item) => (
                <Badge key={item} variant="outline" className="flex items-center gap-1 text-xs">
                  {getDietaryIcon(item)}
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-6 bg-muted/30 mt-auto">
        {isChefOwner && onEdit && onDelete && (
          <div className="flex space-x-2 w-full">
            <Button variant="outline" size="sm" onClick={() => onEdit(menu.id)} className="flex-1">Edit</Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(menu.id)} className="flex-1">Delete</Button>
          </div>
        )}
        {!isChefOwner && onRequest && (
          <Button onClick={() => onRequest(menu.id)} className="w-full" variant="default">
            Request this Menu
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
