import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    hasSerperKey: !!(process.env.SERPER_API_KEY || '').trim(),
    hasOpenRouterKey: !!(process.env.OPENROUTER_API_KEY || '').trim(),
  });
}
