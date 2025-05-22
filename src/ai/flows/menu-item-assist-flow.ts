
'use server';
/**
 * @fileOverview Provides AI assistance for refining menu item descriptions.
 *
 * - assistMenuItem - A function that suggests enhancements for a menu item description.
 * - MenuItemAssistInput - The input type for the assistMenuItem function.
 * - MenuItemAssistOutput - The return type for the assistMenuItem function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MenuItemAssistInputSchema = z.object({
  menuTitle: z.string().describe('The title of the menu item.'),
  currentDescription: z.string().max(N).optional().describe('The current description of the menu item (if any).'),
  cuisine: z.string().describe('The cuisine type of the menu item.'),
  keyIngredients: z.string().max().optional().describe('Optional: Comma-separated key ingredients to highlight or consider.'),
});
export type MenuItemAssistInput = z.infer<typeof MenuItemAssistInputSchema>;

const MenuItemAssistOutputSchema = z.object({
  suggestedDescription: z.string().describe('A suggested, enhanced description for the menu item.'),
});
export type MenuItemAssistOutput = z.infer<typeof MenuItemAssistOutputSchema>;

export async function assistMenuItem(input: MenuItemAssistInput): Promise<MenuItemAssistOutput> {
  return menuItemAssistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'menuItemAssistPrompt',
  input: {schema: MenuItemAssistInputSchema},
  output: {schema: MenuItemAssistOutputSchema},
  prompt: `You are a creative culinary writer and menu consultant.
A chef needs help refining the description for their menu item.

Menu Item Title: {{{menuTitle}}}
Cuisine Type: {{{cuisine}}}
{{#if currentDescription}}Current Description: {{{currentDescription}}}{{/if}}
{{#if keyIngredients}}Key Ingredients to consider: {{{keyIngredients}}}{{/if}}

Based on this information, please craft a compelling and appealing new description for this menu item.
The description should be concise yet evocative, highlighting its best qualities.
If a current description is provided, aim to enhance it or offer a fresh perspective.
Focus on sensory details, unique aspects, or the story behind the dish if applicable.

Return ONLY the suggested description in the 'suggestedDescription' field of the JSON output.
Do not add any preamble or explanation, just the description text.
For example:
If the current description is "Chicken with rice", and title is "Lemon Herb Chicken", cuisine "Mediterranean", ingredients "lemon, oregano, thyme".
A good suggested description might be: "Tender, pan-seared chicken breast marinated in a vibrant blend of fresh lemon, oregano, and thyme, served alongside fluffy basmati rice. A Mediterranean classic, bursting with zesty and herbaceous flavors."
`,
});

const menuItemAssistFlow = ai.defineFlow(
  {
    name: 'menuItemAssistFlow',
    inputSchema: MenuItemAssistInputSchema,
    outputSchema: MenuItemAssistOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
