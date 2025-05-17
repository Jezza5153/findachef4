
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useForm as useTaxForm } from 'react-hook-form';
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
  DialogDescription as ShadDialogDescription,
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
import type { Receipt, CostType, TaxAdviceInput, TaxAdviceOutput } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PlusCircle, Trash2, FileText, Edit3, UploadCloud, CalendarIcon, Download, DollarSign, Camera, Sparkles, InfoIcon, MessageCircleQuestion, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { receiptParserFlow } from '@/ai/flows/receipt-parser-flow'; 
import { getTaxAdvice } from '@/ai/flows/tax-advice-flow';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, serverTimestamp, Timestamp, orderBy } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

const costTypes: CostType[] = ['Ingredient', 'Equipment', 'Tax', 'BAS', 'Travel', 'Other'];

const receiptFormSchema = z.object({
  // File is handled by capturedImageDataUri, not directly in Zod schema for form submit
  vendor: z.string().min(1, { message: 'Vendor name is required.' }),
  date: z.date({ required_error: 'Receipt date is required.' }),
  totalAmount: z.coerce.number().min(0.01, { message: 'Total amount must be greater than 0.' }),
  assignedToEventId: z.string().optional(),
  assignedToMenuId: z.string().optional(),
  costType: z.enum(costTypes as [CostType, ...CostType[]], { required_error: 'Cost type is required.'}),
  notes: z.string().optional(),
});

type ReceiptFormValues = z.infer<typeof receiptFormSchema>;

const taxAdviceFormSchema = z.object({
    region: z.string().min(2, { message: 'Region is required (e.g., Australia, California).' }),
    query: z.string().min(10, { message: 'Please enter a specific tax question (min 10 characters).' }),
});
type TaxAdviceFormValues = z.infer<typeof taxAdviceFormSchema>;

