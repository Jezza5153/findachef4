
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
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
import type { Menu, Option, ShoppingListItem } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, NotebookText, Eye, EyeOff, ShoppingCart, AlertCircle, Sparkles, UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, serverTimestamp, Timestamp, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';


const dietaryOptions: Option[] = [
  { value: 'Vegetarian', label: 'Vegetarian' },
  { value: 'Vegan', label: 'Vegan' },
  { value: 'Gluten-Free', label: 'Gluten-Free' },
  { value: 'Dairy-Free', label: 'Dairy-Free' },
  { value: 'Nut-Free', label: 'Nut-Free' },
];

const menuFormSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  cuisine: z.string().min(2, { message: 'Cuisine type is required.' }),
  pricePerHead: z.coerce.number().min(0, { message: 'Sale price must be a positive number.' }),
  pax: z.coerce.number().min(1, { message: 'PAX must be at least 1.' }).optional(),
  costPrice: z.coerce.number().min(0, { message: 'Cost price must be positive.'}).optional(),
  dietaryInfo: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
  menuImageFile: z.instanceof(File).optional()
    .refine(file => !file || file.size <= 2 * 1024 * 1024, `Max image size is 2MB.`)
    .refine(file => !file || ['image/jpeg', 'image/png', 'image/webp'].includes(file.type), `Only JPG, PNG, WEBP files are allowed.`),
  dataAiHint: z.string().optional().max(30, "Hint should be brief, max 2 words."),
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
      pax: undefined,
      costPrice: undefined,
      dataAiHint: '',
    },
  });

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const menusCollectionRef = collection(db, "menus");
    const q = query(menusCollectionRef, where("chefId", "==", user.uid), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMenus = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        // Ensure timestamps are converted if they exist
        createdAt: doc.data().createdAt ? (doc.data().createdAt as Timestamp).toDate() : undefined,
        updatedAt: doc.data().updatedAt ? (doc.data().updatedAt as Timestamp).toDate() : undefined,
      } as Menu));
      setMenus(fetchedMenus);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching menus:", error);
      toast({ title: "Error", description: "Could not fetch your menus.", variant: "destructive" });
      setIsLoading(false);
    });
    
    return () => unsubscribe(); // Unsubscribe when component unmounts
  }, [user, toast]);

  const handleMenuImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    try {
      const menuIdForPath = editingMenu?.id || doc(collection(db, 'menus')).id;

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
        const imageStorageRef = storageRef(storage, imagePath);
        
        toast({ title: "Uploading image...", description: "Please wait." });
        const uploadTask = uploadBytesResumable(imageStorageRef, menuImageFile);
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
        dataAiHint: data.dataAiHint,
        chefId: user.uid,
        chefName: userProfile.name || user.displayName || "Chef",
        chefProfilePictureUrl: userProfile.profilePictureUrl || user.photoURL || undefined,
        updatedAt: serverTimestamp(),
      };

      if (editingMenu) {
        const menuDocRef = doc(db, "menus", editingMenu.id);
        await updateDoc(menuDocRef, menuDataToSave);
        // No need to manually update local state due to onSnapshot
        toast({ title: 'Menu Updated', description: `"${data.title}" has been successfully updated.` });
      } else {
        const newMenuDocRef = doc(collection(db, "menus")); 
        await setDoc(newMenuDocRef, { ...menuDataToSave, id: newMenuDocRef.id, createdAt: serverTimestamp() });
        // No need to manually update local state due to onSnapshot
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
        pax: menuToEdit.pax || undefined,
        costPrice: menuToEdit.costPrice || undefined,
        dietaryInfo: menuToEdit.dietaryInfo || [],
        isPublic: menuToEdit.isPublic,
        menuImageFile: undefined, 
        dataAiHint: menuToEdit.dataAiHint || '',
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
            const imageRef = storageRef(storage, menuToDelete.imageUrl);
            await deleteObject(imageRef);
          } catch (e) {
            console.warn("Could not delete menu image from storage:", e);
          }
        }
        await deleteDoc(doc(db, "menus", menuId));
        // No need to manually update local state due to onSnapshot
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
    
    const newItem: Omit<ShoppingListItem, 'id' | 'createdAt' | 'updatedAt'> = {
      name: `Ingredients for ${menu.title}`,
      quantity: 1, // Default quantity
      unit: 'Lot', // Default unit
      estimatedCost: menu.costPrice || 0, // Use menu cost price as estimate or default to 0
      notes: `For menu: ${menu.title} (ID: ${menu.id})`,
      purchased: false,
      chefId: user.uid,
      menuId: menu.id,
    };

    try {
      const shoppingListCollectionRef = collection(db, `users/${user.uid}/shoppingListItems`);
      await addDoc(shoppingListCollectionRef, { ...newItem, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      toast({
        title: 'Added to Shopping List',
        description: `"${newItem.name}" added to your shopping list.`,
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
      pax: undefined,
      costPrice: undefined,
      dataAiHint: '',
    });
    setEditingMenu(null);
    setMenuImageFile(null);
    setMenuImagePreview(null);
    setIsDialogOpen(true);
  };

  const handleAiAssist = () => {
    const currentDescription = form.getValues("description");
    toast({
      title: "AI Menu Assist (Placeholder)",
      description: "This feature will soon help generate descriptions, suggest dietary options, and more!",
      duration: 5000,
    });
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
          if (isSaving && isOpen) return; 
          setIsDialogOpen(isOpen);
          if (!isOpen) {
            setMenuImageFile(null);
            setMenuImagePreview(null);
            form.reset();
            setEditingMenu(null);
          }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMenu ? 'Edit Menu' : 'Create New Menu'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Detailed description of the menu..." {...field} className="min-h-[100px]" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <Button type="button" variant="outline" onClick={handleAiAssist} size="sm" className="w-full">
                <Sparkles className="mr-2 h-4 w-4" /> Get AI Suggestions for Description
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  name="pricePerHead"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Price per Head ($)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="75.00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="pax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serves (PAX)</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl>
                      <FormDescription>Number of people this menu typically serves.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Cost Price ($)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="30.00" {...field} /></FormControl>
                      <FormDescription>Your internal cost for ingredients per menu serving.</FormDescription>
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

              <FormItem>
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
                                    return; // Prevent toggle if trying to publish without subscription
                                }
                                field.onChange(checked);
                              }}
                              disabled={isSaving || (field.value && !isChefSubscribed)} // Disable if trying to publish without sub OR if already public & no sub (shouldn't happen)
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
                    <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving || (form.getValues("isPublic") && !isChefSubscribed) }>
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
