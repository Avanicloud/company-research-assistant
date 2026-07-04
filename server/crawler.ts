import * as cheerio from 'cheerio';

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
}

/**
 * Normalizes a URL, making sure it starts with https:// or http://
 */
export function normalizeUrl(url: string): string {
  let cleanUrl = url.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }
  try {
    const parsed = new URL(cleanUrl);
    return parsed.href;
  } catch {
    return cleanUrl;
  }
}

/**
 * Clean up HTML text content by stripping scripts, styles, headers, footers, navs
 */
export function extractCleanText(html: string): { title: string; text: string } {
  const $ = cheerio.load(html);

  // Strip noise
  $('script, style, noscript, iframe, svg, header, footer, nav, form, .footer, .header, .nav, .menu').remove();

  const title = $('title').text().trim() || 'Untitled Page';

  // Get visible text content
  let text = $('body').text();
  
  // Clean up whitespace, replace multiple spaces/tabs/newlines with a single space or newline
  text = text
    .replace(/[\t ]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  return { title, text };
}

/**
 * Crawls a single URL with a timeout
 */
export async function fetchWithTimeout(url: string, timeoutMs: number = 4000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Crawl the home page, discover up to 4 key internal links, and fetch them in parallel
 */
export async function crawlCompanyWebsite(targetUrl: string): Promise<CrawledPage[]> {
  const homeUrl = normalizeUrl(targetUrl);
  let homeDomain: string;
  try {
    homeDomain = new URL(homeUrl).hostname.replace(/^www\./, '');
  } catch {
    homeDomain = homeUrl;
  }

  const results: CrawledPage[] = [];

  // Step 1: Fetch and parse homepage
  let homeHtml = '';
  try {
    homeHtml = await fetchWithTimeout(homeUrl, 5000);
  } catch (err: any) {
    console.error(`Failed to fetch homepage: ${homeUrl}. Error:`, err.message);
    throw new Error(`Failed to crawl company homepage at ${homeUrl}. Verify the website is accessible.`);
  }

  const { title: homeTitle, text: homeText } = extractCleanText(homeHtml);
  results.push({
    url: homeUrl,
    title: homeTitle,
    text: homeText.substring(0, 4000), // Cap size to avoid excessive tokens
  });

  // Step 2: Discover internal links from homepage HTML
  const $ = cheerio.load(homeHtml);
  const rawLinks: string[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      rawLinks.push(href.trim());
    }
  });

  // Normalize links and find candidate internal pages
  const resolvedInternalLinks = new Set<string>();
  const linkTextMap = new Map<string, string>(); // store the link text to check keywords

  for (const href of rawLinks) {
    try {
      // Build absolute URL
      const resolved = new URL(href, homeUrl).href;
      const parsedResolved = new URL(resolved);
      const resolvedDomain = parsedResolved.hostname.replace(/^www\./, '');

      // Check if same domain and not homepage itself
      if (resolvedDomain === homeDomain && resolved !== homeUrl && resolved !== (homeUrl + '/')) {
        // Exclude fragment, query, or login/signup/register/dashboard paths
        const lowercaseHref = resolved.toLowerCase();
        const path = parsedResolved.pathname;
        const lowercasePath = path.toLowerCase();

        // Filters
        const isExcluded = [
          'login', 'signin', 'sign-in', 'signup', 'sign-up', 'register', 'dashboard', 'portal', 'account',
          'cart', 'checkout', 'admin', 'logout', 'privacy-policy', 'terms-of-service', 'cookie', 'legal',
          'wp-admin', 'assets', 'images', 'uploads', 'pdf'
        ].some(kw => lowercasePath.includes(kw));

        if (!isExcluded && !parsedResolved.hash) {
          resolvedInternalLinks.add(resolved);
          
          // Capture the text of this link if it exists
          const linkText = $(`a[href="${href}"]`).first().text().trim().toLowerCase();
          if (linkText) {
            linkTextMap.set(resolved, linkText);
          }
        }
      }
    } catch {
      // Ignore invalid URLs
    }
  }

  // Step 3: Categorize links and select up to 4 key links
  const categories = {
    about: [] as string[],
    products: [] as string[],
    solutions: [] as string[],
    contact: [] as string[],
    pricing: [] as string[]
  };

  for (const url of resolvedInternalLinks) {
    const lowercaseUrl = url.toLowerCase();
    const linkText = linkTextMap.get(url) || '';
    
    // Check keywords for categorization
    if (lowercaseUrl.includes('about') || lowercaseUrl.includes('team') || lowercaseUrl.includes('company') || lowercaseUrl.includes('story') || linkText.includes('about') || linkText.includes('who we are') || linkText.includes('our story')) {
      categories.about.push(url);
    } else if (lowercaseUrl.includes('pricing') || lowercaseUrl.includes('plans') || lowercaseUrl.includes('sub') || linkText.includes('pricing') || linkText.includes('plans')) {
      categories.pricing.push(url);
    } else if (lowercaseUrl.includes('contact') || lowercaseUrl.includes('support') || lowercaseUrl.includes('touch') || linkText.includes('contact') || linkText.includes('support') || linkText.includes('get in touch') || linkText.includes('email us')) {
      categories.contact.push(url);
    } else if (lowercaseUrl.includes('product') || lowercaseUrl.includes('feature') || linkText.includes('product') || linkText.includes('feature')) {
      categories.products.push(url);
    } else if (lowercaseUrl.includes('solution') || lowercaseUrl.includes('service') || linkText.includes('solution') || linkText.includes('service')) {
      categories.solutions.push(url);
    }
  }

  // Select up to 4 distinct key pages
  const selectedUrls: string[] = [];
  
  // Pick one from each category prioritised
  const orderOfPriority = [categories.about, categories.products, categories.solutions, categories.contact, categories.pricing];
  
  // Flatten while distributing evenly
  let addedCount = 0;
  let maxRounds = 3;
  for (let r = 0; r < maxRounds && addedCount < 4; r++) {
    for (const catList of orderOfPriority) {
      if (catList.length > r && addedCount < 4) {
        const candidate = catList[r];
        if (!selectedUrls.includes(candidate)) {
          selectedUrls.push(candidate);
          addedCount++;
        }
      }
    }
  }

  // Fallback: if we still have fewer than 4, fill with any other internal links
  if (selectedUrls.length < 4) {
    for (const url of resolvedInternalLinks) {
      if (!selectedUrls.includes(url) && selectedUrls.length < 4) {
        selectedUrls.push(url);
      }
    }
  }

  console.log(`Discovered ${resolvedInternalLinks.size} internal URLs. Selected ${selectedUrls.length} key URLs to crawl:`, selectedUrls);

  // Step 4: Crawl the selected pages in parallel
  const crawlPromises = selectedUrls.map(async (url) => {
    try {
      const html = await fetchWithTimeout(url, 4000);
      const { title, text } = extractCleanText(html);
      return {
        url,
        title,
        text: text.substring(0, 3000), // Cap size to fit token window gracefully
      };
    } catch (err: any) {
      console.warn(`Skipping crawled page ${url} due to fetch failure:`, err.message);
      return null;
    }
  });

  const crawledPages = await Promise.all(crawlPromises);

  // Filter out any failed requests
  for (const page of crawledPages) {
    if (page) {
      results.push(page);
    }
  }

  return results;
}
