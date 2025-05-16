
'use server';
/**
 * @fileOverview Parses a receipt image to extract vendor, date, total amount, and suggest a cost type.
 *
 * - receiptParserFlow - A function that handles the receipt parsing process.
 * - ReceiptParserInput - The input type for the receiptParserFlow function.
 * - ReceiptParserOutput - The return type for the receiptParserFlow function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { CostType } from '@/types'; 

// Define the cost types as a tuple for Zod enum
const validCostTypes: [CostType, ...CostType[]] = ['Ingredient', 'Equipment', 'Tax', 'BAS', 'Travel', 'Other'];


const ReceiptParserInputSchema = z.object({
  receiptImageUri: z
    .string()
    .describe(
      "A receipt image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ReceiptParserInput = z.infer<typeof ReceiptParserInputSchema>;

const ReceiptParserOutputSchema = z.object({
  vendor: z.string().optional().describe('The vendor name extracted from the receipt.'),
  date: z.string().optional().describe('The transaction date (YYYY-MM-DD) from the receipt.'),
  totalAmount: z.number().optional().describe('The total amount from the receipt.'),
  suggestedCostType: z.enum(validCostTypes).optional().describe(`The suggested cost category for this receipt (e.g., ${validCostTypes.join(', ')}).`),
});
export type ReceiptParserOutput = z.infer<typeof ReceiptParserOutputSchema>;

export async function receiptParserFlow(input: ReceiptParserInput): Promise<ReceiptParserOutput> {
  return flow(input);
}

const prompt = ai.definePrompt({
  name: 'receiptParserPrompt',
  input: {schema: ReceiptParserInputSchema},
  output: {schema: ReceiptParserOutputSchema},
  prompt: `You are an expert receipt analysis AI. Analyze the provided receipt image.
Extract the following information:
1.  Vendor Name (e.g., "SuperMart", "Kitchen Supplies Co.")
2.  Transaction Date (format as YYYY-MM-DD)
3.  Total Amount (as a number, e.g., 125.50)
4.  Suggested Cost Type: Based on the vendor and items (if visible), suggest one of the following cost types: ${validCostTypes.join(', ')}.

Receipt Image: {{media url=receiptImageUri}}

Return the extracted information in the specified JSON format. If a field cannot be determined, omit it or set it to null where appropriate based on the schema.
`,
});

const flow = ai.defineFlow(
  {
    name: 'receiptParserFlow', // Name of the flow
    inputSchema: ReceiptParserInputSchema,
    outputSchema: ReceiptParserOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
