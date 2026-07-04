import type { VercelRequest, VercelResponse } from '@vercel/node';
import { performCompanyResearch } from '../server/research';
import type { ResearchRequest } from '../src/types';

export const config = {
  maxDuration: 60,
  memory: 1024,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const { input, apiConfig, discordConfig } = req.body as ResearchRequest;

  if (!input || !input.trim()) {
    return res.status(400).json({ success: false, error: 'Input company name or website URL is required.' });
  }

  try {
    console.log(`[API] Received research request for: "${input}"`);

    const { result, discordSuccess } = await performCompanyResearch(
      input,
      apiConfig,
      discordConfig
    );

    return res.status(200).json({
      success: true,
      result,
      discordSuccess,
    });
  } catch (err: any) {
    console.error('[API Error] Research failed:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
