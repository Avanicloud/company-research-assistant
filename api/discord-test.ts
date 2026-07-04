import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateCompanyReportPdf } from '../server/pdf.js';
import { sendReportToDiscord } from '../server/discord.js';
import type { CompanyResearchResult, DiscordConfig } from '../src/types.js';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const { discordConfig, result } = req.body as {
    discordConfig: DiscordConfig;
    result?: CompanyResearchResult;
  };

  if (!discordConfig || !discordConfig.botToken || !discordConfig.channelId) {
    return res.status(400).json({ success: false, error: 'Bot Token and Channel ID are required.' });
  }

  try {
    console.log(`[API] Triggering Discord test to channel: ${discordConfig.channelId}`);

    const targetResult: CompanyResearchResult = result || {
      companyName: 'Test Connectivity Corp',
      website: 'https://example.com',
      phone: '1-800-555-0199',
      address: 'One Microsoft Way, Redmond, WA',
      summary: 'A developer playground testing harness for Relu Consultancy candidates.',
      products: ['Product Analytics Suite', 'AI Auto-delivery Bot'],
      painPoints: ['Discord Integration Debugging: Resolving developer bot tokens.'],
      competitors: [{ name: 'Relu Consultancy', website: 'https://relu.consultancy' }],
      crawledPages: [],
    };

    const pdfBuffer = await generateCompanyReportPdf(targetResult);

    const success = await sendReportToDiscord(
      discordConfig.botToken,
      discordConfig.channelId,
      discordConfig.applicantName || 'Tester',
      discordConfig.applicantEmail || 'tester@example.com',
      targetResult.companyName,
      targetResult.website,
      pdfBuffer
    );

    return res.status(200).json({ success, message: 'Test message and PDF sent successfully!' });
  } catch (err: any) {
    console.error('[API Error] Discord test failed:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
