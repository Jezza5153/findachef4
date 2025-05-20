
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useForm as useTaxForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
//   DialogFooter,
//   DialogClose,
//   DialogDescription as ShadDialogDescription,
// } from '@/components/ui/dialog';
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
import { format, startOfDay, endOfDay } from 'date-fns';
import { PlusCircle, Trash2, FileText, Edit3, UploadCloud, CalendarIcon, Download, DollarSign, Camera, Sparkles, InfoIcon, MessageCircleQuestion, Loader2, Filter, X } from 'lucide-react';
import Image from 'next/image';
import { receiptParserFlow } from '@/ai/flows/receipt-parser-flow'; 
import { getTaxAdvice } from '@/ai/flows/tax-advice-flow';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, serverTimestamp, Timestamp, onSnapshot, orderBy, setDoc, writeBatch } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import dynamic from 'next/dynamic';

const Dialog = dynamic(() => import('@/components/ui/dialog').then(mod => mod.Dialog), { ssr: false });
const DialogContent = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogContent), { ssr: false });
const DialogHeader = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogHeader), { ssr: false });
const DialogTitle = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogTitle), { ssr: false });
const DialogFooter = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogFooter), { ssr: false });
const DialogClose = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogClose), { ssr: false });
const ShadDialogDescription = dynamic(() => import('@/components/ui/dialog').then(mod => mod.DialogDescription), { ssr: false });


const costTypes: CostType[] = ['Ingredient', 'Equipment', 'Tax', 'BAS', 'Travel', 'Other'];

