// /components/Wall/WallCard.tsx

import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, Globe, Lock, Users, DollarSign, MapPin, Info, Loader2 } from "lucide-react";
import Image from "next/image";
import { ChefWallEvent, CustomerWallRequest } from "@/types";

interface WallCardProps {
  post: ChefWallEvent | CustomerWallRequest;
  onDetails: (post: ChefWallEvent | CustomerWallRequest) => void;
  onBook?: (event: ChefWallEvent) => void;
  isBooking?: boolean;
}

export default function WallCard({ post, onDetails, onBook, isBooking }: WallCardProps) {
  const isChefEvent = "pricePerPerson" in post;
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
              {(post as ChefWallEvent).isPublic ? "Public" : "Private"}
            </Badge>
          ) : null}
        </div>
        <div className="text-xs text-muted-foreground">
          {isChefEvent
            ? `Posted by: ${(post as ChefWallEvent).chefName}`
            : `Customer: ${(post as CustomerWallRequest).customerName}`}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm flex-grow pt-2">
        <p className="line-clamp-3 text-foreground/80">{post.description}</p>
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
        <button onClick={() => onDetails(post)} className="w-full btn btn-outline">
          <Info className="mr-1 h-4 w-4" /> Details
        </button>
        {isChefEvent && (post as ChefWallEvent).isPublic && onBook && (
          <button onClick={() => onBook(post as ChefWallEvent)} disabled={isBooking} className="w-full btn btn-primary">
            {isBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Book
          </button>
        )}
      </CardFooter>
    </Card>
  );
}
