
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
import type { Menu, Option } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, NotebookText, Eye, EyeOff, ShoppingCart, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


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
  imageUrl: z.string().url({message: "Please enter a valid image URL."}).optional().or(z.literal('')),
});

type MenuFormValues = z.infer<typeof menuFormSchema>;

const initialMenus: Menu[] = [
  {
    id: '1',
    title: 'Classic Italian Feast',
    description: 'A delightful journey through Italy with classic pasta, antipasti, and dessert. Perfect for family gatherings.',
    cuisine: 'Italian',
    pricePerHead: 75,
    pax: 10,
    dietaryInfo: ['Vegetarian Option Available'],
    isPublic: true,
    chefId: 'chef123',
    chefName: 'Chef Julia',
    imageUrl: 'https://placehold.co/600x400.png',
    costPrice: 30,
    dataAiHint: 'italian food',
  },
  {
    id: '2',
    title: 'Modern French Dinner',
    description: 'Exquisite French cuisine with a modern twist. Features seasonal ingredients and artistic presentation.',
    cuisine: 'French',
    pricePerHead: 120,
    pax: 6,
    dietaryInfo: ['Gluten-Free Option'],
    isPublic: false,
    chefId: 'chef123',
    chefName: 'Chef Julia',
    imageUrl: 'https://placehold.co/600x400.png',
    costPrice: 55,
    dataAiHint: 'french food',
  },
];

export default function MenuManagementPage() {
  const [menus, setMenus] = useState<Menu[]>(initialMenus);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [isChefSubscribed, setIsChefSubscribed] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const subscriptionStatus = localStorage.getItem('isChefSubscribed');
      setIsChefSubscribed(subscriptionStatus === 'true');
    }
  }, []);


  const form = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: {
      title: '',
      description: '',
      cuisine: '',
      pricePerHead: 0,
      dietaryInfo: [],
      isPublic: false,
      imageUrl: '',
      pax: undefined,
      costPrice: undefined,
    },
  });

  const onSubmit = (data: MenuFormValues) => {
    if (editingMenu) {
      setMenus(menus.map(menu => menu.id === editingMenu.id ? { ...editingMenu, ...data, dietaryInfo: data.dietaryInfo || [] } : menu));
      toast({ title: 'Menu Updated', description: `"${data.title}" has been successfully updated.` });
    } else {
      const newMenu: Menu = {
        id: String(Date.now()),
        ...data,
        dietaryInfo: data.dietaryInfo || [],
        chefId: 'chef123', 
        chefName: 'Chef Julia' 
      };
      setMenus([...menus, newMenu]);
      toast({ title: 'Menu Created', description: `"${data.title}" has been successfully created.` });
    }
    form.reset();
    setEditingMenu(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (menuId: string) => {
    const menuToEdit = menus.find(menu => menu.id === menuId);
    if (menuToEdit) {
      setEditingMenu(menuToEdit);
      form.reset({
        ...menuToEdit,
        pricePerHead: menuToEdit.pricePerHead || 0, 
        pax: menuToEdit.pax || undefined,
        costPrice: menuToEdit.costPrice || undefined,
        imageUrl: menuToEdit.imageUrl || '',
      });
      setIsDialogOpen(true);
    }
  };

  const handleDelete = (menuId: string) => {
    const menuToDelete = menus.find(m => m.id === menuId);
    if (window.confirm(`Are you sure you want to delete the menu "${menuToDelete?.title}"?`)) {
      setMenus(menus.filter(menu => menu.id !== menuId));
      toast({ title: 'Menu Deleted', description: `"${menuToDelete?.title}" has been deleted.`, variant: 'destructive' });
    }
  };

  const handleAddToShoppingList = (menuId: string) => {
    const menu = menus.find(m => m.id === menuId);
    toast({
      title: 'Added to Shopping List (Simulated)',
      description: `Items for "${menu?.title}" have been notionally added to your shopping list.`,
    });
  };
  
  const openNewMenuDialog = () => {
    form.reset({
      title: '',
      description: '',
      cuisine: '',
      pricePerHead: 0,
      dietaryInfo: [],
      isPublic: false,
      imageUrl: '',
      pax: undefined,
      costPrice: undefined,
    });
    setEditingMenu(null);
    setIsDialogOpen(true);
  };


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center"><NotebookText className="mr-3 h-8 w-8 text-primary"/> Manage Your Menus</h1>
        <Button onClick={openNewMenuDialog}>
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Menu
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menu Image URL (Optional)</FormLabel>
                    <FormControl><Input placeholder="https://example.com/image.jpg" {...field} /></FormControl>
                    <FormDescription>A captivating image for your menu.</FormDescription>
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
                        Make this menu visible to customers. 
                        {!isChefSubscribed && " Publishing public menus requires an active subscription."}
                      </FormDescription>
                    </div>
                    <TooltipProvider>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!isChefSubscribed && field.value}
                              aria-readonly={!isChefSubscribed && field.value}
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
                    <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">{editingMenu ? 'Save Changes' : 'Create Menu'}</Button>
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
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddToShoppingList={handleAddToShoppingList}
              isChefOwner={true}
              showChefDetails={false} 
            />
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle>No Menus Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You haven't created any menus. Get started by adding your first one!</p>
            <Button onClick={openNewMenuDialog}>
              <PlusCircle className="mr-2 h-5 w-5" /> Create Your First Menu
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
