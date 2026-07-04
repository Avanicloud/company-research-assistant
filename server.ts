import 'dotenv/config';
import express from 'express';
import path from 'path';
import { performCompanyResearch } from './server/research.js';
import { generateCompanyReportPdf } from './server/pdf.js';
import { sendReportToDiscord } from './server/discord.js';
import type { CompanyResearchResult, ResearchRequest, DiscordConfig } from './src/types.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON parsing with larger limit to support context payloads
  app.use(express.json({ limit: '10mb' }));

  // --- API ENDPOINTS ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Check if API Keys are configured on the server
  app.get('/api/config-status', (req, res) => {
    res.json({
      hasSerperKey: !!(process.env.SERPER_API_KEY || '').trim(),
      hasOpenRouterKey: !!(process.env.OPENROUTER_API_KEY || '').trim(),
    });
  });

  // Execute full company research workflow
  app.post('/api/research', async (req, res) => {
    const { input, apiConfig, discordConfig } = req.body as ResearchRequest;

    if (!input || !input.trim()) {
      res.status(400).json({ success: false, error: 'Input company name or website URL is required.' });
      return;
    }

    try {
      console.log(`[API] Received research request for: "${input}"`);
      
      const { result, pdfBuffer, discordSuccess } = await performCompanyResearch(
        input,
        apiConfig,
        discordConfig
      );

      res.json({
        success: true,
        result,
        discordSuccess,
      });
    } catch (err: any) {
      console.error(`[API Error] Research failed:`, err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Stateless dynamic PDF generation endpoint
  app.post('/api/download-pdf', async (req, res) => {
    const { result } = req.body as { result: CompanyResearchResult };

    if (!result || !result.companyName) {
      res.status(400).send('Invalid research result payload.');
      return;
    }

    try {
      console.log(`[API] Generating PDF for download: ${result.companyName}`);
      const pdfBuffer = await generateCompanyReportPdf(result);
      
      const fileName = `${result.companyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_research_report.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(pdfBuffer);
    } catch (err: any) {
      console.error('[API Error] PDF generation failed:', err.message);
      res.status(500).send(`Failed to generate PDF: ${err.message}`);
    }
  });

  // Dynamic test connection endpoint for Discord
  app.post('/api/discord-test', async (req, res) => {
    const { discordConfig, result } = req.body as {
      discordConfig: DiscordConfig;
      result?: CompanyResearchResult;
    };

    if (!discordConfig || !discordConfig.botToken || !discordConfig.channelId) {
      res.status(400).json({ success: false, error: 'Bot Token and Channel ID are required.' });
      return;
    }

    try {
      console.log(`[API] Triggering Discord test to channel: ${discordConfig.channelId}`);
      
      // Use standard research result, or compile a quick dummy one
      const targetResult = result || {
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

      res.json({ success, message: 'Test message and PDF sent successfully!' });
    } catch (err: any) {
      console.error('[API Error] Discord test failed:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- STATIC ASSETS & VITE MIDDLEWARE ---

  if (process.env.NODE_ENV !== 'production') {
    // In development, serve Vite client files as middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Dev Server] Vite middleware loaded.');
  } else {
    // In production, serve bundled static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Prod Server] Static production files loaded.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`  🚀 SERVER STARTED ON PORT ${PORT}`);
    console.log(`  👉 http://localhost:${PORT}`);
    console.log(`  👉 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot failure:', err);
});
