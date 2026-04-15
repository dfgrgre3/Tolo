
import { AI_PROVIDERS } from './src/lib/ai-config';

async function check() {
  console.log('Checking AI Providers API Keys:');
  for (const [key, provider] of Object.entries(AI_PROVIDERS)) {
    console.log(`${key}: ${provider.apiKey ? 'PRESENT (starts with ' + provider.apiKey.substring(0, 4) + '...)' : 'MISSING'}`);
  }
}

check();
