'use client';

import { useState, useMemo, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { ShoppingListItem } from '@/types';
import { PlusCircle, Trash2, ShoppingCart, FileDown, Edit, DollarSign, Loader2, Mic } from 'lucide-react'; // Added Mic icon
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, serverTimestamp, Timestamp, onSnapshot, orderBy } from 'firebase/firestore';
import dynamic from 'next/dynamic';

const Dialog = dynamic(() => import('@/components/ui/dialog').then(mod => mod.Dialog), { ssr: false });
const DialogContent = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogContent), { ssr: false });
const DialogHeader = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogHeader), { ssr: false });
const DialogTitle = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogTitle), { ssr: false });
const DialogFooter = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogFooter), { ssr: false });
const DialogClose = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogClose), { ssr: false });


const shoppingListItemSchema = z.object({
  name: z.string().min(1, { message: 'Item name is required.' }),
  quantity: z.coerce.number().min(0.01, { message: 'Quantity must be greater than 0.' }),
  unit: z.string().min(1, { message: 'Unit is required (e.g., kg, pcs, L).' }),
  estimatedCost: z.coerce.number().min(0, { message: 'Estimated cost (per unit) must be non-negative.' }),
  notes: z.string().max(500).optional(),
  menuId: z.string().max(100).optional(), 
  eventId: z.string().max(100).optional(), 
});

type ShoppingListItemFormValues = z.infer<typeof shoppingListItemSchema>;

