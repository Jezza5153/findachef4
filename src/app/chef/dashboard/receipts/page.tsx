
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import type { Receipt, CostType } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PlusCircle, Trash2, FileText, Edit3, UploadCloud, CalendarIcon, Download, DollarSign } from 'lucide-react';

const costTypes: CostType[] = ['Ingredient', 'Equipment', 'Tax', 'BAS', 'Travel', 'Other'];

const receiptFormSchema = z.object({
  fileName: z.string().optional(), // Simplified for now
  vendor: z.string().min(1, { message: 'Vendor name is required.' }),
  date: z.date({ required_error: 'Receipt date is required.' }),
  totalAmount: z.coerce.number().min(0.01, { message: 'Total amount must be greater than 0.' }),
  assignedToEventId: z.string().optional(),
  assignedToMenuId: z.string().optional(),
  costType: z.enum(costTypes, { required_error: 'Cost type is required.'}),
  notes: z.string().optional(),
});

type ReceiptFormValues = z.infer<typeof receiptFormSchema>;

const initialReceipts: Receipt[] = [
  { id: 'r1', vendor: 'SuperMart', date: new Date(2024, 6, 15), totalAmount: 125.50, costType: 'Ingredient', assignedToEventId: 'event1', notes: 'Groceries for Corporate Lunch' },
  { id: 'r2', vendor: 'Kitchen Supplies Co.', date: new Date(2024, 6, 10), totalAmount: 75.00, costType: 'Equipment', notes: 'New set of knives' },
  { id: 'r3', vendor: 'Fuel Station', date: new Date(2024, 6, 14), totalAmount: 30.00, costType: 'Travel', assignedToEventId: 'event1' },
];

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const { toast } = useToast();

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: {
      vendor: '',
      totalAmount: 0,
      assignedToEventId: '',
      assignedToMenuId: '',
      costType: undefined,
      notes: '',
    },
  });

  const openUploadDialog = (receiptToEdit: Receipt | null = null) => {
    setEditingReceipt(receiptToEdit);
    if (receiptToEdit) {
      form.reset({
        ...receiptToEdit,
        date: receiptToEdit.date ? new Date(receiptToEdit.date) : new Date(), // Ensure date is a Date object
      });
    } else {
      form.reset({
        fileName: '',
        vendor: '',
        date: new Date(),
        totalAmount: 0,
        assignedToEventId: '',
        assignedToMenuId: '',
        costType: undefined,
        notes: '',
      });
    }
    setIsUploadDialogOpen(true);
  };

  const onSubmitReceipt = (data: ReceiptFormValues) => {
    // Simulate file handling for now
    const receiptFileName = data.fileName || (editingReceipt?.fileName) || `receipt_${Date.now()}.pdf`;

    if (editingReceipt) {
      setReceipts(receipts.map(r => r.id === editingReceipt.id ? { ...editingReceipt, ...data, fileName: receiptFileName } : r));
      toast({ title: 'Receipt Updated', description: `Receipt from "${data.vendor}" has been updated.` });
    } else {
      const newReceipt: Receipt = {
        id: String(Date.now()),
        ...data,
        fileName: receiptFileName,
      };
      setReceipts([...receipts, newReceipt]);
      toast({ title: 'Receipt Added', description: `Receipt from "${data.vendor}" has been added.` });
    }
    form.reset();
    setEditingReceipt(null);
    setIsUploadDialogOpen(false);
  };

  const handleDeleteReceipt = (receiptId: string) => {
    const receiptToDelete = receipts.find(r => r.id === receiptId);
    if (window.confirm(`Are you sure you want to delete the receipt from "${receiptToDelete?.vendor}"?`)) {
      setReceipts(receipts.filter(r => r.id !== receiptId));
      toast({ title: 'Receipt Deleted', description: `Receipt from "${receiptToDelete?.vendor}" removed.`, variant: 'destructive' });
    }
  };
  
  const totalExpenses = useMemo(() => {
    return receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  }, [receipts]);

  const handleExport = () => {
    toast({
      title: 'Export Initiated (Simulated)',
      description: 'Your receipts data would be prepared for export to CSV/Xero here.',
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center">
          <FileText className="mr-3 h-8 w-8 text-primary" /> Receipts & Cost Management
        </h1>
        <Button onClick={() => openUploadDialog()}>
          <PlusCircle className="mr-2 h-5 w-5" /> Upload New Receipt
        </Button>
      </div>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReceipt ? 'Edit Receipt' : 'Upload New Receipt'}</DialogTitle>
            <FormDescription>Fill in the details for your expense. OCR simulation: fields are manual for now.</FormDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitReceipt)} className="space-y-4 p-1">
              <FormField
                control={form.control}
                name="fileName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt File (Simulated)</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Input 
                          type="file" 
                          id="receipt-upload-input" 
                          className="hidden"
                          onChange={(e) => field.onChange(e.target.files?.[0]?.name || '')}
                        />
                        <label 
                            htmlFor="receipt-upload-input" 
                            className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed rounded-md cursor-pointer hover:border-primary"
                        >
                            <UploadCloud className="mr-2 h-4 w-4"/>
                            {field.value || 'Click to select file (simulated)'}
                        </label>
                      </div>
                    </FormControl>
                    <FormDescription>Max 5MB. PDF, JPG, PNG.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vendor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Fresh Produce Market" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Receipt</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                            >
                              {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount ($)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="e.g., 45.99" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="costType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a cost type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {costTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assignedToEventId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Event ID (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g., event123" {...field} /></FormControl>
                      <FormDescription>Link this expense to a specific event.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assignedToMenuId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Menu ID (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g., menu456" {...field} /></FormControl>
                      <FormDescription>Link this expense to a specific menu.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Specific items, reason for expense" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">{editingReceipt ? 'Save Changes' : 'Add Receipt'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {receipts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Cost Type</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead className="text-right w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.vendor}</TableCell>
                    <TableCell>{format(new Date(receipt.date), 'PP')}</TableCell>
                    <TableCell className="text-right">${receipt.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>{receipt.costType}</TableCell>
                    <TableCell className="text-xs">
                        {receipt.assignedToEventId && <div>Event: {receipt.assignedToEventId}</div>}
                        {receipt.assignedToMenuId && <div>Menu: {receipt.assignedToMenuId}</div>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-xs">{receipt.fileName || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openUploadDialog(receipt)} className="mr-1">
                        <Edit3 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteReceipt(receipt.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No receipts uploaded yet. Start by adding your first expense!</p>
          )}
        </CardContent>
         {receipts.length > 0 && (
            <CardFooter className="flex flex-col items-end space-y-2 pt-4 border-t">
                <div className="text-lg font-semibold flex items-center">
                    <DollarSign className="mr-1 h-5 w-5 text-green-600" />
                    Total Expenses: ${totalExpenses.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Monthly report and advanced filtering coming soon.</p>
            </CardFooter>
        )}
      </Card>
      
      <div className="flex justify-end mt-6">
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-5 w-5" /> Export Data (CSV/Xero)
        </Button>
      </div>
    </div>
  );
}
