import { CompanyResearchResult, ApiConfig, DiscordConfig, Competitor } from '../src/types';
import { resolveOfficialWebsite, searchSerper } from './search';
import { crawlCompanyWebsite, normalizeUrl } from './crawler';
import { generateCompanyReportPdf } from './pdf';
import { sendReportToDiscord } from './discord';

/**
 * Intelligent detector: check if input is a website URL or a company name
 */
export function isUrl(input: string): boolean {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return true;
  }
  // Check if it looks like a domain (no spaces, has a dot, ends with a common TLD pattern)
  if (!/\s/.test(trimmed) && trimmed.includes('.')) {
    // Basic domain validation
    const parts = trimmed.split('.');
    const lastPart = parts[parts.length - 1];
    return lastPart.length >= 2 && /^[a-z]+$/i.test(lastPart);
  }
  return false;
}

/**
 * Perform OpenRouter LLM Call
 */
async function callOpenRouter(prompt: string, apiKey: string, model: string): Promise<string> {
  const modelId = model || 'google/gemini-2.5-flash';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://relu-ai-dev-hiring.vercel.app', // Site name for OpenRouter rankings
        'X-Title': 'Company Research Assistant',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'system',
            content: 'You are an elite Business Intelligence & Strategy Analyst. Your job is to analyze gathered company website text and search engine results, then output a highly accurate corporate research profile in strict JSON format. You never invent information. If phone or address details are not found in the context, explicitly return "Not publicly listed" instead of fabricating them.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenRouter returned an empty completion response.');
    }

    return content;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('AI analysis timed out. The OpenRouter model took too long to respond.');
    }
    throw err;
  }
}

/**
 * Clean LLM response to ensure we have a parseable JSON string
 */
function parseCleanJson(rawResponse: string): any {
  let cleanStr = rawResponse.trim();
  
  // Remove markdown wrapper if any
  if (cleanStr.startsWith('```')) {
    const lines = cleanStr.split('\n');
    if (lines[0].toLowerCase().includes('json')) {
      lines.shift(); // Remove the ```json line
    } else {
      lines.shift(); // Remove the plain ``` line
    }
    if (lines[lines.length - 1].startsWith('```')) {
      lines.pop(); // Remove the closing ``` line
    }
    cleanStr = lines.join('\n').trim();
  }

  try {
    return JSON.parse(cleanStr);
  } catch (err: any) {
    console.error('Failed to parse clean JSON. Raw response was:', rawResponse);
    throw new Error(`AI generated invalid JSON: ${err.message}. Please try again.`);
  }
}

/**
 * Orchestrate the complete company research workflow
 */
