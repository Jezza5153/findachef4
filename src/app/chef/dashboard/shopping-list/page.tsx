
'use client';

import { useState, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import { PlusCircle, Trash2, ShoppingCart, FileDown, Edit, DollarSign } from 'lucide-react';

const shoppingListItemSchema = z.object({
  name: z.string().min(1, { message: 'Item name is required.' }),
  quantity: z.coerce.number().min(0.01, { message: 'Quantity must be greater than 0.' }),
  unit: z.string().min(1, { message: 'Unit is required (e.g., kg, pcs, L).' }),
  estimatedCost: z.coerce.number().min(0, { message: 'Estimated cost must be a positive number.' }),
  notes: z.string().optional(),
});

type ShoppingListItemFormValues = z.infer<typeof shoppingListItemSchema>;

const initialShoppingListItems: ShoppingListItem[] = [
  { id: '1', name: 'Chicken Breast', quantity: 2, unit: 'kg', estimatedCost: 20, purchased: false, notes: 'Skinless, boneless' },
  { id: '2', name: 'Basmati Rice', quantity: 1, unit: 'kg', estimatedCost: 5, purchased: true },
  { id: '3', name: 'Olive Oil', quantity: 1, unit: 'bottle (750ml)', estimatedCost: 12, purchased: false },
  { id: '4', name: 'Tomatoes', quantity: 5, unit: 'pcs', estimatedCost: 3, purchased: false, notes: 'Ripe, on vine' },
];

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingListItem[]>(initialShoppingListItems);
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
    },
  });

  const openAddItemDialog = (itemToEdit: ShoppingListItem | null = null) => {
    setEditingItem(itemToEdit);
    if (itemToEdit) {
      form.reset({
        name: itemToEdit.name,
        quantity: itemToEdit.quantity,
        unit: itemToEdit.unit,
        estimatedCost: itemToEdit.estimatedCost,
        notes: itemToEdit.notes || '',
      });
    } else {
      form.reset({
        name: '',
        quantity: 1,
        unit: '',
        estimatedCost: 0,
        notes: '',
      });
    }
    setIsAddItemDialogOpen(true);
  };

  const onSubmitItem = (data: ShoppingListItemFormValues) => {
    if (editingItem) {
      setItems(items.map(item => item.id === editingItem.id ? { ...editingItem, ...data } : item));
      toast({ title: 'Item Updated', description: `"${data.name}" has been updated.` });
    } else {
      const newItem: ShoppingListItem = {
        id: String(Date.now()),
        ...data,
        purchased: false,
      };
      setItems([...items, newItem]);
      toast({ title: 'Item Added', description: `"${data.name}" has been added to your shopping list.` });
    }
    form.reset();
    setEditingItem(null);
    setIsAddItemDialogOpen(false);
  };

  const handleDeleteItem = (itemId: string) => {
    const itemToDelete = items.find(item => item.id === itemId);
    if (window.confirm(`Are you sure you want to delete "${itemToDelete?.name}"?`)) {
      setItems(items.filter(item => item.id !== itemId));
      toast({ title: 'Item Deleted', description: `"${itemToDelete?.name}" removed.`, variant: 'destructive' });
    }
  };

  const handleTogglePurchased = (itemId: string) => {
    setItems(
      items.map(item =>
        item.id === itemId ? { ...item, purchased: !item.purchased } : item
      )
    );
  };

  const totalEstimatedCost = useMemo(() => {
    return items.reduce((sum, item) => sum + item.estimatedCost * item.quantity, 0);
  }, [items]);

  const remainingCost = useMemo(() => {
    return items
      .filter(item => !item.purchased)
      .reduce((sum, item) => sum + item.estimatedCost * item.quantity, 0);
  }, [items]);

  const handleExportToCSV = () => {
    toast({
      title: 'Export to CSV (Simulated)',
      description: 'Your shopping list would be exported as a CSV file here.',
    });
    // Actual CSV export logic would go here
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center">
          <ShoppingCart className="mr-3 h-8 w-8 text-primary" /> My Shopping List
        </h1>
        <Button onClick={() => openAddItemDialog()}>
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Item
        </Button>
      </div>

      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
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
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">{editingItem ? 'Save Changes' : 'Add Item'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
                      />
                    </TableCell>
                    <TableCell className={`font-medium ${item.purchased ? 'line-through text-muted-foreground' : ''}`}>{item.name}</TableCell>
                    <TableCell className={`text-right ${item.purchased ? 'line-through text-muted-foreground' : ''}`}>{item.quantity}</TableCell>
                    <TableCell className={`${item.purchased ? 'line-through text-muted-foreground' : ''}`}>{item.unit}</TableCell>
                    <TableCell className={`text-right ${item.purchased ? 'line-through text-muted-foreground' : ''}`}>
                      ${(item.estimatedCost * item.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-xs text-muted-foreground ${item.purchased ? 'line-through' : ''}`}>{item.notes}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openAddItemDialog(item)} className="mr-1">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="text-destructive hover:text-destructive">
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
                    <DollarSign className="mr-1 h-5 w-5 text-green-600" />
                    Remaining Cost: ${remainingCost.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground flex items-center">
                    <DollarSign className="mr-1 h-4 w-4" />
                    Total Estimated Cost: ${totalEstimatedCost.toFixed(2)}
                </div>
            </CardFooter>
        )}
      </Card>
      
      <div className="flex justify-end mt-6">
        <Button onClick={handleExportToCSV} variant="outline">
          <FileDown className="mr-2 h-5 w-5" /> Export to CSV
        </Button>
      </div>
    </div>
  );
}
