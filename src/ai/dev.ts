
import { config } from 'dotenv';
config();

import '@/ai/flows/resume-parser.ts';
import '@/ai/flows/menu-suggestions.ts'; // For suggesting whole menus
import '@/ai/flows/receipt-parser-flow.ts'; 
import '@/ai/flows/tax-advice-flow.ts';
import '@/ai/flows/menu-item-assist-flow.ts'; // For assisting with single menu item details
