import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This console.log will appear in your server terminal when Genkit initializes,
// typically when you run `npm run genkit:dev` or when a flow is first invoked
// in a server environment (like a Next.js API route or server component if flows were used there).
// For client-side flow calls, the key needs to be available to the Genkit client library,
// which usually happens if it's bundled or if Genkit is configured for client-side API key usage.
// However, Genkit typically encourages backend-brokered calls for API keys.
// For now, we assume process.env.GOOGLE_API_KEY is accessible where Genkit's googleAI() plugin initializes.
if (process.env.GOOGLE_API_KEY) {
  console.log("Genkit: GOOGLE_API_KEY found (first 5 chars):", process.env.GOOGLE_API_KEY.substring(0,5) + "...");
} else {
  console.warn("Genkit: GOOGLE_API_KEY is NOT defined in environment variables. AI features requiring this key will fail.");
}

export const ai = genkit({
  plugins: [
    googleAI({
      // The googleAI plugin will automatically look for GOOGLE_API_KEY in process.env
      // apiKey: process.env.GOOGLE_API_KEY // Explicitly setting it here is also an option
    }),
  ],
  // We've set the model in flows directly, but a default can be set here too.
  // model: 'googleai/gemini-pro', // Example default model
});
