
'use server';
/**
 * @fileOverview Provides AI-powered tax advice for chefs.
 *
 * - getTaxAdvice - A function that generates tax advice based on region and query.
 * - TaxAdviceInput - The input type for the getTaxAdvice function.
 * - TaxAdviceOutput - The return type for the getTaxAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaxAdviceInputSchema = z.object({
  region: z.string().min(2, {message: 'Region is required.'}).describe("The chef's country or region for tax context (e.g., Australia, California, UK)."),
  query: z.string().min(10, {message: 'Query must be at least 10 characters.'}).describe("The chef's specific tax-related question."),
});
export type TaxAdviceInput = z.infer<typeof TaxAdviceInputSchema>;

const TaxAdviceOutputSchema = z.object({
  advice: z.string().describe("Generated tax advice based on the region and query."),
  disclaimer: z.string().describe("Standard disclaimer about the advice not being professional financial counsel."),
});
export type TaxAdviceOutput = z.infer<typeof TaxAdviceOutputSchema>;

export async function getTaxAdvice(input: TaxAdviceInput): Promise<TaxAdviceOutput> {
  return taxAdviceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'taxAdvicePrompt',
  input: {schema: TaxAdviceInputSchema},
  output: {schema: TaxAdviceOutputSchema},
  prompt: `You are an AI assistant providing general tax information for chefs.
The chef is in the region: {{{region}}}.
Their question is: "{{{query}}}"

Provide helpful, general tax-related advice relevant to their query and region.

IMPORTANT: Always include the following disclaimer at the end of your advice:
"Disclaimer: This information is for general guidance only and not professional tax or financial advice. Consult with a qualified professional for advice tailored to your specific situation."

Structure your response as a JSON object with "advice" and "disclaimer" fields.
`,
});

const taxAdviceFlow = ai.defineFlow(
  {
    name: 'taxAdviceFlow',
    inputSchema: TaxAdviceInputSchema,
    outputSchema: TaxAdviceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure disclaimer is always part of the output, even if AI forgets.
    const baseDisclaimer = "Disclaimer: This information is for general guidance only and not professional tax or financial advice. Consult with a qualified professional for advice tailored to your specific situation.";
    if (!output?.disclaimer) {
        return { advice: output?.advice || "Could not generate advice at this time.", disclaimer: baseDisclaimer };
    }
    // Ensure the standard disclaimer is present, append if AI's disclaimer is different or missing.
    if (output.disclaimer !== baseDisclaimer) {
        return { advice: output.advice, disclaimer: `${output.disclaimer} ${baseDisclaimer}`.trim() };
    }
    return output!;
  }
);
