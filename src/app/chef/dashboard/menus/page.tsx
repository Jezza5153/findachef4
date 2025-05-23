
'use client';

import React, { useState, useEffect, ChangeEvent, useMemo, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MenuCard } from '@/components/menu-card';
import type { Menu, Option, ShoppingListItem, MenuIngredient, AppUserProfileContext, ChefProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, NotebookText, Eye, EyeOff, ShoppingCart, AlertCircle, Sparkles, UploadCloud, Loader2, PackagePlus, PackageMinus, Calculator, InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, serverTimestamp, Timestamp, setDoc, onSnapshot, orderBy, writeBatch, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject, StorageReference } from 'firebase/storage';
import Image from 'next/image';
import { assistMenuItem, type MenuItemAssistInput } from '@/ai/flows/menu-item-assist-flow';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';

const Dialog = dynamic(() => import('@/components/ui/dialog').then(mod => mod.Dialog), { 
  ssr: false,
  loading: () => <p>Loading dialog...</p> 
});
const DialogContent = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogContent), { ssr: false });
const DialogHeader = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogHeader), { ssr: false });
const DialogTitle = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogTitle), { ssr: false });
const DialogFooter = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogFooter), { ssr: false });
const DialogClose = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogClose), { ssr: false });
const ShadDialogDescription = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogDescription), { ssr: false });


const dietaryOptions: Option[] = [
  { value: 'Vegetarian', label: 'Vegetarian' },
  { value: 'Vegan', label: 'Vegan' },
  { value: 'Gluten-Free', label: 'Gluten-Free' },
  { value: 'Dairy-Free', label: 'Dairy-Free' },
  { value: 'Nut-Free', label: 'Nut-Free' },
];

const menuIngredientSchema = z.object({
  id: z.string().default(() => uuidv4()),
  name: z.string().min(1, { message: "Ingredient name is required." }),
  quantity: z.coerce.number().min(0.01, { message: "Quantity must be positive." }),
  unit: z.string().min(1, { message: "Unit is required." }),
  costPerUnit: z.coerce.number().min(0, { message: "Cost per unit must be non-negative." }).default(0),
  totalCost: z.coerce.number().optional(),
  notes: z.string().max(200, "Notes too long").optional().default('')
});

