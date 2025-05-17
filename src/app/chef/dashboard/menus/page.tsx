
'use client';

import { useState, useEffect, ChangeEvent, useMemo } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { MenuCard } from '@/components/menu-card';
import type { Menu, Option, ShoppingListItem, MenuIngredient } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, NotebookText, Eye, EyeOff, ShoppingCart, AlertCircle, Sparkles, UploadCloud, Image as ImageIcon, Loader2, PackagePlus, PackageMinus, Calculator } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, serverTimestamp, Timestamp, setDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';
import { assistMenuItem } from '@/ai/flows/menu-item-assist-flow';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs for ingredients

const dietaryOptions: Option[] = [
  { value: 'Vegetarian', label: 'Vegetarian' },
  { value: 'Vegan', label: 'Vegan' },
  { value: 'Gluten-Free', label: 'Gluten-Free' },
  { value: 'Dairy-Free', label: 'Dairy-Free' },
  { value: 'Nut-Free', label: 'Nut-Free' },
];

const menuIngredientSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: "Ingredient name is required." }),
  quantity: z.coerce.number().min(0.01, { message: "Quantity must be positive." }),
  unit: z.string().min(1, { message: "Unit is required." }),
  costPerUnit: z.coerce.number().min(0, { message: "Cost per unit must be non-negative." }),
  totalCost: z.coerce.number().optional(), // Will be calculated
  notes: z.string().optional(),
});

const menuFormSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  cuisine: z.string().min(2, { message: 'Cuisine type is required.' }),
  pricePerHead: z.coerce.number().min(0, { message: 'Sale price must be a positive number.' }), // Sale Price
  pax: z.coerce.number().min(1, { message: 'PAX must be at least 1.' }).optional(),
  costPrice: z.coerce.number().min(0, { message: 'Cost price must be positive.'}).optional(), // Chef's final determined cost per head
  dietaryInfo: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
  menuImageFile: z.instanceof(File).optional()
    .refine(file => !file || file.size <= 2 * 1024 * 1024, `Max image size is 2MB.`)
    .refine(file => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), `Only JPG, PNG, WEBP files are allowed.`),
  dataAiHint: z.string().optional().max(30, "Hint should be brief, max 2 words."),
  menuIngredients: z.array(menuIngredientSchema).optional(),
});

type MenuFormValues = z.infer<typeof menuFormSchema>;


