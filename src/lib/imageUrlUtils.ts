/**
 * Normalizes any external image URL (including Google Drive, Dropbox, PostImages, Imgur, etc.)
 * so that it can be displayed directly inside standard <img> elements without CORS or redirect blocks.
 */
export function normalizeImageUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();

  // 1. Remove wrapping quotes or brackets if pasted accidentally
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }

  // 2. Google Drive links:
  // Format A: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  // Format B: https://drive.google.com/open?id=FILE_ID
  // Format C: https://drive.google.com/uc?id=FILE_ID
  // Format D: https://drive.google.com/uc?export=view&id=FILE_ID
  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      // Use Google Drive direct image content delivery link
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
    }
  }

  // 3. Dropbox links:
  // https://www.dropbox.com/s/.../image.jpg?dl=0 -> raw=1
  if (url.includes('dropbox.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('raw', '1');
      parsed.searchParams.delete('dl');
      return parsed.toString();
    } catch {
      return url.replace('dl=0', 'raw=1');
    }
  }

  // 4. PostImages viewer links:
  // https://postimg.cc/XXXXX -> direct image URL is often i.postimg.cc/XXXXX/image.jpg
  // If user pasted page URL instead of direct image URL
  if (url.includes('postimg.cc/') && !url.includes('i.postimg.cc')) {
    // Leave intact or assist
  }

  // 5. Imgur page links:
  // https://imgur.com/abcde -> https://i.imgur.com/abcde.jpg
  if (url.includes('imgur.com/') && !url.includes('i.imgur.com') && !url.includes('/a/')) {
    const match = url.match(/imgur\.com\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return `https://i.imgur.com/${match[1]}.jpg`;
    }
  }

  return url;
}

/**
 * Validates whether an image URL is syntactically sound and non-empty.
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.trim();
  if (clean.startsWith('data:image/')) return true;
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) return false;
  return clean.length > 8;
}
