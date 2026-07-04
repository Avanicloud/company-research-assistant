import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateCompanyReportPdf } from '../server/pdf.js';
import type { CompanyResearchResult } from '../src/types.js';

export const config = {
  maxDuration: 30,
  memory: 1024,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed. Use POST.');
  }

  const { result } = req.body as { result: CompanyResearchResult };

  if (!result || !result.companyName) {
    return res.status(400).send('Invalid research result payload.');
  }

  try {
    console.log(`[API] Generating PDF for download: ${result.companyName}`);
    const pdfBuffer = await generateCompanyReportPdf(result);

    const fileName = `${result.companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_research_report.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.status(200).send(pdfBuffer);
  } catch (err: any) {
    console.error('[API Error] PDF generation failed:', err.message);
    return res.status(500).send(`Failed to generate PDF: ${err.message}`);
  }
}