export default function MenuManagementPage() {
  const { user, userProfile, isChefSubscribed } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      pax: 1, // Default PAX to 1
      costPrice: 0,
      dataAiHint: '',
      menuIngredients: [],
    },
  });
  
  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient, update: updateIngredient } = useFieldArray({
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
    const pax = Number(watchedPax) || 1; // Ensure pax is at least 1 to avoid division by zero
    return calculatedTotalIngredientCost / Math.max(1, pax);
  }, [calculatedTotalIngredientCost, watchedPax]);


  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const menusCollectionRef = collection(db, "menus");
    const q = query(menusCollectionRef, where("chefId", "==", user.uid), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMenus = querySnapshot.docs.map(docSnap => ({ 
        id: docSnap.id, 
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt ? (docSnap.data().createdAt as Timestamp).toDate() : undefined,
        updatedAt: docSnap.data().updatedAt ? (docSnap.data().updatedAt as Timestamp).toDate() : undefined,
      } as Menu));
      setMenus(fetchedMenus);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching menus:", error);
      toast({ title: "Error", description: "Could not fetch your menus.", variant: "destructive" });
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, toast]);

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
    if (!user || !userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in to manage menus.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    let imageUrlToSave = editingMenu?.imageUrl || ''; 
    const menuIdForPath = editingMenu?.id || doc(collection(db, 'menus')).id;

    try {
      if (menuImageFile) {
        if (editingMenu && editingMenu.imageUrl) {
          try {
            const oldImageRef = storageRef(storage, editingMenu.imageUrl);
            await deleteObject(oldImageRef).catch(e => console.warn("Old image not found or could not be deleted for menu:", e));
          } catch (e) {
            console.warn("Error deleting old menu image:", e);
          }
        }
        
        const fileExtension = menuImageFile.name.split('.').pop();
        const imagePath = `users/${user.uid}/menus/${menuIdForPath}/image.${fileExtension}`;
        const imageStorageRefInstance = storageRef(storage, imagePath);
        
        toast({ title: "Uploading image...", description: "Please wait." });
        const uploadTask = uploadBytesResumable(imageStorageRefInstance, menuImageFile);
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            null, 
            (error) => { console.error("Menu image upload error:", error); reject(error); },
            async () => {
              imageUrlToSave = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      const finalMenuIngredients = data.menuIngredients?.map(ing => ({
        ...ing,
        totalCost: (Number(ing.quantity) || 0) * (Number(ing.costPerUnit) || 0)
      })) || [];

      const totalIngredientCost = finalMenuIngredients.reduce((sum, ing) => sum + (ing.totalCost || 0), 0);
      const paxForCalc = Math.max(1, Number(data.pax) || 1);
      const costPerHeadFromIngredients = totalIngredientCost / paxForCalc;

      const menuDataToSave = {
        title: data.title,
        description: data.description,
        cuisine: data.cuisine,
        pricePerHead: data.pricePerHead, // Sale price
        pax: data.pax,
        costPrice: data.costPrice, // Chef's final determined cost price
        dietaryInfo: data.dietaryInfo || [],
        isPublic: data.isPublic,
        imageUrl: imageUrlToSave,
        dataAiHint: data.dataAiHint,
        chefId: user.uid,
        chefName: userProfile.name || user.displayName || "Chef",
        chefProfilePictureUrl: userProfile.profilePictureUrl || user.photoURL || undefined,
        menuIngredients: finalMenuIngredients,
        calculatedTotalIngredientCost: totalIngredientCost,
        calculatedCostPricePerHead: costPerHeadFromIngredients,
        updatedAt: serverTimestamp(),
      };

      if (editingMenu) {
        const menuDocRef = doc(db, "menus", editingMenu.id);
        await updateDoc(menuDocRef, menuDataToSave);
        toast({ title: 'Menu Updated', description: `"${data.title}" has been successfully updated.` });
      } else {
        const newMenuDocRef = doc(db, "menus", menuIdForPath); 
        await setDoc(newMenuDocRef, { ...menuDataToSave, id: newMenuDocRef.id, createdAt: serverTimestamp() });
        toast({ title: 'Menu Created', description: `"${data.title}" has been successfully created.` });
      }
      
      form.reset();
      setEditingMenu(null);
      setIsDialogOpen(false);
      setMenuImageFile(null);
      setMenuImagePreview(null);

    } catch (error) {
      console.error('Error saving menu:', error);
      toast({ title: 'Save Failed', description: 'Could not save your menu. Please try again.', variant: 'destructive' });
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
        menuIngredients: menuToEdit.menuIngredients?.map(ing => ({...ing, id: ing.id || uuidv4() })) || [],
      });
      setMenuImagePreview(menuToEdit.imageUrl || null);
      setMenuImageFile(null);
      setIsDialogOpen(true);
    }
  };

  const handleDelete = async (menuId: string) => {
    if (!user) return;
    const menuToDelete = menus.find(m => m.id === menuId);
    if (!menuToDelete) return;

    if (window.confirm(`Are you sure you want to delete the menu "${menuToDelete?.title}"?`)) {
      setIsSaving(true);
      try {
        if (menuToDelete.imageUrl) {
          try {
            const imagePath = `users/${user.uid}/menus/${menuToDelete.id}/image.${menuToDelete.imageUrl.split('.').pop()?.split('?')[0]}`;
            const imageRef = storageRef(storage, imagePath);
            await deleteObject(imageRef);
          } catch (e) {
            // Try deleting based on direct URL if path based fails (older entries might use full URL)
            try {
                const directImageRef = storageRef(storage, menuToDelete.imageUrl);
                await deleteObject(directImageRef);
            } catch (e2) {
                console.warn("Could not delete menu image from storage (tried path and direct URL):", menuToDelete.imageUrl, e, e2);
            }
          }
        }
        await deleteDoc(doc(db, "menus", menuId));
        toast({ title: 'Menu Deleted', description: `"${menuToDelete?.title}" has been deleted.`, variant: 'destructive' });
      } catch (error) {
        console.error("Error deleting menu:", error);
        toast({ title: "Delete Error", description: "Could not delete menu.", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }
  };

 const handleAddToShoppingList = async (menu: Menu) => {
    if (!user) {
      toast({ title: "Not Logged In", description: "Please log in to add items to your shopping list.", variant: "destructive"});
      return;
    }
    
    const determinedCostPrice = menu.costPrice ?? menu.calculatedCostPricePerHead ?? 0;
    const determinedPax = menu.pax ?? 1;

    const newItem: Omit<ShoppingListItem, 'id' | 'createdAt' | 'updatedAt'> = {
      name: `Ingredients for ${menu.title}`,
      quantity: determinedPax, 
      unit: 'Servings', 
      estimatedCost: determinedCostPrice * determinedPax, 
      notes: `For menu: ${menu.title} (ID: ${menu.id}). Cost per head: $${determinedCostPrice.toFixed(2)} for ${determinedPax} PAX.`,
      purchased: false,
      chefId: user.uid,
      menuId: menu.id,
    };

    try {
      const shoppingListCollectionRef = collection(db, `users/${user.uid}/shoppingListItems`);
      await addDoc(shoppingListCollectionRef, { ...newItem, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      toast({
        title: 'Added to Shopping List',
        description: `"${newItem.name}" added.`,
      });
    } catch (error) {
      console.error("Error adding to shopping list:", error);
      toast({
        title: 'Error',
        description: 'Could not add item to shopping list.',
        variant: 'destructive',
      });
    }
  };


  const openNewMenuDialog = () => {
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
    setIsDialogOpen(true);
  };

  const handleAiAssist = async () => {
    const { title, description, cuisine } = form.getValues();
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
      const result = await assistMenuItem({
        menuTitle: title,
        currentDescription: description,
        cuisine: cuisine,
      });
      if (result && result.suggestedDescription) {
        form.setValue('description', result.suggestedDescription, { shouldValidate: true });
        toast({ title: "AI Suggestion Applied", description: "Description updated with AI suggestion." });
      } else {
        toast({ title: "AI Menu Assist", description: "Could not generate a suggestion at this time.", variant: "default" });
      }
    } catch (error) {
      console.error("Error with AI Menu Assist:", error);
      toast({ title: "AI Error", description: "Failed to get AI suggestions.", variant: "destructive" });
    } finally {
      setIsAiAssisting(false);
    }
  };


  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Loading menus...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center"><NotebookText className="mr-3 h-8 w-8 text-primary"/> Manage Your Menus</h1>
        <Button onClick={openNewMenuDialog} disabled={isSaving}>
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Menu
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
          if ((isSaving || isAiAssisting) && isOpen) return; 
          setIsDialogOpen(isOpen);
          if (!isOpen) {
            setMenuImageFile(null);
            setMenuImagePreview(null);
            form.reset();
            setEditingMenu(null);
          }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"> {/* Increased max-width */}
          <DialogHeader>
            <DialogTitle>{editingMenu ? 'Edit Menu' : 'Create New Menu'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
              {/* Basic Menu Details */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menu Title</FormLabel>
                    <FormControl><Input placeholder="e.g., Summer BBQ Special" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                  control={form.control}
                  name="cuisine"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuisine Type</FormLabel>
                      <FormControl><Input placeholder="e.g., Mexican, Thai, Fusion" {...field} /></FormControl>
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
                    <FormControl><Textarea placeholder="Detailed description of the menu..." {...field} className="min-h-[100px]" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <Button type="button" variant="outline" onClick={handleAiAssist} size="sm" className="w-full" disabled={isAiAssisting || isSaving}>
                {isAiAssisting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isAiAssisting ? "Getting Suggestion..." : "AI Assist: Enhance Description"}
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="pricePerHead"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Price per Head ($)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="75.00" {...field} /></FormControl>
                       <FormDescription>The price customers will pay.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="pax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serves (PAX)</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g., 10" {...field} defaultValue={1} /></FormControl>
                      <FormDescription>Number of people this menu typically serves. Affects per-head cost calculation.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <FormField
                control={form.control}
                name="menuImageFile"
                render={() => ( 
                  <FormItem>
                    <FormLabel>Menu Image (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleMenuImageFileChange} 
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                    </FormControl>
                    {menuImagePreview && (
                      <div className="mt-2">
                        <Image src={menuImagePreview} alt="Menu image preview" width={200} height={150} className="rounded-md object-cover" data-ai-hint="menu food"/>
                      </div>
                    )}
                    <FormDescription>A captivating image for your menu (max 2MB, JPG/PNG/WEBP).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="dataAiHint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image Description Hint (for AI)</FormLabel>
                    <FormControl><Input placeholder="e.g., italian food, pasta dish" {...field} /></FormControl>
                    <FormDescription>One or two keywords to help AI understand the image content (max 2 words).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Menu Ingredients & Costing Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold flex items-center"><Calculator className="mr-2 h-5 w-5"/>Ingredients & Costing</h3>
                {ingredientFields.map((field, index) => (
                  <Card key={field.id} className="p-4 space-y-3 bg-muted/30">
                    <div className="flex justify-between items-center">
                       <FormLabel>Ingredient {index + 1}</FormLabel>
                       <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredient(index)} className="text-destructive hover:text-destructive">
                         <PackageMinus className="h-4 w-4" />
                       </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       <FormField
                        control={form.control}
                        name={`menuIngredients.${index}.name`}
                        render={({ field: f }) => (
                          <FormItem className="col-span-2 md:col-span-1">
                            <FormLabel className="text-xs">Name</FormLabel>
                            <FormControl><Input placeholder="e.g., Flour" {...f} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`menuIngredients.${index}.quantity`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Qty</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="2.5" {...f} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`menuIngredients.${index}.unit`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Unit</FormLabel>
                            <FormControl><Input placeholder="kg, pcs, L" {...f} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`menuIngredients.${index}.costPerUnit`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Cost/Unit ($)</FormLabel>
                            <FormControl><Input type="number" step="0.01" placeholder="5.99" {...f} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                     <FormField
                        control={form.control}
                        name={`menuIngredients.${index}.notes`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Notes (Optional)</FormLabel>
                            <FormControl><Input placeholder="Brand, specific type" {...f} /></FormControl>
                          </FormItem>
                        )}
                      />
                      <p className="text-xs text-muted-foreground">
                        Total for this ingredient: $ {((Number(form.getValues(`menuIngredients.${index}.quantity`)) || 0) * (Number(form.getValues(`menuIngredients.${index}.costPerUnit`)) || 0)).toFixed(2)}
                      </p>
                  </Card>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendIngredient({ id: uuidv4(), name: '', quantity: 1, unit: '', costPerUnit: 0, notes: '' })}>
                  <PackagePlus className="mr-2 h-4 w-4" /> Add Ingredient
                </Button>
                
                <div className="mt-4 p-3 bg-secondary rounded-md space-y-1 text-sm">
                    <p><strong>Total Ingredient Cost for Menu:</strong> ${calculatedTotalIngredientCost.toFixed(2)}</p>
                    <p><strong>Calculated Cost per Head (for {form.getValues('pax') || 1} PAX):</strong> ${calculatedCostPricePerHead.toFixed(2)}</p>
                </div>
                 <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Final Determined Cost Price per Head ($)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="30.00" {...field} /></FormControl>
                      <FormDescription>Your internal cost per serving. You can use the calculated value above or enter your own.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                    type="button" 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto"
                    onClick={() => form.setValue('costPrice', parseFloat(calculatedCostPricePerHead.toFixed(2)) )}
                    disabled={calculatedCostPricePerHead === 0 && calculatedTotalIngredientCost === 0}
                >
                    Use Calculated Cost per Head
                </Button>
              </div>


              {/* Dietary Information & Publishing */}
              <FormItem className="pt-4 border-t">
                <FormLabel>Dietary Information (Flags)</FormLabel>
                <Controller
                    name="dietaryInfo"
                    control={form.control}
                    render={({ field }) => (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {dietaryOptions.map((option) => (
                            <FormItem key={option.value} className="flex flex-row items-start space-x-3 space-y-0">
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
                                />
                            </FormControl>
                            <FormLabel className="font-normal">{option.label}</FormLabel>
                            </FormItem>
                        ))}
                        </div>
                    )}
                    />
                <FormMessage />
              </FormItem>
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Publish Menu</FormLabel>
                      <FormDescription>
                        Make this menu visible to customers on the public menu listings.
                        {(!isChefSubscribed && field.value) && " Public visibility requires an active subscription."}
                        {(!isChefSubscribed && !field.value) && " Publishing public menus requires an active subscription."}
                      </FormDescription>
                    </div>
                    <TooltipProvider>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                if (checked && !isChefSubscribed) {
                                    toast({ title: "Subscription Required", description: "You need an active subscription to publish menus publicly.", variant: "destructive"});
                                    return; 
                                }
                                field.onChange(checked);
                              }}
                              disabled={isSaving || (field.value && !isChefSubscribed)} 
                            />
                          </FormControl>
                        </TooltipTrigger>
                        {!isChefSubscribed && (
                          <TooltipContent>
                            <p className="flex items-center"><AlertCircle className="mr-2 h-4 w-4" />Subscription required to publish publicly.</p>
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
                <Button type="submit" disabled={isSaving || isAiAssisting || (form.getValues("isPublic") && !isChefSubscribed) }>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingMenu ? 'Save Changes' : 'Create Menu')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {menus.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menus.map(menu => (
            <MenuCard
              key={menu.id}
              menu={menu}
              onEdit={() => handleEdit(menu.id)}
              onDelete={() => handleDelete(menu.id)}
              onAddToShoppingList={() => handleAddToShoppingList(menu)}
              isChefOwner={true}
              showChefDetails={false}
            />
          ))}
        </div>
      ) : (
        !isLoading && (
            <Card className="text-center py-12 border-dashed">
                <CardHeader>
                    <NotebookText className="mx-auto h-12 w-12 text-muted-foreground mb-3" data-ai-hint="notebook empty" />
                    <CardTitle>No Menus Yet</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">You haven't created any menus. Get started by adding your first one!</p>
                    <Button onClick={openNewMenuDialog}>
                    <PlusCircle className="mr-2 h-5 w-5" /> Create Your First Menu
                    </Button>
                </CardContent>
            </Card>
        )
      )}
    </div>
  );
}

