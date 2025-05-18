
export interface MenuIngredient {
  id: string; // for stable list rendering
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost?: number; // Calculated: quantity * costPerUnit
  notes?: string;
}

export interface Menu {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  pricePerHead: number; // Sale price per head
  dietaryInfo: string[];
  isPublic: boolean;
  chefId: string;
  chefName?: string;
  chefProfilePictureUrl?: string;
  pax?: number; // How many people this menu serves (e.g., for a set menu package)
  costPrice?: number; // Chef's final determined cost price per head
  imageUrl?: string;
  dataAiHint?: string;
  averageRating?: number;
  numberOfRatings?: number;
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  menuIngredients?: MenuIngredient[];
  calculatedTotalIngredientCost?: number; // Sum of all menuIngredients.totalCost
  calculatedCostPricePerHead?: number; // calculatedTotalIngredientCost / pax
}

export interface ParseResumeOutput {
  experience: string;
  skills: string[];
  education?: string;
}

export interface Team {
  id: string;
  name: string;
  ownerChefId: string;
  memberChefIds: string[];
  brandName?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ChefProfile {
  id: string;
  name: string;
  email: string;
  abn?: string;
  tagline?: string;
  bio: string;
  specialties: string[];
  profilePictureUrl?: string;
  experienceSummary?: string;
  skills?: string[];
  education?: string;
  portfolioItem1Url?: string;
  portfolioItem1Caption?: string;
  portfolioItem2Url?: string;
  portfolioItem2Caption?: string;
  resumeFileUrl?: string;
  role?: 'chef' | 'customer' | 'admin';
  isApproved?: boolean;
  isSubscribed?: boolean;
  createdAt?: any;
  updatedAt?: any;
  blockedDates?: string[]; // Array of ISO date strings
  trustScore?: number;
  trustScoreBasis?: string;
  teamId?: string;
  teamName?: string;
  hasCompletedFirstCoOp?: boolean;
  collaboratorIds?: string[];
  outgoingCollaborationRequests?: string[];
  incomingCollaborationRequests?: string[];
}

export interface CustomerRequest {
  id: string;
  eventType: string;
  budget: number;
  cuisinePreference: string;
  pax: number;
  eventDate: any; // Firestore Timestamp
  notes?: string;
  customerId: string;
  status?: 'new' | 'awaiting_customer_response' | 'proposal_sent' | 'chef_declined' | 'chef_accepted' | 'customer_confirmed' | 'booked' | 'cancelled_by_customer';
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  respondingChefIds?: string[];
  activeProposal?: {
    menuId: string;
    menuTitle: string;
    menuPricePerHead: number;
    chefId: string;
    chefName: string; 
    chefAvatarUrl?: string; 
    notes?: string;
    proposedAt: any; // Firestore Timestamp
  };
  declinedChefIds?: string[];
  requestedMenuId?: string; // ID of the menu if request originated from "Request This Menu"
  requestedMenuTitle?: string; // Title of the menu
}

export interface RequestMessage {
  id: string; 
  requestId: string; 
  senderId: string; 
  senderName?: string; 
  senderAvatarUrl?: string; 
  senderRole: 'chef' | 'customer' | 'system';
  text: string;
  timestamp: any; // Firestore Timestamp
}


export interface Testimonial {
  id: string;
  customerName: string;
  text: string;
  eventName?: string;
  avatarUrl?: string;
}

export interface Option {
  value: string;
  label: string;
}

export interface ShoppingListItem {
  id: string;
  chefId: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedCost: number; // This is cost per item in shopping list
  notes?: string;
  purchased: boolean;
  menuId?: string;
  eventId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CalendarEvent {
  id: string;
  chefId: string;
  date: any; // Firestore Timestamp
  title: string;
  customerName?: string;
  pax: number;
  menuName: string;
  pricePerHead: number;
  location?: string;
  notes?: string;
  coChefs?: string[];
  status: 'Confirmed' | 'Pending' | 'Cancelled' | 'WallEvent';
  weather?: string;
  toolsNeeded?: string[];
  createdAt?: any;
  updatedAt?: any;
  teamId?: string;
  isWallEvent?: boolean;
}

export interface ChefWallEvent {
  id: string;
  title: string;
  description: string;
  maxPax: number;
  eventDateTime: string; // ISO String
  location: string;
  pricePerPerson: number;
  chefsInvolved: string[];
  tags: string[];
  imageUrl?: string;
  isPublic: boolean;
  chefId: string;
  chefName: string;
  chefAvatarUrl?: string;
  dataAiHint?: string;
  createdAt?: any;
  updatedAt?: any;
  teamId?: string;
}

export interface CustomerWallPost {
  id: string;
  customerName: string;
  customerAvatarUrl?: string;
  eventType: string;
  numberOfPeople: number;
  budget: string;
  cuisinePreferences: string;
  desiredDates: string;
  extraNotes?: string;
  isPublic: boolean;
  postedAt: string;
  dataAiHint?: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profilePictureUrl?: string;
  kitchenEquipment?: string[];
  addressDetails?: string;
  defaultEventType?: string;
  defaultPax?: number;
  defaultBudget?: string; 
  defaultBudgetAmount?: number; 
  defaultFrequency?: string;
  defaultTheme?: string;
  defaultDietaryNotes?: string;
  defaultExtraComments?: string;
  role?: 'chef' | 'customer' | 'admin';
  createdAt?: any;
  updatedAt?: any;
}

export type CostType = 'Ingredient' | 'Equipment' | 'Tax' | 'BAS' | 'Travel' | 'Other';

export interface Receipt {
  id: string;
  fileName?: string;
  vendor: string;
  date: any; // Firestore Timestamp
  totalAmount: number;
  assignedToEventId?: string;
  assignedToMenuId?: string;
  costType: CostType;
  notes?: string;
  chefId: string;
  imageUrl?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface TaxAdviceInput {
  region: string;
  query: string;
}

export interface TaxAdviceOutput {
  advice: string;
  disclaimer: string;
}

export interface ActivityItem {
  id: string;
  type: string; 
  description: string;
  timestamp: any; // Firestore Timestamp
  linkTo?: string; 
  isRead?: boolean;
}

// AI Flow related types
export interface MenuItemAssistInput {
  menuTitle: string;
  currentDescription?: string;
  cuisine: string;
  keyIngredients?: string;
}

export interface MenuItemAssistOutput {
  suggestedDescription: string;
}

export interface ReceiptParserInput {
  receiptImageUri: string;
}

export interface ReceiptParserOutput {
  vendor?: string;
  date?: string; // YYYY-MM-DD
  totalAmount?: number;
  suggestedCostType?: CostType;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName?: string; 
  chefId: string;
  chefName?: string; 
  chefAvatarUrl?: string; 
  eventId?: string; 
  menuId?: string; 
  menuTitle?: string; 
  requestId?: string; 
  eventTitle: string; 
  eventDate: any; // Firestore Timestamp
  pax: number;
  pricePerHead?: number; 
  totalPrice: number;
  status: 'pending_chef_acceptance' | 'confirmed' | 'completed' | 'cancelled_by_customer' | 'cancelled_by_chef' | 'payment_failed';
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  customerNotes?: string;
  chefNotes?: string;
  location?: string;
  qrCodeScannedAt?: any; // Firestore Timestamp for event completion
}

// Enriched types for UI display
export interface EnrichedCustomerRequest extends CustomerRequest {
  proposingChef?: Pick<ChefProfile, 'name' | 'profilePictureUrl'>;
}