export default function ShoppingListPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const { toast } = useToast();

  const form = useForm<ShoppingListItemFormValues>({
    resolver: zodResolver(shoppingListItemSchema),
    defaultValues: {
      name: '',
      quantity: 1,
      unit: '',
      estimatedCost: 0,
      notes: '',
      menuId: '',
      eventId: '',
    },
  });

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setItems([]);
      return;
    }
    setIsLoading(true);
    const itemsCollectionRef = collection(db, "users", user.uid, "shoppingListItems");
    const q = query(itemsCollectionRef, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedItems = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return { 
          id: docSnap.id, 
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt as any) : undefined),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt as any) : undefined),
        } as ShoppingListItem
      });
      setItems(fetchedItems);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching shopping list items:", error);
      toast({ title: "Error", description: "Could not fetch shopping list items.", variant: "destructive" });
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, toast]);

  const openAddItemDialog = (itemToEdit: ShoppingListItem | null = null) => {
    setEditingItem(itemToEdit);
    if (itemToEdit) {
      form.reset({
        name: itemToEdit.name,
        quantity: itemToEdit.quantity,
        unit: itemToEdit.unit,
        estimatedCost: itemToEdit.estimatedCost, // This is cost per unit
        notes: itemToEdit.notes || '',
        menuId: itemToEdit.menuId || '',
        eventId: itemToEdit.eventId || '',
      });
    } else {
      form.reset({
        name: '',
        quantity: 1,
        unit: '',
        estimatedCost: 0,
        notes: '',
        menuId: '',
        eventId: '',
      });
    }
    setIsAddItemDialogOpen(true);
  };

  const onSubmitItem = async (data: ShoppingListItemFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    const itemData = {
      ...data,
      chefId: user.uid,
      purchased: editingItem ? editingItem.purchased : false,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingItem) {
        const itemDocRef = doc(db, "users", user.uid, "shoppingListItems", editingItem.id);
        await updateDoc(itemDocRef, itemData);
        toast({ title: 'Item Updated', description: `"${data.name}" has been updated.` });
      } else {
        await addDoc(collection(db, "users", user.uid, "shoppingListItems"), {
          ...itemData,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Item Added', description: `"${data.name}" has been added.` });
      }
      form.reset();
      setEditingItem(null);
      setIsAddItemDialogOpen(false);
    } catch (error) {
        console.error("Error saving shopping list item:", error);
        toast({ title: "Save Error", description: "Could not save item.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!user) return;
    const itemToDelete = items.find(item => item.id === itemId);
    if (window.confirm(`Are you sure you want to delete "${itemToDelete?.name}"?`)) {
      setIsSubmitting(true); // Use isSubmitting to disable buttons during delete
      try {
        await deleteDoc(doc(db, "users", user.uid, "shoppingListItems", itemId));
        toast({ title: 'Item Deleted', description: `"${itemToDelete?.name}" removed.`, variant: "destructive" });
      } catch (error) {
        console.error("Error deleting item:", error);
        toast({ title: "Delete Error", description: "Could not delete item.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleTogglePurchased = async (itemId: string) => {
    if (!user) return;
    const itemToUpdate = items.find(item => item.id === itemId);
    if (itemToUpdate) {
      const newPurchasedStatus = !itemToUpdate.purchased;
      setIsSubmitting(true); // Disable actions during update
      try {
        const itemDocRef = doc(db, "users", user.uid, "shoppingListItems", itemId);
        await updateDoc(itemDocRef, { purchased: newPurchasedStatus, updatedAt: serverTimestamp() });
        // No toast needed for this, UI updates via onSnapshot
      } catch (error) {
        console.error("Error updating purchased status:", error);
        toast({ title: "Update Error", description: "Could not update status.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const totalEstimatedCost = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.estimatedCost * item.quantity), 0);
  }, [items]);

  const remainingCost = useMemo(() => {
    return items
      .filter(item => !item.purchased)
      .reduce((sum, item) => sum + (item.estimatedCost * item.quantity), 0);
  }, [items]);

  const handleExportToCSV = () => {
    if (items.length === 0) {
      toast({ title: "No Data", description: "Shopping list is empty.", variant: "default" });
      return;
    }
    const headers = ["Name", "Quantity", "Unit", "Estimated Cost (Total)", "Notes", "Purchased", "Menu ID", "Event ID"];
    const csvRows = [
      headers.join(','),
      ...items.map(item => [
        `"${item.name.replace(/"/g, '""')}"`, 
        item.quantity,
        `"${item.unit.replace(/"/g, '""')}"`,
        (item.estimatedCost * item.quantity).toFixed(2),
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        item.purchased ? "Yes" : "No",
        `"${(item.menuId || '').replace(/"/g, '""')}"`,
        `"${(item.eventId || '').replace(/"/g, '""')}"`,
      ].join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "shopping_list.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    toast({ title: 'Export Successful', description: 'Shopping list exported to CSV.' });
  };

  const handleVoiceNotePlaceholder = () => {
    toast({
      title: "Voice Note to Shopping List: Coming Soon!",
      description: "This feature will allow you to add items by speaking.",
      duration: 5000,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading shopping list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-3xl font-bold flex items-center">
          <ShoppingCart className="mr-3 h-8 w-8 text-primary" /> My Shopping List
        </h1>
        <div className="flex space-x-2">
          <Button onClick={handleVoiceNotePlaceholder} variant="outline" disabled={isSubmitting}>
            <Mic className="mr-2 h-5 w-5" /> Add via Voice Note
          </Button>
          <Button onClick={() => openAddItemDialog()} disabled={isSubmitting}>
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Item
          </Button>
        </div>
      </div>

      {isAddItemDialogOpen && (
        <Dialog open={isAddItemDialogOpen} onOpenChange={(open) => { if(!isSubmitting) setIsAddItemDialogOpen(open)}}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Shopping List Item'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitItem)} className="space-y-4 p-1">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl><Input placeholder="e.g., Flour" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="e.g., 2.5" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl><Input placeholder="e.g., kg, pcs, L" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="estimatedCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Cost (per unit)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="e.g., 5.99" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="e.g., Organic, brand preference" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="menuId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link to Menu ID (Optional)</FormLabel>
                        <FormControl><Input placeholder="e.g., menuXYZ" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="eventId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link to Event ID (Optional)</FormLabel>
                        <FormControl><Input placeholder="e.g., event123" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingItem ? 'Save Changes' : 'Add Item')}
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Shopping Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Done</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Est. Cost (Total)</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Linked To</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={item.purchased ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={item.purchased}
                        onCheckedChange={() => handleTogglePurchased(item.id)}
                        aria-label={item.purchased ? 'Mark as not purchased' : 'Mark as purchased'}
                        disabled={isSubmitting}
                      />
                    </TableCell>
                    <TableCell className={`font-medium ${item.purchased ? 'line-through text-muted-foreground' : ''}`}>{item.name}</TableCell>
                    <TableCell className={`text-right ${item.purchased ? 'line-through text-muted-foreground' : ''}`}>{item.quantity}</TableCell>
                    <TableCell className={`${item.purchased ? 'line-through text-muted-foreground' : ''}`}>{item.unit}</TableCell>
                    <TableCell className={`text-right ${item.purchased ? 'line-through text-muted-foreground' : ''}`}>
                      ${(item.estimatedCost * item.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-xs text-muted-foreground ${item.purchased ? 'line-through' : ''}`}>{item.notes}</TableCell>
                    <TableCell className="text-xs">
                        {item.menuId && <div>Menu: {item.menuId.substring(0,6)}...</div>}
                        {item.eventId && <div>Event: {item.eventId.substring(0,6)}...</div>}
                         {(!item.menuId && !item.eventId) && <span className="text-muted-foreground/70">N/A</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openAddItemDialog(item)} className="mr-1" disabled={isSubmitting}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="text-destructive hover:text-destructive" disabled={isSubmitting}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">Your shopping list is empty. Add some items to get started!</p>
          )}
        </CardContent>
        {items.length > 0 && (
            <CardFooter className="flex flex-col items-end space-y-2 pt-4 border-t">
                <div className="text-lg font-semibold flex items-center">
                    <DollarSign className="mr-1 h-5 w-5 text-green-600" data-ai-hint="money cost"/>
                    Remaining Cost: ${remainingCost.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground flex items-center">
                    <DollarSign className="mr-1 h-4 w-4" data-ai-hint="money cost"/>
                    Total Estimated Cost: ${totalEstimatedCost.toFixed(2)}
                </div>
            </CardFooter>
        )}
      </Card>
      
      <div className="flex justify-end mt-6">
        <Button onClick={handleExportToCSV} variant="outline" disabled={items.length === 0 || isSubmitting}>
          <FileDown className="mr-2 h-5 w-5" /> Export to CSV
        </Button>
      </div>
    </div>
  );
}