const menuFormSchema = z.object({
  title: z.string().min(3, { message: 'Menu title must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }).max(500, "Max 500 characters"),
  cuisine: z.string().min(2, { message: 'Cuisine type is required.' }),
  pricePerHead: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
  pax: z.coerce.number().min(1, { message: 'PAX must be at least 1.' }).default(1),
  costPrice: z.coerce.number().min(0, { message: 'Cost price must be non-negative.' }).default(0),
  dietaryInfo: z.array(z.string()).optional().default([]),
  isPublic: z.boolean().default(false),
  menuImageFile: z.instanceof(File).optional()
    .refine(file => !file || file.size <= 2 * 1024 * 1024, `Max image size is 2MB.`)
    .refine(file => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), `Only JPG, PNG, WEBP files are allowed.`),
  dataAiHint: z.string().max(40, "Hint should be brief, max 2 words.").optional().default(''),
  menuIngredients: z.array(menuIngredientSchema).optional().default([]),
})
.refine(data => {
  if (data.isPublic && (!data.menuIngredients || data.menuIngredients.length === 0)) {
    // Temporarily disable this rule for easier testing, can be re-enabled
    // return false; 
  }
  return true;
}, {
  message: "Public menus should ideally have ingredients listed for cost calculation. You can save as private for now.",
  path: ['isPublic'],
});

type MenuFormValues = z.infer<typeof menuFormSchema>;

export default function MenuManagementPage() {
  const { user, userProfile, isChefSubscribed, authLoading } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [menuImageFile, setMenuImageFile] = useState<File | null>(null);
  const [menuImagePreview, setMenuImagePreview] = useState<string | null>(null);
  const [isAiAssisting, setIsAiAssisting] = useState(false);

  const { toast } = useToast();

  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: {
      title: '',
      description: '',
      cuisine: '',
      pricePerHead: 0,
      dietaryInfo: [],
      isPublic: false,
      menuImageFile: undefined,
      pax: 1,
      costPrice: 0,
      dataAiHint: '',
      menuIngredients: [],
    },
  });

  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient, replace: replaceIngredients } = useFieldArray({
    control: form.control,
    name: "menuIngredients",
  });

  const watchedIngredients = form.watch("menuIngredients");
  const watchedPax = form.watch("pax");

  const calculatedTotalIngredientCost = useMemo(() => {
    return watchedIngredients?.reduce((sum, ingredient) => {
      const quantity = Number(ingredient.quantity) || 0;
      const costPerUnit = Number(ingredient.costPerUnit) || 0;
      return sum + (quantity * costPerUnit);
    }, 0) || 0;
  }, [watchedIngredients]);

  const calculatedCostPricePerHead = useMemo(() => {
    const pax = Number(watchedPax) || 1; 
    return calculatedTotalIngredientCost / Math.max(1, pax);
  }, [calculatedTotalIngredientCost, watchedPax]);

  useEffect(() => {
    if (authLoading || !user) {
      setIsLoadingData(false);
      if (!authLoading && !user) setMenus([]);
      return;
    }
    console.log("MenusPage: useEffect for fetching menus. User ID:", user.uid);
    setIsLoadingData(true);
    const menusCollectionRef = collection(db, "menus");
    const q = query(menusCollectionRef, where("chefId", "==", user.uid), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log("MenusPage: Menus snapshot received. Docs count:", querySnapshot.docs.length);
      const fetchedMenus: Menu[] = querySnapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt as any) : undefined),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt as any) : undefined),
        } as Menu;
      });
      setMenus(fetchedMenus);
      setIsLoadingData(false);
    }, (error) => {
      console.error("MenuManagementPage: Error fetching menus:", error);
      toast({ title: "Error Fetching Menus", description: `Could not fetch your menus: ${error.message}`, variant: "destructive" });
      setMenus([]);
      setIsLoadingData(false);
    });

    return () => {
      console.log("MenusPage: Unsubscribing from menus listener.");
      unsubscribe();
    };
  }, [user, authLoading, toast]);

  const handleMenuImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('menuImageFile', file, { shouldValidate: true });
      setMenuImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMenuImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue('menuImageFile', undefined);
      setMenuImageFile(null);
      setMenuImagePreview(editingMenu?.imageUrl || null); 
    }
  };

  const onSubmit = async (data: MenuFormValues) => {
    console.log("MenusPage: onSubmit triggered. Data:", data);
    if (!user || !userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in to manage menus.", variant: "destructive" });
      return;
    }
    if (data.isPublic && !isChefSubscribed && !(userProfile as ChefProfile)?.isAdmin) {
      toast({ title: "Subscription Required", description: "An active subscription is needed to publish menus publicly.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    let imageUrlToSave = editingMenu?.imageUrl || ''; 
    const menuIdForPath = editingMenu?.id || doc(collection(db, 'menus')).id; 
    console.log("MenusPage: Saving menu. ID for path:", menuIdForPath);

    try {
      if (menuImageFile) {
        console.log("MenusPage: New menu image file selected. Attempting upload...");
        if (editingMenu?.imageUrl && editingMenu.imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
          try {
            console.log("MenusPage: Deleting old menu image:", editingMenu.imageUrl);
            const oldImageRef: StorageReference = storageRef(storage, editingMenu.imageUrl);
            await deleteObject(oldImageRef);
            console.log("MenusPage: Old menu image deleted successfully.");
          } catch (deleteError: any) {
            if (deleteError.code !== 'storage/object-not-found') {
              console.warn("MenuManagementPage: Could not delete old menu image during update:", deleteError.message);
            } else {
              console.log("MenusPage: Old menu image not found, proceeding with upload.");
            }
          }
        }

        const fileExtension = menuImageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const imagePath = `users/${user.uid}/menus/${menuIdForPath}/image.${fileExtension}`;
        const imageStorageRefInstance = storageRef(storage, imagePath);
        console.log("MenusPage: Uploading new menu image to:", imagePath);

        toast({ title: "Uploading image...", description: "Please wait." });
        const uploadTask = uploadBytesResumable(imageStorageRefInstance, menuImageFile);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log('Upload is ' + progress + '% done');
            },
            (error) => {
              console.error("MenuManagementPage: Menu image upload error:", error);
              toast({ title: "Image Upload Failed", description: `Image upload failed: ${error.message}`, variant: "destructive" });
              reject(error);
            },
            async () => {
              try {
                imageUrlToSave = await getDownloadURL(uploadTask.snapshot.ref);
                console.log("MenusPage: New menu image uploaded successfully. URL:", imageUrlToSave);
                resolve();
              } catch (getUrlError: any) {
                console.error("MenuManagementPage: Error getting download URL for menu image:", getUrlError);
                toast({ title: "Image URL Error", description: `Failed to get image URL: ${getUrlError.message}`, variant: "destructive" });
                reject(getUrlError);
              }
            }
          );
        });
      }

      const finalMenuIngredients = data.menuIngredients?.map(ing => ({
        ...ing,
        totalCost: parseFloat(((Number(ing.quantity) || 0) * (Number(ing.costPerUnit) || 0)).toFixed(2))
      })) || [];
      const totalIngredientCost = finalMenuIngredients.reduce((sum, ing) => sum + (ing.totalCost || 0), 0);
      const paxForCalc = Math.max(1, data.pax || 1);
      const costPerHeadFromIngredients = totalIngredientCost / paxForCalc;

      const menuDataToSave = {
        title: data.title,
        description: data.description,
        cuisine: data.cuisine,
        pricePerHead: data.pricePerHead,
        pax: data.pax,
        costPrice: data.costPrice, // This is the chef's manually determined/overridden cost price
        dietaryInfo: data.dietaryInfo || [],
        isPublic: data.isPublic,
        imageUrl: imageUrlToSave,
        dataAiHint: data.dataAiHint || '',
        chefId: user.uid,
        chefName: (userProfile as AppUserProfileContext)?.name || user.displayName || "Chef",
        chefProfilePictureUrl: (userProfile as AppUserProfileContext)?.profilePictureUrl || user.photoURL || undefined,
        menuIngredients: finalMenuIngredients,
        calculatedTotalIngredientCost: parseFloat(totalIngredientCost.toFixed(2)),
        calculatedCostPricePerHead: parseFloat(costPerHeadFromIngredients.toFixed(2)),
        adminStatus: editingMenu?.adminStatus || 'pending', // Preserve existing adminStatus or default to pending
        updatedAt: serverTimestamp(),
      };
      console.log("MenusPage: Menu data to save to Firestore:", menuDataToSave);

      if (editingMenu) {
        const menuDocRef = doc(db, "menus", editingMenu.id);
        await updateDoc(menuDocRef, menuDataToSave);
        toast({ title: 'Menu Updated', description: `"${data.title}" has been successfully updated.` });
        console.log("MenusPage: Menu updated in Firestore. ID:", editingMenu.id);
      } else {
        const newMenuDocRef = doc(db, "menus", menuIdForPath); // Use pre-generated ID for consistency with image path
        await setDoc(newMenuDocRef, { ...menuDataToSave, createdAt: serverTimestamp() });
        toast({ title: 'Menu Created', description: `"${data.title}" has been successfully created.` });
        console.log("MenusPage: New menu created in Firestore. ID:", menuIdForPath);
      }

      form.reset();
      setEditingMenu(null);
      setIsDialogOpen(false);
      setMenuImageFile(null);
      setMenuImagePreview(null);
      replaceIngredients([]);

    } catch (error: any) {
      console.error('MenuManagementPage: Menu save operation failed:', error);
      toast({ title: 'Save Failed', description: `Could not save menu: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (menuId: string) => {
    console.log("MenusPage: handleEdit called for menu ID:", menuId);
    const menuToEdit = menus.find(menu => menu.id === menuId);
    if (menuToEdit) {
      setEditingMenu(menuToEdit);
      form.reset({
        title: menuToEdit.title,
        description: menuToEdit.description,
        cuisine: menuToEdit.cuisine,
        pricePerHead: menuToEdit.pricePerHead || 0,
        pax: menuToEdit.pax || 1,
        costPrice: menuToEdit.costPrice || 0,
        dietaryInfo: menuToEdit.dietaryInfo || [],
        isPublic: menuToEdit.isPublic,
        menuImageFile: undefined,
        dataAiHint: menuToEdit.dataAiHint || '',
        menuIngredients: menuToEdit.menuIngredients?.map(ing => ({ ...ing, id: ing.id || uuidv4() })) || [],
      });
      setMenuImagePreview(menuToEdit.imageUrl || null);
      setMenuImageFile(null);
      // replaceIngredients(menuToEdit.menuIngredients?.map(ing => ({ ...ing, id: ing.id || uuidv4() })) || []); // Not needed if form.reset works
      setIsDialogOpen(true);
    } else {
      console.error("MenusPage: Menu to edit not found with ID:", menuId);
      toast({title: "Error", description: "Could not find menu to edit.", variant: "destructive"});
    }
  };

  const handleDelete = async (menuId: string) => {
    console.log("MenusPage: handleDelete called for menu ID:", menuId);
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    const menuToDelete = menus.find(m => m.id === menuId);
    if (!menuToDelete) {
      toast({ title: "Error", description: "Menu not found.", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete the menu "${menuToDelete?.title}"?`)) return;

    setIsSaving(true);
    try {
      if (menuToDelete.imageUrl && menuToDelete.imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
        try {
          console.log("MenusPage: Deleting menu image from storage:", menuToDelete.imageUrl);
          const imageRefToDelete: StorageReference = storageRef(storage, menuToDelete.imageUrl);
          await deleteObject(imageRefToDelete);
          console.log("MenusPage: Menu image deleted from storage.");
        } catch (e: any) {
          if (e.code !== 'storage/object-not-found') {
            console.warn("MenuManagementPage: Could not delete menu image from storage during menu deletion:", e.message);
          } else {
             console.log("MenusPage: Menu image not found in storage, nothing to delete.");
          }
        }
      }
      await deleteDoc(doc(db, "menus", menuId));
      toast({ title: 'Menu Deleted', description: `"${menuToDelete?.title}" has been deleted.`, variant: 'destructive' });
      console.log("MenusPage: Menu deleted from Firestore. ID:", menuId);
    } catch (error: any) {
      console.error("MenuManagementPage: Error deleting menu:", error);
      toast({ title: "Delete Error", description: `Could not delete menu: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToShoppingList = useCallback(async (menu: Menu) => {
    console.log("MenusPage: handleAddToShoppingList called for menu:", menu.title);
    if (!user) {
      toast({ title: "Not Logged In", description: "Please log in to add items to your shopping list.", variant: "destructive" });
      return;
    }
    if (!menu.menuIngredients || menu.menuIngredients.length === 0) {
      toast({ title: "No Ingredients", description: "This menu has no ingredients listed to add to the shopping list.", variant: "default" });
      return;
    }
    setIsSaving(true); // Use general isSaving or a specific state like isAddingToShoppingList
    try {
      const batch = writeBatch(db);
      const shoppingListCollectionRef = collection(db, `users/${user.uid}/shoppingListItems`);
      
      menu.menuIngredients.forEach(ing => {
        if (!ing.name || !ing.quantity || !ing.unit) {
            console.warn("Skipping ingredient due to missing fields:", ing);
            return;
        }
        const newItemRef = doc(shoppingListCollectionRef); // Auto-generate ID
        const newItemData: Omit<ShoppingListItem, 'id' | 'createdAt' | 'updatedAt'> = {
          chefId: user.uid,
          name: ing.name,
          quantity: Number(ing.quantity) || 1,
          unit: ing.unit,
          estimatedCost: Number(ing.costPerUnit) || 0, // Shopping list stores cost per unit
          notes: `For menu: ${menu.title}. ${ing.notes || ''}`.trim(),
          purchased: false,
          menuId: menu.id, // Link to the menu
        };
        batch.set(newItemRef, { ...newItemData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });
      
      await batch.commit();
      toast({ title: 'Added to Shopping List', description: `Ingredients from "${menu.title}" added.` });
      console.log("MenusPage: Ingredients added to shopping list for menu:", menu.title);
    } catch (error: any) {
      console.error("MenuManagementPage: Error adding to shopping list:", error);
      toast({ title: 'Error', description: `Could not add items to shopping list: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [user, toast]);

  const openNewMenuDialog = () => {
    console.log("MenusPage: openNewMenuDialog called.");
    if (!user) {
        toast({title: "Login Required", description: "Please log in to create menus.", variant: "destructive"});
        return;
    };
    form.reset({
      title: '',
      description: '',
      cuisine: '',
      pricePerHead: 0,
      dietaryInfo: [],
      isPublic: false,
      menuImageFile: undefined,
      pax: 1,
      costPrice: 0,
      dataAiHint: '',
      menuIngredients: [],
    });
    setEditingMenu(null);
    setMenuImageFile(null);
    setMenuImagePreview(null);
    replaceIngredients([]); // Ensure ingredients array is cleared
    setIsDialogOpen(true);
  };

  const handleAiAssist = async () => {
    const { title, description, cuisine, menuIngredients } = form.getValues();
    if (!title || !cuisine) {
      toast({
        title: "Missing Information for AI",
        description: "Please provide at least a Menu Title and Cuisine Type for AI assistance.",
        variant: "destructive",
      });
      return;
    }
    setIsAiAssisting(true);
    toast({ title: "AI Menu Assist", description: "Generating suggestions..." });
    console.log("MenusPage: Calling AI Menu Assist for title:", title);
    try {
      const keyIngredientsString = menuIngredients?.map(ing => ing.name).filter(Boolean).join(', ');
      const assistInput: MenuItemAssistInput = {
        menuTitle: title,
        cuisine: cuisine,
      };
      if (description) assistInput.currentDescription = description;
      if (keyIngredientsString) assistInput.keyIngredients = keyIngredientsString;
      
      const result = await assistMenuItem(assistInput);
      if (result && result.suggestedDescription) {
        form.setValue('description', result.suggestedDescription, { shouldValidate: true });
        toast({ title: "AI Suggestion Applied", description: "Description updated with AI suggestion." });
        console.log("MenusPage: AI suggestion applied.");
      } else {
        toast({ title: "AI Menu Assist", description: "Could not generate a suggestion at this time.", variant: "default" });
        console.warn("MenusPage: AI did not return a suggestion.");
      }
    } catch (error: any) {
      console.error("MenuManagementPage: Error with AI Menu Assist:", error);
      let errorMsg = `Failed to get AI suggestions. ${error.message}`;
      if (error.message && error.message.toLowerCase().includes('api key not valid')) {
        errorMsg = "AI Service Error: Invalid API Key for menu assist.";
      } else if (error.message && error.message.toLowerCase().includes('quota')) {
        errorMsg = "AI Service Error: Quota exceeded. Please try again later.";
      }
      toast({ title: "AI Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsAiAssisting(false);
    }
  };

  if (authLoading || isLoadingData) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" data-ai-hint="loading spinner" />
        <p className="ml-3 text-lg">Loading your menus...</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Please log in to manage your menus.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h1 className="text-3xl font-bold flex items-center"><NotebookText className="mr-3 h-8 w-8 text-primary" data-ai-hint="notebook icon" /> Manage Your Menus</h1>
        <Button onClick={openNewMenuDialog} disabled={isSaving || isAiAssisting}>
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Menu
        </Button>
      </div>
      {Dialog && isDialogOpen && (
        <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          if ((isSaving || isAiAssisting) && isOpen) return; // Prevent closing if saving
          setIsDialogOpen(isOpen);
          if (!isOpen) {
            setMenuImageFile(null);
            setMenuImagePreview(null);
            form.reset();
            setEditingMenu(null);
            replaceIngredients([]);
          }
        }}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMenu ? 'Edit Menu' : 'Create New Menu'}</DialogTitle>
              {ShadDialogDescription && <ShadDialogDescription>Fill in the details for your menu item. Use the AI assist for help with descriptions!</ShadDialogDescription>}
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Menu Title</FormLabel>
                      <FormControl><Input placeholder="e.g., Classic Italian Feast" {...field} disabled={isSaving || isAiAssisting} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormItem>
                    <FormLabel>Menu Image</FormLabel>
                     <div className="flex items-center space-x-4">
                        {menuImagePreview && (
                            <Image src={menuImagePreview} alt="Menu preview" width={100} height={100} className="rounded-md object-cover border" data-ai-hint={form.getValues('dataAiHint') || "menu item"} />
                        )}
                        <FormField
                            control={form.control}
                            name="menuImageFile"
                            render={() => (
                                <FormControl>
                                <Input 
                                    type="file" 
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleMenuImageFileChange} 
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    disabled={isSaving || isAiAssisting}
                                />
                                </FormControl>
                            )}
                        />
                    </div>
                    <FormDescription>A captivating image for your menu (max 2MB).</FormDescription>
                    <FormField control={form.control} name="menuImageFile" render={({ fieldState }) => <FormMessage>{fieldState.error?.message}</FormMessage>} />
                </FormItem>
                <FormField
                  control={form.control}
                  name="dataAiHint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image Description Hint (for AI)</FormLabel>
                      <FormControl><Input placeholder="e.g., pasta dish, vibrant salad" {...field} disabled={isSaving || isAiAssisting} /></FormControl>
                      <FormDescription>One or two keywords to help AI understand the image content (max 2 words).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea placeholder="Describe your menu..." className="min-h-[100px]" {...field} disabled={isSaving || isAiAssisting} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="outline" onClick={handleAiAssist} disabled={isAiAssisting || isSaving || !form.watch('title') || !form.watch('cuisine')}>
                    {isAiAssisting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                    {isAiAssisting ? "Getting Suggestion..." : "AI Assist Description"}
                </Button>
                <FormField
                  control={form.control}
                  name="cuisine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuisine Type</FormLabel>
                      <FormControl><Input placeholder="e.g., Italian, French, Fusion" {...field} disabled={isSaving || isAiAssisting} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pricePerHead"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sale Price per Head ($)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 75.00" {...field} disabled={isSaving || isAiAssisting} /></FormControl>
                        <FormDescription>The price your customer will pay per person.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default PAX (Guests Served)</FormLabel>
                        <FormControl><Input type="number" placeholder="e.g., 10" {...field} disabled={isSaving || isAiAssisting} /></FormControl>
                        <FormDescription>How many people this menu typically serves. Used for cost per head calculation.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Ingredients & Costing Section */}
                <Card className="p-4 border-dashed">
                  <CardHeader className="p-0 pb-3">
                    <CardTitle className="text-lg flex items-center"><Calculator className="mr-2 h-5 w-5"/> Ingredients & Costing</CardTitle>
                    <CardDescription className="text-xs">List ingredients to calculate your cost price.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 space-y-3">
                    {ingredientFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end p-2 border rounded-md bg-muted/30">
                        <FormField
                          control={form.control}
                          name={`menuIngredients.${index}.name`}
                          render={({ field: f }) => ( <FormItem><FormLabel className="text-xs">Name</FormLabel><FormControl><Input {...f} placeholder="Ingredient Name" /></FormControl><FormMessage className="text-xs"/></FormItem> )}
                        />
                        <FormField
                          control={form.control}
                          name={`menuIngredients.${index}.quantity`}
                          render={({ field: f }) => ( <FormItem><FormLabel className="text-xs">Qty</FormLabel><FormControl><Input type="number" step="0.01" {...f} placeholder="0.0" /></FormControl><FormMessage className="text-xs"/></FormItem> )}
                        />
                        <FormField
                          control={form.control}
                          name={`menuIngredients.${index}.unit`}
                          render={({ field: f }) => ( <FormItem><FormLabel className="text-xs">Unit</FormLabel><FormControl><Input {...f} placeholder="kg, pcs" /></FormControl><FormMessage className="text-xs"/></FormItem> )}
                        />
                        <FormField
                          control={form.control}
                          name={`menuIngredients.${index}.costPerUnit`}
                          render={({ field: f }) => ( <FormItem><FormLabel className="text-xs">Cost/Unit ($)</FormLabel><FormControl><Input type="number" step="0.01" {...f} placeholder="0.00" /></FormControl><FormMessage className="text-xs"/></FormItem> )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredient(index)} className="text-destructive self-center mt-5 sm:mt-0">
                          <PackageMinus className="h-4 w-4"/> <span className="sr-only">Remove Ingredient</span>
                        </Button>
                        <FormField
                          control={form.control}
                          name={`menuIngredients.${index}.notes`}
                          render={({ field: f }) => ( <FormItem className="sm:col-span-full"><FormLabel className="text-xs">Notes (Optional)</FormLabel><FormControl><Input {...f} placeholder="e.g., Organic, specific brand" className="text-xs h-8"/></FormControl><FormMessage className="text-xs"/></FormItem> )}
                        />
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendIngredient({ id: uuidv4(), name: '', quantity: 1, unit: '', costPerUnit: 0, notes: '' })}>
                      <PackagePlus className="mr-2 h-4 w-4"/> Add Ingredient
                    </Button>
                    <div className="pt-3 border-t text-sm space-y-1">
                        <p><strong>Total Ingredient Cost for Menu:</strong> ${calculatedTotalIngredientCost.toFixed(2)}</p>
                        <p><strong>Calculated Cost Price per Head:</strong> ${calculatedCostPricePerHead.toFixed(2)} (based on {form.getValues('pax') || 1} PAX)</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="costPrice"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Final Determined Cost Price per Head ($)</FormLabel>
                            <div className="flex items-center gap-2">
                                <FormControl><Input type="number" step="0.01" placeholder="e.g., 25.00" {...field} disabled={isSaving || isAiAssisting} /></FormControl>
                                <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                    <Button type="button" variant="outline" size="sm" onClick={() => form.setValue('costPrice', parseFloat(calculatedCostPricePerHead.toFixed(2)) )}>Use Calc.</Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Use calculated cost per head</p></TooltipContent>
                                </Tooltip>
                                </TooltipProvider>
                            </div>
                            <FormDescription>Your final cost per person after all calculations (labor, overheads etc.).</FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>


                <FormItem>
                  <FormLabel>Dietary Information/Flags</FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {dietaryOptions.map((option) => (
                      <FormField
                        key={option.value}
                        control={form.control}
                        name="dietaryInfo"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(option.value)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), option.value])
                                    : field.onChange(
                                        (field.value || []).filter(
                                          (value) => value !== option.value
                                        )
                                      );
                                }}
                                disabled={isSaving || isAiAssisting}
                              />
                            </FormControl>
                            <FormLabel className="font-normal text-sm">{option.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Publish Menu?</FormLabel>
                        <FormDescription className="text-xs">
                          {field.value ? "Public: Visible to customers." : "Private: Only visible to you."}
                           {(!isChefSubscribed && field.value && !(userProfile as ChefProfile)?.isAdmin) && <span className="text-destructive"> Public visibility requires subscription.</span>}
                        </FormDescription>
                      </div>
                       <TooltipProvider>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <FormControl>
                               <Switch
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  if (checked && !isChefSubscribed && !(userProfile as ChefProfile)?.isAdmin) {
                                    toast({ title: "Subscription Required", description: "An active subscription is needed to make menus public.", variant: "destructive"});
                                    // Do not change field.value if trying to make public without subscription
                                  } else {
                                    field.onChange(checked);
                                  }
                                }}
                                disabled={isSaving || isAiAssisting} // Removed complex disabled logic for simplicity now
                              />
                            </FormControl>
                          </TooltipTrigger>
                          {(!isChefSubscribed && !(userProfile as ChefProfile)?.isAdmin) && (
                            <TooltipContent side="left">
                              <p className="flex items-center"><AlertCircle className="mr-2 h-4 w-4" />Subscription required for public visibility.</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isSaving || isAiAssisting}>Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSaving || isAiAssisting || (form.getValues('isPublic') && !isChefSubscribed && !(userProfile as ChefProfile)?.isAdmin )}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingMenu ? 'Save Changes' : 'Create Menu')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}
      {menus.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menus.map(menu => (
            <MenuCard
              key={menu.id}
              menu={menu}
              onEdit={() => handleEdit(menu.id)}
              onDelete={() => handleDelete(menu.id)}
              onAddToShoppingList={handleAddToShoppingList}
              isChefOwner={true}
              showChefDetails={false}
            />
          ))}
        </div>
      ) : (
        !isLoadingData && (
          <Card className="text-center py-12 border-dashed">
            <CardHeader>
              <NotebookText className="mx-auto h-12 w-12 text-muted-foreground mb-3" data-ai-hint="notebook empty" />
              <CardTitle>No Menus Yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">You haven't created any menus. Get started by adding your first one!</p>
              <Button onClick={openNewMenuDialog} disabled={isSaving || isAiAssisting}>
                <PlusCircle className="mr-2 h-5 w-5" /> Create Your First Menu
              </Button>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

