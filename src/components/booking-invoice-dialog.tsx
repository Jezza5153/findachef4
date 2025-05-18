
'use client';

import type { Booking } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { Printer, X } from 'lucide-react';

interface BookingInvoiceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  booking: Booking | null;
  customerName?: string;
}

export function BookingInvoiceDialog({
  isOpen,
  onOpenChange,
  booking,
  customerName,
}: BookingInvoiceDialogProps) {
  if (!booking) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl print:shadow-none print:border-none">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Booking Confirmation / Invoice</DialogTitle>
          <DialogDescription className="text-center">
            Booking ID: {booking.id}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 px-2 print:px-0">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-1">Billed To:</h3>
              <p>{customerName || 'Valued Customer'}</p>
              {/* Add more customer details if available/needed */}
            </div>
            <div className="text-right">
              <h3 className="font-semibold mb-1">Chef Provided By:</h3>
              <p>{booking.chefName}</p>
              <p>FindAChef Platform</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Event/Service:</span>
              <span className="font-medium">{booking.eventTitle}</span>
            </div>
            {booking.menuTitle && booking.menuTitle !== booking.eventTitle && (
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Menu:</span>
                    <span className="font-medium">{booking.menuTitle}</span>
                </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Event Date:</span>
              <span className="font-medium">{format(new Date(booking.eventDate as any), 'PPPpp')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Number of Guests (PAX):</span>
              <span className="font-medium">{booking.pax}</span>
            </div>
            {booking.pricePerHead !== undefined && (
                 <div className="flex justify-between">
                    <span className="text-muted-foreground">Price per Head:</span>
                    <span className="font-medium">${booking.pricePerHead.toFixed(2)}</span>
                </div>
            )}
          </div>
          <Separator />
          <div className="flex justify-between items-center text-lg font-bold mt-4">
            <span>Total Amount:</span>
            <span>${booking.totalPrice.toFixed(2)}</span>
          </div>
          <div className="text-right text-green-600 font-semibold mt-1">
            Status: PAID (Confirmed)
          </div>
          <Separator className="my-6 print:hidden" />
           <p className="text-xs text-muted-foreground print:hidden">
            This confirmation summarizes your booking details. For any discrepancies or questions, please contact support.
          </p>
        </div>
        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
                <X className="mr-2 h-4 w-4" /> Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
