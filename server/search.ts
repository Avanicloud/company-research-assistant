/**
 * Perform a query on Serper.dev
 */
export async function searchSerper(query: string, apiKey: string): Promise<any> {
  if (!apiKey) {
    throw new Error('Serper.dev API Key is missing. Please configure it in the sidebar.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 6 }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Serper API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Serper search timed out for query: "${query}"`);
    }
    throw error;
  }
}

/**
 * Extract the domain name from a URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Resolve a company name to its official website URL using Serper.dev
 */
export async function resolveOfficialWebsite(companyName: string, apiKey: string): Promise<string> {
  // Let's search for the official website
  const data = await searchSerper(`${companyName} official website`, apiKey);
  const organic = data?.organic || [];

  if (organic.length === 0) {
    throw new Error(`Could not find any search results for company: "${companyName}"`);
  }

  // Find the first valid result. Let's filter out common noise like LinkedIn, Wikipedia, Crunchbase, Twitter
  const excludedKeywords = [
    'wikipedia.org',
    'linkedin.com',
    'crunchbase.com',
    'twitter.com',
    'facebook.com',
    'instagram.com',
    'glassdoor.com',
    'youtube.com',
  ];

  for (const item of organic) {
    const link = item.link;
    if (link && !excludedKeywords.some((kw) => link.toLowerCase().includes(kw))) {
      return link;
    }
  }

  // Fallback to the very first link if all are excluded
  return organic[0].link;
}