export default function ReceiptsPage() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImageDataUri, setCapturedImageDataUri] = useState<string | null>(null);
  const [fileNameForForm, setFileNameForForm] = useState<string | null>(null); // For displaying original filename
  const [isPreviewCapture, setIsPreviewCapture] = useState(false);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [isTaxAdviceDialogOpen, setIsTaxAdviceDialogOpen] = useState(false);
  const [taxAdviceResponse, setTaxAdviceResponse] = useState<TaxAdviceOutput | null>(null);
  const [isFetchingTaxAdvice, setIsFetchingTaxAdvice] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: {
      vendor: '',
      date: new Date(),
      totalAmount: 0,
      assignedToEventId: '',
      assignedToMenuId: '',
      costType: undefined,
      notes: '',
    },
  });

  const taxForm = useTaxForm<TaxAdviceFormValues>({
    resolver: zodResolver(taxAdviceFormSchema),
    defaultValues: {
        region: '',
        query: '',
    },
  });

  useEffect(() => {
    const fetchReceipts = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const receiptsCollectionRef = collection(db, "users", user.uid, "receipts");
        const q = query(receiptsCollectionRef, orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        const fetchedReceipts = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: (data.date as Timestamp).toDate(), // Convert Firestore Timestamp to Date
          } as Receipt;
        });
        setReceipts(fetchedReceipts);
      } catch (error) {
        console.error("Error fetching receipts:", error);
        toast({ title: "Error", description: "Could not fetch your receipts.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchReceipts();
  }, [user, toast]);

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
    setCapturedImageDataUri(receiptToEdit?.imageUrl || null);
    setFileNameForForm(receiptToEdit?.fileName || null);
    setIsPreviewCapture(false);
    if (receiptToEdit) {
      form.reset({
        vendor: receiptToEdit.vendor,
        date: receiptToEdit.date ? new Date(receiptToEdit.date) : new Date(),
        totalAmount: receiptToEdit.totalAmount,
        assignedToEventId: receiptToEdit.assignedToEventId || '',
        assignedToMenuId: receiptToEdit.assignedToMenuId || '',
        costType: receiptToEdit.costType,
        notes: receiptToEdit.notes || '',
      });
    } else {
      form.reset({
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
        setFileNameForForm(`cam_capture_${Date.now()}.jpg`);
        setIsPreviewCapture(true);
      }
    }
  };

  const handleUseCapturedImage = () => {
    setIsCameraDialogOpen(false);
    // capturedImageDataUri and fileNameForForm are already set
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileNameForForm(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImageDataUri(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFileNameForForm(null);
      setCapturedImageDataUri(null);
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
            const parsedDate = new Date(result.date.replace(/-/g, '/')); 
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
        if (result.totalAmount !== undefined && result.totalAmount !== null) form.setValue('totalAmount', result.totalAmount);
        if (result.suggestedCostType) form.setValue('costType', result.suggestedCostType);
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

  // Helper function to convert data URI to Blob
  const dataURIToBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const onSubmitReceipt = async (data: ReceiptFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    let imageUrl = editingReceipt?.imageUrl || '';
    const originalFileName = fileNameForForm || (editingReceipt?.fileName) || `receipt_${Date.now()}.jpg`;

    try {
      if (capturedImageDataUri && (!editingReceipt || capturedImageDataUri !== editingReceipt.imageUrl)) {
        // New image or changed image
        if (editingReceipt?.imageUrl) {
          try {
            const oldImageRef = storageRef(storage, editingReceipt.imageUrl);
            await deleteObject(oldImageRef).catch(e => console.warn("Old image not found or could not be deleted for receipt:", e));
          } catch (e) { console.warn("Error deleting old receipt image:", e); }
        }

        const blob = dataURIToBlob(capturedImageDataUri);
        const imagePath = `users/${user.uid}/receipts/${editingReceipt?.id || doc(collection(db, 'temp')).id}/${originalFileName}`;
        const imageStorageRef = storageRef(storage, imagePath);
        
        toast({ title: "Uploading receipt image...", description: "Please wait." });
        const uploadTask = uploadBytesResumable(imageStorageRef, blob);
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', null, 
            (error) => { console.error("Receipt image upload error:", error); reject(error); },
            async () => {
              imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      const receiptDataToSave = {
        ...data,
        chefId: user.uid,
        date: Timestamp.fromDate(data.date),
        imageUrl: imageUrl,
        fileName: originalFileName,
        updatedAt: serverTimestamp(),
      };

      if (editingReceipt) {
        const receiptDocRef = doc(db, "users", user.uid, "receipts", editingReceipt.id);
        await updateDoc(receiptDocRef, receiptDataToSave);
        setReceipts(receipts.map(r => r.id === editingReceipt.id ? { ...editingReceipt, ...receiptDataToSave, date: data.date } : r));
        toast({ title: 'Receipt Updated', description: `Receipt from "${data.vendor}" has been updated.` });
      } else {
        const finalData = { ...receiptDataToSave, createdAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, "users", user.uid, "receipts"), finalData);
        setReceipts([{ ...finalData, id: docRef.id, date: data.date }, ...receipts].sort((a,b) => b.date.getTime() - a.date.getTime()));
        toast({ title: 'Receipt Added', description: `Receipt from "${data.vendor}" has been added.` });
      }
      
      form.reset();
      setEditingReceipt(null);
      setIsUploadDialogOpen(false);
      setCapturedImageDataUri(null);
      setFileNameForForm(null);
      if (fileInputRef.current) fileInputRef.current.value = ""; 

    } catch (error) {
      console.error('Error saving receipt:', error);
      toast({ title: 'Save Failed', description: 'Could not save your receipt. Please try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!user) return;
    const receiptToDelete = receipts.find(r => r.id === receiptId);
    if (!receiptToDelete) return;

    if (window.confirm(`Are you sure you want to delete the receipt from "${receiptToDelete?.vendor}"?`)) {
      setIsSaving(true);
      try {
        if (receiptToDelete.imageUrl) {
          try {
            const imageRef = storageRef(storage, receiptToDelete.imageUrl);
            await deleteObject(imageRef);
          } catch (e) {
            console.warn("Could not delete receipt image from storage:", e);
          }
        }
        await deleteDoc(doc(db, "users", user.uid, "receipts", receiptId));
        setReceipts(receipts.filter(r => r.id !== receiptId));
        toast({ title: 'Receipt Deleted', description: `Receipt from "${receiptToDelete?.vendor}" removed.`, variant: 'destructive' });
      } catch (error) {
        console.error("Error deleting receipt:", error);
        toast({ title: "Delete Error", description: "Could not delete receipt.", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
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

  const onSubmitTaxAdvice = async (data: TaxAdviceFormValues) => {
    setIsFetchingTaxAdvice(true);
    setTaxAdviceResponse(null);
    toast({ title: "Getting Tax Advice", description: "Please wait..." });
    try {
        const response = await getTaxAdvice(data);
        setTaxAdviceResponse(response);
    } catch (error) {
        console.error("Error getting tax advice:", error);
        toast({ title: "AI Error", description: "Failed to get tax advice.", variant: "destructive" });
        setTaxAdviceResponse({ advice: "Could not retrieve advice at this time.", disclaimer: "Please try again later."});
    } finally {
        setIsFetchingTaxAdvice(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading receipts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center">
          <FileText className="mr-3 h-8 w-8 text-primary" data-ai-hint="document file"/> Receipts & Cost Management
        </h1>
        <div className="flex space-x-2">
            <Button onClick={() => openUploadDialog()} disabled={isSaving}>
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Receipt
            </Button>
            <Button variant="outline" onClick={() => { taxForm.reset(); setTaxAdviceResponse(null); setIsTaxAdviceDialogOpen(true);}}>
                <MessageCircleQuestion className="mr-2 h-5 w-5" /> Get Tax Advice
            </Button>
        </div>
      </div>

      <Dialog open={isUploadDialogOpen} onOpenChange={(isOpen) => {
          if (isSaving && isOpen) return;
          setIsUploadDialogOpen(isOpen);
          if (!isOpen) {
            setCapturedImageDataUri(null); 
            setFileNameForForm(null);
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
                 {capturedImageDataUri && (
                    <div className="mt-2 text-center">
                        <Image src={capturedImageDataUri} alt="Receipt preview" width={150} height={200} className="rounded-md object-contain mx-auto border" data-ai-hint="receipt document" />
                        {fileNameForForm && <p className="text-xs text-muted-foreground mt-1">Preview of: {fileNameForForm}</p>}
                    </div>
                )}
                <FormDescription>Max 5MB. PDF, JPG, PNG, WEBP.</FormDescription>
                 <Button 
                    type="button" 
                    onClick={handleAutoFillWithAI} 
                    disabled={!capturedImageDataUri || isParsingReceipt || isSaving} 
                    variant="outline"
                    className="w-full mt-2"
                  >
                    {isParsingReceipt ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/> }
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
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
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
                  <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving || isParsingReceipt}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (editingReceipt ? 'Save Changes' : 'Add Receipt')}
                </Button>
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
                <Button type="button" variant="outline" onClick={() => {setIsPreviewCapture(false); setCapturedImageDataUri(null); setFileNameForForm(null);}}>Retake</Button>
                <Button type="button" onClick={handleUseCapturedImage}>Use This Image</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tax Advice Dialog */}
      <Dialog open={isTaxAdviceDialogOpen} onOpenChange={setIsTaxAdviceDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>AI Tax Advice Assistant</DialogTitle>
                <ShadDialogDescription>Ask a tax-related question based on your region. This is not professional advice.</ShadDialogDescription>
            </DialogHeader>
            <Form {...taxForm}>
                <form onSubmit={taxForm.handleSubmit(onSubmitTaxAdvice)} className="space-y-4">
                    <FormField
                        control={taxForm.control}
                        name="region"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Your Country/Region</FormLabel>
                                <FormControl><Input placeholder="e.g., Australia, California, UK" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={taxForm.control}
                        name="query"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Your Tax Question</FormLabel>
                                <FormControl><Textarea placeholder="e.g., What are common tax deductions for private chefs?" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isFetchingTaxAdvice} className="w-full">
                        {isFetchingTaxAdvice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircleQuestion className="mr-2 h-4 w-4" />}
                        {isFetchingTaxAdvice ? "Getting Advice..." : "Ask AI"}
                    </Button>
                </form>
            </Form>
            {taxAdviceResponse && (
                <div className="mt-6 space-y-3 rounded-md border bg-muted/50 p-4">
                    <h4 className="font-semibold">AI Response:</h4>
                    <p className="text-sm whitespace-pre-wrap">{taxAdviceResponse.advice}</p>
                    <p className="text-xs italic text-muted-foreground">{taxAdviceResponse.disclaimer}</p>
                </div>
            )}
             <DialogFooter className="mt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Close</Button>
                </DialogClose>
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
                      {receipt.imageUrl && <a href={receipt.imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">(View Image)</a>}
                      {receipt.notes && <div className="italic">{receipt.notes}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openUploadDialog(receipt)} className="mr-1" disabled={isSaving}>
                        <Edit3 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteReceipt(receipt.id)} className="text-destructive hover:text-destructive" disabled={isSaving}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            !isLoading && <p className="text-muted-foreground text-center py-8">No receipts uploaded yet. Start by adding your first expense!</p>
          )}
           {isLoading && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2">Loading receipts...</p>
            </div>
          )}
        </CardContent>
         {receipts.length > 0 && (
            <CardFooter className="flex flex-col items-end space-y-2 pt-4 border-t">
                <div className="text-lg font-semibold flex items-center">
                    <DollarSign className="mr-1 h-5 w-5 text-green-600" data-ai-hint="dollar money" />
                    Total Expenses: ${totalExpenses.toFixed(2)}
                </div>
            </CardFooter>
        )}
      </Card>
      
      <Card className="mt-8">
        <CardHeader>
            <CardTitle>Financial Tools & Future Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
                <strong>Event Profitability:</strong> In the future, you'll be able to filter receipts by Event ID to see specific cost breakdowns and calculate profitability for each event.
            </p>
            <p>
                <strong>Invoice Generation:</strong> Upon event completion and confirmation, invoices will be automatically generated for both you and the customer, accessible through your respective dashboards.
            </p>
             <p>
                <strong>AI Cost Insights:</strong> We're working on AI tools to provide deeper insights into your spending patterns, helping you optimize menu pricing and purchasing. (Placeholder: A button "Get AI Insights on Event Costs" could appear here when an event is selected/filtered).
            </p>
        </CardContent>
      </Card>

      <Alert className="mt-8">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Payout & Financial Information</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside text-xs space-y-1">
            <li><strong>Initial Fund Distribution:</strong> Upon customer booking confirmation, 46% of the event cost is released to the chef and 4% to FindAChef immediately.</li>
            <li><strong>Escrow & Final Release:</strong> The remaining 50% is held by FindAChef. This portion is released to the chef after the event is confirmed complete by the customer (typically via QR code scan at the event).</li>
            <li><strong>Public Ticketed Events:</strong> For events you host and sell tickets for via The Chef's Wall, payouts are generally scheduled 7 days *before* the event date to assist with upfront costs (subject to terms).</li>
            <li><strong>Cancellations by Chef:</strong> If a chef cancels an event, a full refund is issued to the customer. Admin will be notified to assist and manage chef accountability, which may include penalties if a replacement cannot be found.</li>
            <li><strong>Cancellations by Customer:</strong>
                <ul>
                    <li>If a customer cancels more than 20 days before the event, a 50% refund is typically processed.</li>
                    <li>If a customer cancels less than 20 days before the event, a 20% refund is processed. In this case, 15% of the total event cost goes to the chef and 15% to FindAChef.</li>
                    <li>Refer to the full <a href="/terms#cancellation" className="underline hover:text-primary">Terms of Service</a> for complete cancellation policy details.</li>
                </ul>
            </li>
            <li>Always ensure all receipts for an event are uploaded promptly for accurate cost tracking and potential tax purposes.</li>
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
    
