import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { isGenericRoleMailbox, scrubPii } from './scrub';

export interface ExtractedPage {
  title: string;
  publishedDate: string | null;
  officialContactUrl: string | null;
  genericContactEmail: string | null;
  relevanceExcerpt: string;
  hasNoIndex: boolean;
}

export function extractPage(
  html: string,
  targetUrl: string,
  keywords: string[] = []
): ExtractedPage {
  const $ = cheerio.load(html);

  // 1. Check for noindex meta tags
  const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase() || '';
  const googlebotMeta = $('meta[name="googlebot"]').attr('content')?.toLowerCase() || '';
  const hasNoIndex = robotsMeta.includes('noindex') || googlebotMeta.includes('noindex');

  // 2. Extract Title
  let title = $('title').text().trim();
  if (!title) {
    title = $('meta[property="og:title"]').attr('content')?.trim() || '';
  }
  if (!title) {
    title = $('h1').first().text().trim() || 'Untitled Opportunity';
  }

  // 3. Extract Published Date
  let publishedDate: string | null = null;
  const timeTag = $('time').attr('datetime') || $('time').text().trim();
  if (timeTag) {
    const parsed = new Date(timeTag);
    if (!isNaN(parsed.getTime())) {
      publishedDate = parsed.toISOString().split('T')[0];
    }
  }

  if (!publishedDate) {
    const metaDate =
      $('meta[property="article:published_time"]').attr('content') ||
      $('meta[name="date"]').attr('content') ||
      $('meta[name="pubdate"]').attr('content');
    if (metaDate) {
      const parsed = new Date(metaDate);
      if (!isNaN(parsed.getTime())) {
        publishedDate = parsed.toISOString().split('T')[0];
      }
    }
  }

  // 4. Discover Contact Route (Same-domain contact pages & generic mailboxes)
  let officialContactUrl: string | null = null;
  let genericContactEmail: string | null = null;

  try {
    const origin = new URL(targetUrl).origin;
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')?.trim();
      if (!href) return;

      try {
        const fullUrl = new URL(href, targetUrl);
        const lowerPath = fullUrl.pathname.toLowerCase();
        if (
          fullUrl.origin === origin &&
          (lowerPath.includes('/contact') ||
            lowerPath.includes('/enquir') ||
            lowerPath.includes('/get-in-touch'))
        ) {
          if (!officialContactUrl) {
            officialContactUrl = fullUrl.toString();
          }
        }
      } catch {
        // Ignore malformed hrefs
      }
    });
  } catch {
    // Malformed targetUrl
  }

  // Find generic email mailboxes in text or mailto: links
  const mailtoLinks = $('a[href^="mailto:"]');
  mailtoLinks.each((_, el) => {
    const href = $(el).attr('href') || '';
    const email = href.replace(/^mailto:/i, '').split('?')[0].trim();
    if (isGenericRoleMailbox(email) && !genericContactEmail) {
      genericContactEmail = email.toLowerCase();
    }
  });

  // 5. Extract Main Article/Body Text with Readability
  let mainText = '';
  try {
    const dom = new JSDOM(html, { url: targetUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (article && article.textContent) {
      mainText = article.textContent.replace(/\s+/g, ' ').trim();
    }
  } catch {
    // Fallback to cheerio body extraction
  }

  if (!mainText) {
    $('script, style, nav, footer, header').remove();
    mainText = $('body').text().replace(/\s+/g, ' ').trim();
  }

  // 6. Build Relevance Window (Section 6.5: ±600 chars around include-keyword hits, capped at 3,000 chars)
  let relevanceExcerpt = '';
  const lowerMain = mainText.toLowerCase();
  const windows: Array<{ start: number; end: number }> = [];

  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    let pos = 0;
    while ((pos = lowerMain.indexOf(kwLower, pos)) !== -1) {
      const start = Math.max(0, pos - 600);
      const end = Math.min(mainText.length, pos + kw.length + 600);
      windows.push({ start, end });
      pos += kw.length;
      if (windows.length >= 6) break; // Limit matching spans
    }
  }

  if (windows.length > 0) {
    // Merge overlapping windows
    windows.sort((a, b) => a.start - b.start);
    const merged: Array<{ start: number; end: number }> = [windows[0]];
    for (let i = 1; i < windows.length; i++) {
      const last = merged[merged.length - 1];
      const cur = windows[i];
      if (cur.start <= last.end) {
        last.end = Math.max(last.end, cur.end);
      } else {
        merged.push(cur);
      }
    }

    let combined = '';
    for (const w of merged) {
      combined += (combined ? ' ... ' : '') + mainText.slice(w.start, w.end).trim();
      if (combined.length >= 3000) break;
    }
    relevanceExcerpt = combined.slice(0, 3000);
  } else {
    // No keyword hit: take the first 3,000 characters
    relevanceExcerpt = mainText.slice(0, 3000);
  }

  // 7. Scrub PII from excerpt
  relevanceExcerpt = scrubPii(relevanceExcerpt);

  return {
    title: title.slice(0, 180),
    publishedDate,
    officialContactUrl,
    genericContactEmail,
    relevanceExcerpt,
    hasNoIndex,
  };
}