const receiptFormSchema = z.object({
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
  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImageDataUri, setCapturedImageDataUri] = useState<string | null>(null);
  const [fileNameForForm, setFileNameForForm] = useState<string | null>(null); 
  const [isPreviewCapture, setIsPreviewCapture] = useState(false);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [isTaxAdviceDialogOpen, setIsTaxAdviceDialogOpen] = useState(false);
  const [taxAdviceResponse, setTaxAdviceResponse] = useState<TaxAdviceOutput | null>(null);
  const [isFetchingTaxAdvice, setIsFetchingTaxAdvice] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterCostType, setFilterCostType] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>(undefined);
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>(undefined);

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
    if (!user) {
      setIsLoading(false);
      setAllReceipts([]);
      return;
    }
    setIsLoading(true);
    const receiptsCollectionRef = collection(db, "users", user.uid, "receipts");
    const q = query(receiptsCollectionRef, orderBy("date", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedReceipts = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          date: (data.date as Timestamp).toDate(), 
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
        } as Receipt;
      });
      setAllReceipts(fetchedReceipts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching receipts:", error);
      toast({ title: "Error", description: "Could not fetch your receipts.", variant: "destructive" });
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, toast]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraDialogOpen && hasCameraPermission === null) { 
      const getCameraPermission = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isCameraDialogOpen, toast, hasCameraPermission]);

  const filteredReceipts = useMemo(() => {
    return allReceipts.filter(receipt => {
      const matchesCostType = filterCostType === 'all' || receipt.costType === filterCostType;
      const receiptDate = startOfDay(new Date(receipt.date));
      const matchesStartDate = !filterStartDate || receiptDate >= startOfDay(filterStartDate);
      const matchesEndDate = !filterEndDate || receiptDate <= endOfDay(filterEndDate);
      return matchesCostType && matchesStartDate && matchesEndDate;
    });
  }, [allReceipts, filterCostType, filterStartDate, filterEndDate]);

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
    if (!capturedImageDataUri && !editingReceipt?.imageUrl) {
      toast({ title: "Image Required", description: "Please capture or upload a receipt image.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    let imageUrlToSave = editingReceipt?.imageUrl || '';
    const originalFileName = fileNameForForm || (editingReceipt?.fileName) || `receipt_${Date.now()}.jpg`;

    try {
      const receiptIdForPath = editingReceipt?.id || doc(collection(db, 'temp')).id; 

      if (capturedImageDataUri && (!editingReceipt || capturedImageDataUri !== editingReceipt.imageUrl)) {
        if (editingReceipt?.imageUrl && editingReceipt.imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
          try {
            const oldImageRef = storageRef(storage, editingReceipt.imageUrl);
            await deleteObject(oldImageRef).catch(e => console.warn("Old image not found or could not be deleted for receipt:", e));
          } catch (e) { console.warn("Error deleting old receipt image:", e); }
        }

        const blob = dataURIToBlob(capturedImageDataUri);
        const imagePath = `users/${user.uid}/receipts/${receiptIdForPath}/${originalFileName.replace(/[^a-zA-Z0-9.]/g, '_')}`; // Sanitize filename
        const imageStorageRefInstance = storageRef(storage, imagePath);
        
        const uploadTask = uploadBytesResumable(imageStorageRefInstance, blob);
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => { /* Optional: track progress */ }, 
            (error) => { console.error("Receipt image upload error:", error); reject(error); },
            async () => {
              imageUrlToSave = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      const receiptDataToSave: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt'> & { updatedAt: any, createdAt?: any } = {
        ...data,
        chefId: user.uid,
        date: Timestamp.fromDate(data.date),
        imageUrl: imageUrlToSave,
        fileName: originalFileName,
        updatedAt: serverTimestamp(),
      };

      const receiptDocRef = doc(db, "users", user.uid, "receipts", receiptIdForPath);

      if (editingReceipt) {
        await updateDoc(receiptDocRef, receiptDataToSave);
        toast({ title: 'Receipt Updated', description: `Receipt from "${data.vendor}" has been updated.` });
      } else {
        receiptDataToSave.createdAt = serverTimestamp();
        await setDoc(receiptDocRef, { ...receiptDataToSave, id: receiptDocRef.id });
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
    const receiptToDelete = allReceipts.find(r => r.id === receiptId);
    if (!receiptToDelete) return;

    if (window.confirm(`Are you sure you want to delete the receipt from "${receiptToDelete?.vendor}"?`)) {
      setIsSaving(true);
      try {
        if (receiptToDelete.imageUrl && receiptToDelete.imageUrl.startsWith('https://firebasestorage.googleapis.com')) {
          try {
            const imageRefToDelete = storageRef(storage, receiptToDelete.imageUrl);
            await deleteObject(imageRefToDelete);
          } catch (e) {
            console.warn("Could not delete receipt image from storage:", receiptToDelete.imageUrl, e);
          }
        }
        await deleteDoc(doc(db, "users", user.uid, "receipts", receiptId));
        toast({ title: 'Receipt Deleted', description: `Receipt from "${receiptToDelete?.vendor}" removed.`, variant: "destructive" });
      } catch (error) {
        console.error("Error deleting receipt:", error);
        toast({ title: "Delete Error", description: "Could not delete receipt.", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }
  };
  
  const totalExpenses = useMemo(() => {
    return filteredReceipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  }, [filteredReceipts]);

  const expensesByCostType = useMemo(() => {
    const summary: { [key in CostType]?: number } = {};
    costTypes.forEach(type => summary[type] = 0);
    filteredReceipts.forEach(receipt => {
      if (summary[receipt.costType] !== undefined) {
        summary[receipt.costType]! += receipt.totalAmount;
      } else {
        summary[receipt.costType] = receipt.totalAmount;
      }
    });
    return summary;
  }, [filteredReceipts]);

  const handleExport = () => {
    if (filteredReceipts.length === 0) {
      toast({ title: "No Data", description: "Receipt list (with current filters) is empty.", variant: "default" });
      return;
    }
    const headers = ["Vendor", "Date", "Total Amount", "Cost Type", "Assigned to Event ID", "Assigned to Menu ID", "Notes", "File Name", "Image URL"];
    const csvRows = [
      headers.join(','),
      ...filteredReceipts.map(receipt => [
        `"${(receipt.vendor || '').replace(/"/g, '""')}"`,
        format(receipt.date, 'yyyy-MM-dd'),
        receipt.totalAmount.toFixed(2),
        `"${(receipt.costType || '').replace(/"/g, '""')}"`,
        `"${(receipt.assignedToEventId || '').replace(/"/g, '""')}"`,
        `"${(receipt.assignedToMenuId || '').replace(/"/g, '""')}"`,
        `"${(receipt.notes || '').replace(/"/g, '""')}"`,
        `"${(receipt.fileName || '').replace(/"/g, '""')}"`,
        `"${(receipt.imageUrl || '').replace(/"/g, '""')}"`,
      ].join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "filtered_receipts_export.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    toast({ title: 'Export Successful', description: 'Filtered receipts exported to CSV.' });
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

  const clearFilters = () => {
    setFilterCostType('all');
    setFilterStartDate(undefined);
    setFilterEndDate(undefined);
  };

  if (isLoading && !user) { 
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-ai-hint="loading spinner"/>
        <p className="ml-2">Loading page...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center">
          <FileText className="mr-3 h-8 w-8 text-primary" data-ai-hint="document file"/> Receipts &amp; Cost Management
        </h1>
        <div className="flex space-x-2">
            <Button onClick={() => openUploadDialog()} disabled={isSaving || isParsingReceipt}>
                <PlusCircle className="mr-2 h-5 w-5" /> Add New Receipt
            </Button>
            <Button variant="outline" onClick={() => { taxForm.reset(); setTaxAdviceResponse(null); setIsTaxAdviceDialogOpen(true);}}>
                <MessageCircleQuestion className="mr-2 h-5 w-5" /> Get Tax Advice
            </Button>
        </div>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Filter className="mr-2 h-5 w-5 text-primary"/> Filter Receipts</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <FormItem>
            <FormLabel>Cost Type</FormLabel>
            <Select value={filterCostType} onValueChange={setFilterCostType}>
              <SelectTrigger>
                <SelectValue placeholder="All Cost Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cost Types</SelectItem>
                {costTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
          <FormItem>
            <FormLabel>Start Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn('w-full justify-start text-left font-normal', !filterStartDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterStartDate ? format(filterStartDate, 'PPP') : <span>Pick a start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={filterStartDate} onSelect={setFilterStartDate} initialFocus />
              </PopoverContent>
            </Popover>
          </FormItem>
          <FormItem>
            <FormLabel>End Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn('w-full justify-start text-left font-normal', !filterEndDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterEndDate ? format(filterEndDate, 'PPP') : <span>Pick an end date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={filterEndDate} onSelect={setFilterEndDate} initialFocus disabled={{ before: filterStartDate }} />
              </PopoverContent>
            </Popover>
          </FormItem>
          <Button onClick={clearFilters} variant="outline" className="self-end">
            <X className="mr-2 h-4 w-4" /> Clear Filters
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isUploadDialogOpen} onOpenChange={(isOpen) => {
          if ((isSaving || isParsingReceipt) && isOpen) return;
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
            {ShadDialogDescription && <ShadDialogDescription>Fill in the details for your expense. Use camera or upload a file.</ShadDialogDescription>}
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
                  <Button type="button" variant="outline" disabled={isSaving || isParsingReceipt}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving || isParsingReceipt}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (editingReceipt ? 'Save Changes' : 'Add Receipt')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCameraDialogOpen} onOpenChange={(open) => {
          if (!open && videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
            setHasCameraPermission(null); // Reset permission check for next open
          }
          setIsCameraDialogOpen(open);
      }}>
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
           {/* Video tag is always rendered to avoid race condition with srcObject */}
          <video ref={videoRef} className={cn("w-full aspect-video rounded-md bg-muted", { 'hidden': isPreviewCapture })} autoPlay playsInline muted />
          <canvas ref={canvasRef} className="hidden"></canvas>
          {isPreviewCapture && capturedImageDataUri && (
            <Image src={capturedImageDataUri} alt="Captured receipt" width={400} height={300} className="rounded-md object-contain mx-auto border" data-ai-hint="receipt scan" />
          )}
          
          <DialogFooter className="sm:justify-between">
            {!isPreviewCapture ? (
              <>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
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

      <Dialog open={isTaxAdviceDialogOpen} onOpenChange={setIsTaxAdviceDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>AI Tax Advice Assistant</DialogTitle>
                {ShadDialogDescription && <ShadDialogDescription>Ask a tax-related question based on your region. This is not professional advice.</ShadDialogDescription>}
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
          <CardTitle>Expenses Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2">Loading summary...</p>
            </div>
          ) : filteredReceipts.length === 0 && allReceipts.length > 0 ? (
            <p className="text-muted-foreground text-center py-4">No receipts match the current filters.</p>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">By Cost Type:</h4>
              {Object.entries(expensesByCostType).map(([type, amount]) => (
                (amount ?? 0) > 0 && (
                  <div key={type} className="flex justify-between text-sm py-1 border-b last:border-b-0">
                    <span>{type}:</span>
                    <span className="font-medium">${(amount ?? 0).toFixed(2)}</span>
                  </div>
                )
              ))}
               {Object.values(expensesByCostType).every(val => (val ?? 0) === 0) && <p className="text-xs text-muted-foreground">No expenses for selected filters.</p>}
            </div>
            <div className="flex flex-col justify-end items-end">
              <div className="text-lg font-semibold flex items-center">
                <DollarSign className="mr-1 h-5 w-5 text-green-600" data-ai-hint="money cost"/>
                Total (Filtered): ${totalExpenses.toFixed(2)}
              </div>
               <p className="text-xs text-muted-foreground">
                 Total of {filteredReceipts.length} receipt(s) matching filters.
              </p>
            </div>
          </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Uploaded Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && allReceipts.length === 0 ? (
             <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2">Loading receipts...</p>
            </div>
          ) : filteredReceipts.length > 0 ? (
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
                {filteredReceipts.map((receipt) => (
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
                      <Button variant="ghost" size="icon" onClick={() => openUploadDialog(receipt)} className="mr-1" disabled={isSaving || isParsingReceipt}>
                        <Edit3 className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteReceipt(receipt.id)} className="text-destructive hover:text-destructive" disabled={isSaving || isParsingReceipt}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
                {allReceipts.length === 0 ? "No receipts uploaded yet. Start by adding your first expense!" : "No receipts match the current filters. Try adjusting or clearing them."}
            </p>
          )}
        </CardContent>
      </Card>
      
      <Card className="mt-8">
        <CardHeader>
            <CardTitle>Financial Tools &amp; Future Features</CardTitle>
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
        <AlertTitle>Payout &amp; Financial Information</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside text-xs space-y-1">
            <li><strong>Initial Fund Distribution:</strong> Upon customer booking confirmation, 46% of the event cost is released to the chef and 4% to FindAChef immediately.</li>
            <li><strong>Escrow &amp; Final Release:</strong> The remaining 50% is held by FindAChef. This portion is released to the chef after the event is confirmed complete by the customer (typically via QR code scan at the event).</li>
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
        <Button onClick={handleExport} variant="outline" disabled={filteredReceipts.length === 0}>
          <Download className="mr-2 h-5 w-5" /> Export Filtered Data (CSV)
        </Button>
      </div>
    </div>
  );
}
