const { Client, CloudflareFetcher } = require('../dist');

const c = new Client({ timeout: 30 });
const fetcher = new CloudflareFetcher();

async function main() {
  // 1. Get current extracted attributes
  const video = await c.getVideo('https://missav.ws/en/fc2-ppv-4560891');
  const attrs = await video.getAllAttributes();
  console.log('=== CURRENTLY EXTRACTED ATTRIBUTES ===');
  console.log(JSON.stringify(attrs, null, 2));

  // 2. Get raw HTML for detailed analysis
  const html = await fetcher.fetch('https://missav.ws/en/fc2-ppv-4560891');
  require('fs').writeFileSync('/tmp/missav_page.html', html);
  console.log('\n\nSaved HTML (' + html.length + ' bytes) to /tmp/missav_page.html');

  // 3. Search for additional data patterns
  console.log('\n\n=== SEARCHING FOR MISSING DATA ===\n');

  const searches = [
    // Views
    { label: 'VIEWS', regex: /view|views|played|play count|watched|\d{3,}\s*(?:views|plays)/gi },
    // Likes  
    { label: 'LIKES', regex: /like|favorite|heart|bookmark|favourite/gi },
    // Comments
    { label: 'COMMENTS', regex: /comment|reply|discuss/gi },
    // Description
    { label: 'DESCRIPTION', regex: /description|synopsis|overview|about this|details|story|plot|summary/gi },
    // Rating
    { label: 'RATING', regex: /rating|score|grade|star|vote/gi },
    // Resolution
    { label: 'RESOLUTION', regex: /1080p|720p|480p|2160p|4K|HD|FHD|quality|resolution/gi },
    // Price
    { label: 'PRICE', regex: /price|cost|points|credit|purchase|buy|rent|coin|paid|free/gi },
    // Sample/images
    { label: 'SAMPLES', regex: /sample|screenshot|preview|gallery|still|scene|image|photo/gi },
    // Director
    { label: 'DIRECTOR', regex: /director|directed by/gi },
    // Studio/network
    { label: 'STUDIO', regex: /studio|network|channel|production|company|label|publisher/gi },
    // Actor
    { label: 'ACTOR', regex: /actor|actress|cast|starring|performer|model|featuring|with/gi },
    // Maker links
    { label: 'MAKER_LINKS', regex: /\/en\/makers\//gi },
    // Search all hrefs for patterns
    { label: 'ALL_LINKS', regex: /href="([^"]+)"/gi },
  ];

  for (const { label, regex } of searches) {
    const matches = [...html.matchAll(regex)];
    // Show first 10 matches with context (100 chars around)
    if (matches.length > 0) {
      console.log(`--- ${label}: ${matches.length} matches ---`);
      matches.slice(0, 5).forEach((m, i) => {
        const idx = m.index;
        const ctx = html.substring(Math.max(0, idx - 40), Math.min(html.length, idx + 80));
        console.log(`  [${i}] ...${ctx.replace(/\n/g, '\\n')}...`);
      });
    }
  }

  // 4. Look for structured JSON data
  console.log('\n\n=== STRUCTURED DATA (JSON blocks) ===');
  const jsonBlocks = [...html.matchAll(/<script[^>]*>([\s\S]{50,5000}?)<\/script>/g)];
  for (const [full, content] of jsonBlocks) {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('window.__') || trimmed.includes('"m3u8') || trimmed.includes('"url') || trimmed.includes('"video')) {
      console.log('\nScript block (' + trimmed.length + ' chars, starts with: ' + trimmed.substring(0, 80) + '):');
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed.substring(0, trimmed.indexOf('</script>')));
          console.log('  Parsed:', JSON.stringify(parsed, null, 2).substring(0, 1000));
        } catch {}
      }
      console.log('  Content:', trimmed.substring(0, 500));
    }
  }

  await fetcher.close();
}

main().catch(console.error);
