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

// Dialog components (dynamic import for SSR safety)
const Dialog = dynamic(() => import('@/components/ui/dialog').then(mod => mod.Dialog), { ssr: false, loading: () => <p>Loading dialog...</p> });
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

// Zod schemas
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
    setIsLoadingData(true);
    const menusCollectionRef = collection(db, "menus");
    const q = query(menusCollectionRef, where("chefId", "==", user.uid), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
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
      toast({ title: "Error Fetching Menus", description: `Could not fetch your menus: ${error.message}`, variant: "destructive" });
      setMenus([]);
      setIsLoadingData(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, toast]);

  const handleMenuImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('menuImageFile', file, { shouldValidate: true });
      setMenuImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setMenuImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      form.setValue('menuImageFile', undefined);
      setMenuImageFile(null);
      setMenuImagePreview(editingMenu?.imageUrl || null); 
    }
  };

  const onSubmit = async (data: MenuFormValues) => {
    if (!user || !userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in to manage menus.", variant: "destructive" });
      return;
    }
    // ADMIN CHECK: Use role (not isAdmin property)
    if (data.isPublic && !isChefSubscribed && userProfile?.role !== "admin") {
      toast({ title: "Subscription Required", description: "An active subscription is needed to publish menus publicly.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    let imageUrlToSave = editingMenu?.imageUrl || ''; 
    const menuIdForPath = editingMenu?.id || doc(collection(db, 'menus')).id; 

    try {
      if (menuImageFile) {
        if (editingMenu?.imageUrl && editingMenu.imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
          try {
            const oldImageRef: StorageReference = storageRef(storage, editingMenu.imageUrl);
            await deleteObject(oldImageRef);
          } catch (deleteError: any) {
            if (deleteError.code !== 'storage/object-not-found') {
              // ignore
            }
          }
        }

        const fileExtension = menuImageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const imagePath = `users/${user.uid}/menus/${menuIdForPath}/image.${fileExtension}`;
        const imageStorageRefInstance = storageRef(storage, imagePath);

        const uploadTask = uploadBytesResumable(imageStorageRefInstance, menuImageFile);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed',
            () => {},
            (error) => {
              toast({ title: "Image Upload Failed", description: `Image upload failed: ${error.message}`, variant: "destructive" });
              reject(error);
            },
            async () => {
              try {
                imageUrlToSave = await getDownloadURL(uploadTask.snapshot.ref);
                resolve();
              } catch (getUrlError: any) {
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
        costPrice: data.costPrice,
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
        adminStatus: editingMenu?.adminStatus || 'pending',
        updatedAt: serverTimestamp(),
      };

      if (editingMenu) {
        const menuDocRef = doc(db, "menus", editingMenu.id);
        await updateDoc(menuDocRef, menuDataToSave);
        toast({ title: 'Menu Updated', description: `"${data.title}" has been successfully updated.` });
      } else {
        const newMenuDocRef = doc(db, "menus", menuIdForPath);
        await setDoc(newMenuDocRef, { ...menuDataToSave, createdAt: serverTimestamp() });
        toast({ title: 'Menu Created', description: `"${data.title}" has been successfully created.` });
      }

      form.reset();
      setEditingMenu(null);
      setIsDialogOpen(false);
      setMenuImageFile(null);
      setMenuImagePreview(null);
      replaceIngredients([]);

    } catch (error: any) {
      toast({ title: 'Save Failed', description: `Could not save menu: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (menuId: string) => {
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
      setIsDialogOpen(true);
    } else {
      toast({title: "Error", description: "Could not find menu to edit.", variant: "destructive"});
    }
  };

  const handleDelete = async (menuId: string) => {
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
          const imageRefToDelete: StorageReference = storageRef(storage, menuToDelete.imageUrl);
          await deleteObject(imageRefToDelete);
        } catch (e: any) {
          // ignore
        }
      }
      await deleteDoc(doc(db, "menus", menuId));
      toast({ title: 'Menu Deleted', description: `"${menuToDelete?.title}" has been deleted.`, variant: 'destructive' });
    } catch (error: any) {
      toast({ title: "Delete Error", description: `Could not delete menu: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToShoppingList = useCallback(async (menu: Menu) => {
    if (!user) {
      toast({ title: "Not Logged In", description: "Please log in to add items to your shopping list.", variant: "destructive" });
      return;
    }
    if (!menu.menuIngredients || menu.menuIngredients.length === 0) {
      toast({ title: "No Ingredients", description: "This menu has no ingredients listed to add to the shopping list.", variant: "default" });
      return;
    }
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const shoppingListCollectionRef = collection(db, `users/${user.uid}/shoppingListItems`);
      menu.menuIngredients.forEach(ing => {
        if (!ing.name || !ing.quantity || !ing.unit) return;
        const newItemRef = doc(shoppingListCollectionRef);
        const newItemData: Omit<ShoppingListItem, 'id' | 'createdAt' | 'updatedAt'> = {
          chefId: user.uid,
          name: ing.name,
          quantity: Number(ing.quantity) || 1,
          unit: ing.unit,
          estimatedCost: Number(ing.costPerUnit) || 0,
          notes: `For menu: ${menu.title}. ${ing.notes || ''}`.trim(),
          purchased: false,
          menuId: menu.id,
        };
        batch.set(newItemRef, { ...newItemData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });
      await batch.commit();
      toast({ title: 'Added to Shopping List', description: `Ingredients from "${menu.title}" added.` });
    } catch (error: any) {
      toast({ title: 'Error', description: `Could not add items to shopping list: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [user, toast]);

  const openNewMenuDialog = () => {
    if (!user) {
        toast({title: "Login Required", description: "Please log in to create menus.", variant: "destructive"});
        return;
    }
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
    replaceIngredients([]);
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
      } else {
        toast({ title: "AI Menu Assist", description: "Could not generate a suggestion at this time.", variant: "default" });
      }
    } catch (error: any) {
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
          if ((isSaving || isAiAssisting) && isOpen) return;
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
              {/* All your form fields and buttons here, unchanged, as in your working logic */}
              {/* ... (copy-paste your form JSX here, unchanged) ... */}
              {/* For brevity, omitted repeating your huge form; keep as-is from your working page! */}
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
