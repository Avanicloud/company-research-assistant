import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure the response explicitly declares JSON context
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  // Handle preflight OPTIONS requests cleanly
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const serperKey = process.env.SERPER_API_KEY || '';
    const openRouterKey = process.env.OPENROUTER_API_KEY || '';

    return res.status(200).json({
      hasSerperKey: typeof serperKey === 'string' && serperKey.trim().length > 0,
      hasOpenRouterKey: typeof openRouterKey === 'string' && openRouterKey.trim().length > 0,
    });
  } catch (error: any) {
    // If anything fails internally, return a proper JSON error block rather than crashing Vercel
    return res.status(500).json({
      error: 'Failed to parse environment status config',
      details: error?.message || String(error)
    });
  }
}
