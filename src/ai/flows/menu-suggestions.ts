'use server';

/**
 * @fileOverview Provides menu suggestions based on cuisine preferences and budget.
 *
 * - suggestMenus - A function that suggests menus based on user preferences.
 * - SuggestMenusInput - The input type for the suggestMenus function.
 * - SuggestMenusOutput - The return type for the suggestMenus function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMenusInputSchema = z.object({
  cuisinePreference: z
    .string()
    .describe('The preferred cuisine for the event.'),
  budget: z.number().describe('The budget for the event in USD.'),
  eventDescription: z
    .string()
    .describe('A short description of the event for which menus are being suggested.'),
});
export type SuggestMenusInput = z.infer<typeof SuggestMenusInputSchema>;

const SuggestMenusOutputSchema = z.object({
  menuSuggestions: z
    .array(z.string())
    .describe('An array of suggested menu descriptions.'),
});
export type SuggestMenusOutput = z.infer<typeof SuggestMenusOutputSchema>;

export async function suggestMenus(input: SuggestMenusInput): Promise<SuggestMenusOutput> {
  return suggestMenusFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMenusPrompt',
  input: {schema: SuggestMenusInputSchema},
  output: {schema: SuggestMenusOutputSchema},
  prompt: `You are a menu suggestion bot for a catering company. A customer is requesting menu suggestions. Consider the following:

Cuisine Preference: {{{cuisinePreference}}}
Budget (USD): {{{budget}}}
Event Description: {{{eventDescription}}}

Suggest 3 menu options that fit within the budget and cuisine preference, providing a brief description for each. Each suggestion should be no more than 50 words.

Format your response as a JSON object with a "menuSuggestions" field that is an array of strings, where each string is a menu suggestion.
`,
});

const suggestMenusFlow = ai.defineFlow(
  {
    name: 'suggestMenusFlow',
    inputSchema: SuggestMenusInputSchema,
    outputSchema: SuggestMenusOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