export async function performCompanyResearch(
  input: string,
  apiConfig: ApiConfig,
  discordConfig?: DiscordConfig,
  onProgress?: (stepId: string, message: string) => void
): Promise<{ result: CompanyResearchResult; pdfBuffer: Buffer; discordSuccess?: boolean }> {
  
  const serperKey = apiConfig.serperKey?.trim() || process.env.SERPER_API_KEY || '';
  const openrouterKey = apiConfig.openrouterKey?.trim() || process.env.OPENROUTER_API_KEY || '';

  if (!serperKey) {
    throw new Error('Serper.dev API Key is missing. Please configure it in the sidebar or set SERPER_API_KEY on the server.');
  }
  if (!openrouterKey) {
    throw new Error('OpenRouter API Key is missing. Please configure it in the sidebar or set OPENROUTER_API_KEY on the server.');
  }

  // Bind key overrides back to config for subsequent modules to use
  apiConfig.serperKey = serperKey;
  apiConfig.openrouterKey = openrouterKey;

  let websiteUrl = '';
  let companyNameForSearch = '';

  // Step 1: Resolve target domain/URL
  if (isUrl(input)) {
    websiteUrl = normalizeUrl(input);
    // Deduce a clean name from the url to start with
    try {
      const domain = new URL(websiteUrl).hostname.replace(/^www\./, '');
      companyNameForSearch = domain.split('.')[0];
      companyNameForSearch = companyNameForSearch.charAt(0).toUpperCase() + companyNameForSearch.slice(1);
    } catch {
      companyNameForSearch = input;
    }
    if (onProgress) {
      onProgress('resolve', `Target website recognized: ${websiteUrl}`);
    }
  } else {
    companyNameForSearch = input.trim();
    if (onProgress) {
      onProgress('resolve', `Searching for official website of "${companyNameForSearch}"...`);
    }
    try {
      websiteUrl = await resolveOfficialWebsite(companyNameForSearch, apiConfig.serperKey);
      if (onProgress) {
        onProgress('resolve', `Resolved website: ${websiteUrl}`);
      }
    } catch (err: any) {
      throw new Error(`Failed to resolve official website for "${companyNameForSearch}": ${err.message}`);
    }
  }

  // Double-check we have a valid website URL
  websiteUrl = normalizeUrl(websiteUrl);

  // Step 2: Perform secondary research on Serper.dev
  if (onProgress) {
    onProgress('serper', `Searching contact profiles & public search signals...`);
  }
  let searchContextText = '';
  try {
    const contactSearch = await searchSerper(`"${companyNameForSearch}" contact information phone number address location headquarters`, apiConfig.serperKey);
    const productSearch = await searchSerper(`"${companyNameForSearch}" products services overview`, apiConfig.serperKey);
    const competitorSearch = await searchSerper(`"${companyNameForSearch}" main competitors companies`, apiConfig.serperKey);

    const formatResults = (label: string, data: any) => {
      const organic = data?.organic || [];
      const snippets = organic.map((item: any) => `- ${item.title}: ${item.snippet} (${item.link})`).join('\n');
      return `### ${label} SEARCH RESULTS\n${snippets || 'No results'}\n`;
    };

    searchContextText += formatResults('CONTACT AND HEADQUARTERS', contactSearch);
    searchContextText += formatResults('PRODUCTS AND OFFERINGS', productSearch);
    searchContextText += formatResults('COMPETITORS', competitorSearch);
  } catch (err: any) {
    console.warn('Serper supplementary research failed, proceeding with crawling only:', err.message);
    searchContextText = 'Supplementary search results failed or unavailable.';
  }

  // Step 3: Crawl Website pages in parallel
  if (onProgress) {
    onProgress('crawl', `Initiating advanced multi-page crawl of ${websiteUrl}...`);
  }
  let crawledPages = [];
  try {
    crawledPages = await crawlCompanyWebsite(websiteUrl);
    if (onProgress) {
      onProgress('crawl', `Crawled ${crawledPages.length} core pages. Crawling text extracted successfully.`);
    }
  } catch (err: any) {
    console.error('Crawler failed completely, falling back to search data only:', err.message);
    if (onProgress) {
      onProgress('crawl', `Crawler failed. Retrying with search signals only.`);
    }
    // Crawl homepage only fallback, or proceed with empty crawled pages if even that fails
    crawledPages = [{
      url: websiteUrl,
      title: companyNameForSearch,
      text: `Failed to crawl contents. Falling back to Google search signals.`
    }];
  }

  // Step 4: Synthesize OpenRouter Metrics & AI Reasoning
  if (onProgress) {
    onProgress('llm', `Synthesizing context using OpenRouter model (${apiConfig.aiModel || 'Gemini 2.5 Flash'})...`);
  }

  // Prepare full prompt
  const crawledContext = crawledPages.map((page, i) => {
    return `PAGE #${i+1}\nURL: ${page.url}\nTITLE: ${page.title}\nCONTENT SNIPPET:\n${page.text}\n---\n`;
  }).join('\n');

  const openRouterPrompt = `
You are analyzing the company: "${companyNameForSearch}" (Official Website: ${websiteUrl}).
I have extracted relevant pages from their official website and queried Google Search via Serper.dev.

=== GATHERED WEBSITE CRAWLED CONTENT ===
${crawledContext}

=== SEARCH ENGINE SUPPLEMENTARY SIGNALS ===
${searchContextText}

=======================================

Based on the above rich content, synthesize a professional business intelligence report.
Your output MUST be a strict JSON object that fits the following schema exactly. Do not output any prose, markdown explanations, or codeblocks, just the plain raw JSON.

JSON Schema:
{
  "companyName": "Standardized Official Company Name",
  "website": "${websiteUrl}",
  "phone": "Direct phone number or support number if found, or 'Not publicly listed'",
  "address": "Headquarters address or main office location if found, or 'Not publicly listed'",
  "summary": "A cohesive, professional 2-3 sentence overview summarizing what the company does, who they serve, and their value proposition.",
  "products": [
    "Product or service 1",
    "Product or service 2",
    "Product or service 3",
    "Product or service 4"
  ],
  "painPoints": [
    "Core Challenge Title: Clear explanation of a pain point they face, a strategic gap, or dynamic customer problems they address.",
    "Technical Complexity: Another pain point details related to scaling, competition, adoption, or engineering constraints.",
    "Strategic Risk: A pain point regarding market dynamics, competitors, or customer experience."
  ],
  "competitors": [
    {
      "name": "Competitor Company Name 1",
      "website": "https://competitor1-website.com"
    },
    {
      "name": "Competitor Company Name 2",
      "website": "https://competitor2-website.com"
    },
    {
      "name": "Competitor Company Name 3",
      "website": "https://competitor3-website.com"
    },
    {
      "name": "Competitor Company Name 4",
      "website": "https://competitor4-website.com"
    }
  ]
}

CRITICAL RULES:
1. Ensure the website matches the target domain.
2. Provide EXACTLY 3-4 realistic "competitors" mapping their actual digital domain URLs (always make sure the competitors website URLs are standard valid domains starting with https://).
3. Do not invent competitors, list active companies operating in the same domain.
4. If contact details (phone, address) are missing in the crawled context and search signals, use "Not publicly listed" - do not hallucinate them.
5. Provide 3-5 high-quality, actionable, and specific "painPoints" (not generic ones like "lacks marketing", make them highly relevant to the company's product, target audience, technical hurdles, or industry landscape). Each pain point should start with a bold-friendly short title (e.g. "Customer Churn Risk: Description...").
`;

  let parsedResult: CompanyResearchResult;
  try {
    const rawAiResponse = await callOpenRouter(openRouterPrompt, apiConfig.openrouterKey, apiConfig.aiModel);
    const jsonResult = parseCleanJson(rawAiResponse);

    // Validate and clean JSON structure
    parsedResult = {
      companyName: jsonResult.companyName || companyNameForSearch,
      website: jsonResult.website || websiteUrl,
      phone: jsonResult.phone || 'Not publicly listed',
      address: jsonResult.address || 'Not publicly listed',
      summary: jsonResult.summary || 'Overview unavailable.',
      products: Array.isArray(jsonResult.products) ? jsonResult.products : [],
      painPoints: Array.isArray(jsonResult.painPoints) ? jsonResult.painPoints : [],
      competitors: Array.isArray(jsonResult.competitors) ? jsonResult.competitors.map((c: any) => ({
        name: c.name || 'Unnamed Competitor',
        website: c.website || '#'
      })) : [],
      crawledPages: crawledPages.map(page => ({ url: page.url, title: page.title }))
    };
  } catch (err: any) {
    throw new Error(`AI synthesis failed: ${err.message}`);
  }

  // Step 5: PDF Generation
  if (onProgress) {
    onProgress('pdf', `Generating professional downloadable PDF report...`);
  }
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateCompanyReportPdf(parsedResult);
    if (onProgress) {
      onProgress('pdf', `PDF generated successfully (size: ${Math.round(pdfBuffer.length / 1024)} KB)`);
    }
  } catch (err: any) {
    throw new Error(`PDF report generation failed: ${err.message}`);
  }

  // Step 6: Discord bot integration
  let discordSuccess = false;
  if (discordConfig && discordConfig.botToken && discordConfig.channelId) {
    if (onProgress) {
      onProgress('discord', `Posting report & applicant credentials to Discord...`);
    }
    try {
      discordSuccess = await sendReportToDiscord(
        discordConfig.botToken,
        discordConfig.channelId,
        discordConfig.applicantName,
        discordConfig.applicantEmail,
        parsedResult.companyName,
        parsedResult.website,
        pdfBuffer
      );
      if (onProgress) {
        onProgress('discord', `Auto-delivery to Discord channel successful!`);
      }
    } catch (err: any) {
      console.error('Discord auto-delivery failed:', err.message);
      if (onProgress) {
        onProgress('discord', `Discord delivery failed: ${err.message}`);
      }
      discordSuccess = false;
    }
  }

  return {
    result: parsedResult,
    pdfBuffer,
    discordSuccess
  };
}
