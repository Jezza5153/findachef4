
import {genkit} from 'genkit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {googleAI} from '@genkit-ai/googleai';

// This console.log will appear in your server terminal when Genkit initializes,
// typically when you run `npm run genkit:dev` or when a flow is first invoked
// in a server environment (like a Next.js API route or server component if flows were used there).
if (process.env.GOOGLE_API_KEY) {
  console.log("Genkit: GOOGLE_API_KEY found (first 5 chars):", process.env.GOOGLE_API_KEY.substring(0,5) + "...");
} else {
  console.warn("Genkit: GOOGLE_API_KEY is NOT defined in environment variables. AI features requiring this key (especially server-side flows or Genkit dev server) will fail.");
}

export const ai = genkit({
  plugins: [
    googleAI({
      // The googleAI plugin will automatically look for GOOGLE_API_KEY in process.env
      // apiKey: process.env.GOOGLE_API_KEY // Explicitly setting it here is also an option
    }),
  ],
  // We've set the model in flows directly, but a default can be set here too.
  model: 'googleai/gemini-pro', // Example default model
  model: 'googleai/gemini-1.5-flash-latest',
});
