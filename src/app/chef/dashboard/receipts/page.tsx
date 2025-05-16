
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
  DialogDescription as ShadDialogDescription, // Alias to avoid conflict
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { Receipt, CostType } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PlusCircle, Trash2, FileText, Edit3, UploadCloud, CalendarIcon, Download, DollarSign, Camera, Sparkles, InfoIcon } from 'lucide-react';
import Image from 'next/image';
import { receiptParserFlow } from '@/ai/flows/receipt-parser-flow'; 

const costTypes: CostType[] = ['Ingredient', 'Equipment', 'Tax', 'BAS', 'Travel', 'Other'];

const receiptFormSchema = z.object({
  file: z.any().optional(), 
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
  { id: 'r1', fileName:'supermart_receipt.pdf', vendor: 'SuperMart', date: new Date(2024, 6, 15), totalAmount: 125.50, costType: 'Ingredient', assignedToEventId: 'event1', notes: 'Groceries for Corporate Lunch' },
  { id: 'r2', fileName:'kitchen_co_invoice.jpg', vendor: 'Kitchen Supplies Co.', date: new Date(2024, 6, 10), totalAmount: 75.00, costType: 'Equipment', notes: 'New set of knives' },
  { id: 'r3', fileName:'fuel_july14.png', vendor: 'Fuel Station', date: new Date(2024, 6, 14), totalAmount: 30.00, costType: 'Travel', assignedToEventId: 'event1' },
];

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>(initialReceipts);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImageDataUri, setCapturedImageDataUri] = useState<string | null>(null);
  const [isPreviewCapture, setIsPreviewCapture] = useState(false);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      file: null,
    },
  });

  useEffect(() => {
    if (isCameraDialogOpen && hasCameraPermission === null) { 
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings.',
          });
        }
      };
      getCameraPermission();
    } else if (!isCameraDialogOpen && videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setHasCameraPermission(null); 
    }
  }, [isCameraDialogOpen, toast, hasCameraPermission]);

  const openUploadDialog = (receiptToEdit: Receipt | null = null) => {
    setEditingReceipt(receiptToEdit);
    setCapturedImageDataUri(null); 
    setIsPreviewCapture(false);
    if (receiptToEdit) {
      form.reset({
        ...receiptToEdit,
        date: receiptToEdit.date ? new Date(receiptToEdit.date) : new Date(),
        file: receiptToEdit.fileName ? { name: receiptToEdit.fileName } : null, 
      });
      // If we store and have an actual image URL for editing
      // if (receiptToEdit.imageUrl) { 
      //   setCapturedImageDataUri(receiptToEdit.imageUrl);
      // }
    } else {
      form.reset({
        vendor: '',
        date: new Date(),
        totalAmount: 0,
        assignedToEventId: '',
        assignedToMenuId: '',
        costType: undefined,
        notes: '',
        file: null,
      });
    }
    setIsUploadDialogOpen(true);
  };

  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg');
        setCapturedImageDataUri(dataUri);
        setIsPreviewCapture(true);
      }
    }
  };

  const handleUseCapturedImage = () => {
    form.setValue('file', { name: `cam_capture_${Date.now()}.jpg` }); 
    setIsCameraDialogOpen(false);
    setIsPreviewCapture(false); 
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('file', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImageDataUri(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleAutoFillWithAI = async () => {
    if (!capturedImageDataUri) {
      toast({ title: "No Image", description: "Please capture or upload an image first.", variant: "destructive" });
      return;
    }
    setIsParsingReceipt(true);
    toast({ title: "AI Processing", description: "Analyzing receipt image..." });
    try {
      const result = await receiptParserFlow({ receiptImageUri: capturedImageDataUri });
      if (result) {
        if (result.vendor) form.setValue('vendor', result.vendor);
        if (result.date) {
           try {
            // Attempt to parse various common date formats AI might return
            const parsedDate = new Date(result.date.replace(/-/g, '/')); // Replace hyphens for broader compatibility
            if (!isNaN(parsedDate.getTime())) {
                 form.setValue('date', parsedDate);
            } else {
                console.warn("AI returned unparsable date format for receipt:", result.date);
                toast({ title: "AI Autofill", description: "Could not parse date from AI. Please set manually.", variant: "default" });
            }
           } catch (e) { 
                console.warn("AI returned invalid date format for receipt:", result.date, e);
                toast({ title: "AI Autofill", description: "Error processing date from AI. Please set manually.", variant: "default" });
            }
        }
        if (result.totalAmount !== undefined) form.setValue('totalAmount', result.totalAmount);
        toast({ title: "AI Autofill Complete", description: "Fields populated. Please review." });
      } else {
        toast({ title: "AI Autofill", description: "Could not extract all information. Please fill manually.", variant: "default" });
      }
    } catch (error) {
      console.error("Error parsing receipt with AI:", error);
      toast({ title: "AI Error", description: "Failed to process receipt with AI.", variant: "destructive" });
    } finally {
      setIsParsingReceipt(false);
    }
  };


  const onSubmitReceipt = (data: ReceiptFormValues) => {
    const receiptFileName = (data.file as File)?.name || editingReceipt?.fileName || `receipt_${Date.now()}.pdf`;

    if (editingReceipt) {
      setReceipts(receipts.map(r => r.id === editingReceipt.id ? { ...editingReceipt, ...data, fileName: receiptFileName, date: data.date as Date } : r));
      toast({ title: 'Receipt Updated', description: `Receipt from "${data.vendor}" has been updated.` });
    } else {
      const newReceipt: Receipt = {
        id: String(Date.now()),
        ...data,
        date: data.date as Date, // Ensure date is a Date object
        fileName: receiptFileName,
        // imageUrl: capturedImageDataUri || undefined, // If we were to store/display this
      };
      setReceipts([...receipts, newReceipt]);
      toast({ title: 'Receipt Added', description: `Receipt from "${data.vendor}" has been added.` });
    }
    form.reset();
    setEditingReceipt(null);
    setIsUploadDialogOpen(false);
    setCapturedImageDataUri(null);
    if (fileInputRef.current) fileInputRef.current.value = ""; 
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
          <FileText className="mr-3 h-8 w-8 text-primary" data-ai-hint="document file"/> Receipts & Cost Management
        </h1>
        <Button onClick={() => openUploadDialog()}>
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Receipt
        </Button>
      </div>

      {/* Main Receipt Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={(isOpen) => {
          setIsUploadDialogOpen(isOpen);
          if (!isOpen) {
            setCapturedImageDataUri(null); 
            setIsPreviewCapture(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReceipt ? 'Edit Receipt' : 'Add New Receipt'}</DialogTitle>
            <ShadDialogDescription>Fill in the details for your expense. Use camera or upload a file.</ShadDialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitReceipt)} className="space-y-4 p-1">
              
              <FormItem>
                <FormLabel>Receipt Image</FormLabel>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCameraDialogOpen(true)} className="w-full sm:w-auto">
                        <Camera className="mr-2 h-4 w-4"/> Capture with Camera
                    </Button>
                    <span className="text-xs text-muted-foreground hidden sm:block">OR</span>
                     <Input 
                        id="receipt-upload-input" 
                        type="file" 
                        accept="image/png, image/jpeg, image/webp, application/pdf"
                        className="w-full sm:flex-1"
                        onChange={handleFileSelected}
                        ref={fileInputRef}
                      />
                </div>
                 {capturedImageDataUri && form.getValues('file') && (
                    <div className="mt-2 text-center">
                        <Image src={capturedImageDataUri} alt="Receipt preview" width={150} height={200} className="rounded-md object-contain mx-auto border" data-ai-hint="receipt document image" />
                        <p className="text-xs text-muted-foreground mt-1">Preview of: {(form.getValues('file') as File)?.name || 'Captured Image'}</p>
                    </div>
                )}
                <FormDescription>Max 5MB. PDF, JPG, PNG, WEBP.</FormDescription>
                 <Button 
                    type="button" 
                    onClick={handleAutoFillWithAI} 
                    disabled={!capturedImageDataUri || isParsingReceipt} 
                    variant="outline"
                    className="w-full mt-2"
                  >
                    <Sparkles className="mr-2 h-4 w-4"/> 
                    {isParsingReceipt ? "Parsing..." : "Auto-fill with AI (from image)"}
                </Button>
              </FormItem>

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
                <Button type="submit" disabled={isParsingReceipt}>{editingReceipt ? 'Save Changes' : 'Add Receipt'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Camera Dialog */}
      <Dialog open={isCameraDialogOpen} onOpenChange={setIsCameraDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Capture Receipt with Camera</DialogTitle>
          </DialogHeader>
          {hasCameraPermission === false && (
            <Alert variant="destructive">
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Please allow camera access in your browser settings to use this feature. You might need to refresh the page after granting permission.
              </AlertDescription>
            </Alert>
          )}
          {/* Always render video and canvas elements to avoid conditional rendering issues with refs */}
          <video ref={videoRef} className={cn("w-full aspect-video rounded-md bg-muted", { 'hidden': hasCameraPermission !== true || isPreviewCapture })} autoPlay playsInline muted />
          <canvas ref={canvasRef} className="hidden"></canvas>
          {hasCameraPermission === true && isPreviewCapture && capturedImageDataUri && (
            <Image src={capturedImageDataUri} alt="Captured receipt" width={400} height={300} className="rounded-md object-contain mx-auto border" data-ai-hint="receipt scan" />
          )}
          
          <DialogFooter className="sm:justify-between">
            {!isPreviewCapture ? (
              <>
                <Button type="button" variant="outline" onClick={() => setIsCameraDialogOpen(false)}>Cancel</Button>
                <Button type="button" onClick={handleCapturePhoto} disabled={hasCameraPermission !== true}>Capture Photo</Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => {setIsPreviewCapture(false); setCapturedImageDataUri(null);}}>Retake</Button>
                <Button type="button" onClick={handleUseCapturedImage}>Use This Image</Button>
              </>
            )}
          </DialogFooter>
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
                  <TableHead>File/Notes</TableHead>
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
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {receipt.fileName && <div className="font-medium text-foreground">{receipt.fileName}</div>}
                      {receipt.notes && <div className="italic">{receipt.notes}</div>}
                    </TableCell>
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
                    <DollarSign className="mr-1 h-5 w-5 text-green-600" data-ai-hint="dollar money currency" />
                    Total Expenses: ${totalExpenses.toFixed(2)}
                </div>
            </CardFooter>
        )}
      </Card>
      
      <Alert className="mt-8">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Payout & Financial Information</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside text-xs space-y-1">
            <li>Payments for completed events are held by FindAChef and typically released to your account 48 hours after the event is marked complete by both parties, allowing a window for customer feedback or complaints.</li>
            <li>For public ticketed events you host via The Wall, payouts are generally scheduled 7 days *before* the event date to help with upfront costs, subject to terms.</li>
            <li>Always ensure all receipts for an event are uploaded promptly for accurate cost tracking and potential tax purposes.</li>
            <li>Cancellation policies and fund release in such cases are detailed in the FindAChef Terms of Service.</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="flex justify-end mt-6">
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-5 w-5" /> Export Data (CSV/Xero)
        </Button>
      </div>
    </div>
  );
}
