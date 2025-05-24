import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Globe, Lock, Users, DollarSign, MapPin, Info, Loader2 } from "lucide-react";
import Image from "next/image";
import type { ChefWallEvent, CustomerWallRequest } from "@/types";

interface WallCardProps {
  post: ChefWallEvent | CustomerWallRequest;
  onDetails: (post: ChefWallEvent | CustomerWallRequest) => void;
  onBook?: (event: ChefWallEvent) => void;
  isBooking?: boolean;
}

export default function WallCard({ post, onDetails, onBook, isBooking }: WallCardProps) {
  const isChefEvent = "pricePerPerson" in post;
  const chefEvent = isChefEvent ? (post as ChefWallEvent) : null;
  const tags = post.tags || [];

  return (
    <Card className="shadow-lg flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-200">
      {/* Image/Header */}
      {isChefEvent && chefEvent?.imageUrl ? (
        <Image
          src={chefEvent.imageUrl}
          alt={chefEvent.title || "Chef event"}
          width={600}
          height={300}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground">
          <LayoutGrid className="h-16 w-16 opacity-50" />
        </div>
      )}

      <CardHeader className="pb-2 pt-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{post.title}</CardTitle>
          {isChefEvent && (
            <Badge variant={chefEvent.isPublic ? "default" : "secondary"} className="text-xs">
              {chefEvent.isPublic ? <Globe className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />}
              {chefEvent.isPublic ? "Public" : "Private"}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {isChefEvent
            ? `Posted by: ${chefEvent.chefName || ""}`
            : `Customer: ${(post as CustomerWallRequest).customerName || ""}`}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm flex-grow pt-2">
        <p className="line-clamp-3 text-foreground/80">{post.description}</p>
        <div className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-primary" /> {post.location}</div>
        {isChefEvent && (
          <>
            <div className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-green-600" /> ${chefEvent.pricePerPerson?.toFixed(2)}/person</div>
            <div className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary" /> Max {chefEvent.maxPax} guests</div>
          </>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 border-t bg-muted/20 flex gap-2">
        <Button variant="outline" onClick={() => onDetails(post)} className="flex-1">
          <Info className="mr-1 h-4 w-4" /> Details
        </Button>
        {isChefEvent && chefEvent.isPublic && onBook && (
          <Button
            variant="default"
            onClick={() => onBook(chefEvent)}
            disabled={isBooking}
            className="flex-1"
          >
            {isBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Book
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
