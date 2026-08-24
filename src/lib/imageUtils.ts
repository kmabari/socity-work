export async function compressImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * OKLAB to sRGB converter
 */
export function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  let rL = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let gL = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bL = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const f = (x: number) => {
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055;
  };

  const r = Math.max(0, Math.min(255, Math.round(f(rL) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(f(gL) * 255)));
  const b_val = Math.max(0, Math.min(255, Math.round(f(bL) * 255)));

  return [r, g, b_val];
}

/**
 * OKLCH to sRGB converter
 */
export function oklchToRgb(l: number, c: number, hDeg: number): [number, number, number] {
  const hRad = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  return oklabToRgb(l, a, b);
}

/**
 * CIELAB to sRGB converter
 */
export function labToRgb(l: number, a: number, b: number): [number, number, number] {
  const y = (l + 16) / 116;
  const x = a / 500 + y;
  const z = y - b / 200;

  const x3 = x * x * x;
  const z3 = z * z * z;
  const y3 = y * y * y;

  const X = (x3 > 0.008856 ? x3 : (x - 16 / 116) / 7.787) * 0.95047;
  const Y = (y3 > 0.008856 ? y3 : (y - 16 / 116) / 7.787) * 1.00000;
  const Z = (z3 > 0.008856 ? z3 : (z - 16 / 116) / 7.787) * 1.08883;

  let r = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
  let g = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
  let b_val = X * 0.0557 + Y * -0.2040 + Z * 1.0570;

  const f = (val: number) => {
    return val <= 0.0031308 ? 12.92 * val : 1.055 * Math.pow(Math.max(0, val), 1 / 2.4) - 0.055;
  };

  return [
    Math.max(0, Math.min(255, Math.round(f(r) * 255))),
    Math.max(0, Math.min(255, Math.round(f(g) * 255))),
    Math.max(0, Math.min(255, Math.round(f(b_val) * 255)))
  ];
}

/**
 * CIELCH to sRGB converter
 */
export function lchToRgb(l: number, c: number, hDeg: number): [number, number, number] {
  const hRad = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  return labToRgb(l, a, b);
}

/**
 * Replace all oklab(...) with rgb/rgba
 */
export function replaceOklabWithRgb(cssText: string): string {
  return cssText.replace(/oklab\(([^)]+)\)/gi, (match, p1) => {
    try {
      const parts = p1.trim().split(/[\s/]+/).filter(Boolean);
      if (parts.length < 3) return match;

      const lVal = parts[0];
      const L = lVal.endsWith('%') ? parseFloat(lVal) / 100 : parseFloat(lVal);

      const aVal = parts[1];
      const a = aVal.endsWith('%') ? (parseFloat(aVal) * 0.4) / 100 : parseFloat(aVal);

      const bVal = parts[2];
      const b = bVal.endsWith('%') ? (parseFloat(bVal) * 0.4) / 100 : parseFloat(bVal);

      let alpha: number | null = null;
      if (parts.length >= 4) {
        const alphaVal = parts[3];
        alpha = alphaVal.endsWith('%') ? parseFloat(alphaVal) / 100 : parseFloat(alphaVal);
      }

      const [r, g, b_val] = oklabToRgb(L, a, b);
      if (alpha !== null && !isNaN(alpha)) {
        return `rgba(${r}, ${g}, ${b_val}, ${alpha})`;
      } else {
        return `rgb(${r}, ${g}, ${b_val})`;
      }
    } catch {
      return 'rgb(0, 0, 0)';
    }
  });
}

/**
 * Replace all oklch(...) with rgb/rgba
 */
export function replaceOklchWithRgb(cssText: string): string {
  return cssText.replace(/oklch\(([^)]+)\)/gi, (match, p1) => {
    try {
      const parts = p1.trim().split(/[\s/]+/).filter(Boolean);
      if (parts.length < 3) return match;

      const lVal = parts[0];
      const l = lVal.endsWith('%') ? parseFloat(lVal) / 100 : parseFloat(lVal);

      const cVal = parts[1];
      const c = cVal.endsWith('%') ? parseFloat(cVal) / 100 : parseFloat(cVal);

      const hVal = parts[2];
      let h = parseFloat(hVal);
      if (hVal.endsWith('deg')) {
        h = parseFloat(hVal);
      } else if (hVal.endsWith('rad')) {
        h = (parseFloat(hVal) * 180) / Math.PI;
      }

      let alpha: number | null = null;
      if (parts.length >= 4) {
        const aVal = parts[3];
        alpha = aVal.endsWith('%') ? parseFloat(aVal) / 100 : parseFloat(aVal);
      }

      const [r, g, b] = oklchToRgb(l, c, h);

      if (alpha !== null && !isNaN(alpha)) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else {
        return `rgb(${r}, ${g}, ${b})`;
      }
    } catch {
      return 'rgb(0, 0, 0)';
    }
  });
}

/**
 * Replaces modern color functions (oklab, oklch, lab, lch) with standard rgb/rgba
 */
export function sanitizeCssColors(cssText: string): string {
  if (!cssText) return '';
  let result = cssText;
  if (result.includes('oklab')) {
    result = replaceOklabWithRgb(result);
  }
  if (result.includes('oklch')) {
    result = replaceOklchWithRgb(result);
  }
  if (result.includes('lch(')) {
    result = result.replace(/lch\(([^)]+)\)/gi, (match, p1) => {
      try {
        const parts = p1.trim().split(/[\s/]+/).filter(Boolean);
        if (parts.length < 3) return match;
        const l = parseFloat(parts[0]);
        const c = parseFloat(parts[1]);
        let h = parseFloat(parts[2]);
        if (parts[2].endsWith('rad')) h = (h * 180) / Math.PI;
        const alpha = parts[3] ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : null;
        const [r, g, b] = lchToRgb(l, c, h);
        return alpha !== null && !isNaN(alpha) ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
      } catch {
        return 'rgb(0, 0, 0)';
      }
    });
  }
  if (result.includes('lab(')) {
    result = result.replace(/lab\(([^)]+)\)/gi, (match, p1) => {
      try {
        const parts = p1.trim().split(/[\s/]+/).filter(Boolean);
        if (parts.length < 3) return match;
        const l = parseFloat(parts[0]);
        const a = parseFloat(parts[1]);
        const b = parseFloat(parts[2]);
        const alpha = parts[3] ? (parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])) : null;
        const [r, g, b_val] = labToRgb(l, a, b);
        return alpha !== null && !isNaN(alpha) ? `rgba(${r}, ${g}, ${b_val}, ${alpha})` : `rgb(${r}, ${g}, ${b_val})`;
      } catch {
        return 'rgb(0, 0, 0)';
      }
    });
  }
  return result;
}

/**
 * onclone handler for html2canvas to sanitize oklab/oklch in cloned documents
 */
export function html2canvasOklchOnClone(clonedDoc: Document): void {
  // 1. Sanitize all <style> tags
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach(style => {
    try {
      const content = style.textContent || style.innerHTML;
      if (content && (content.includes('oklab') || content.includes('oklch') || content.includes('lab(') || content.includes('lch('))) {
        const sanitized = sanitizeCssColors(content);
        style.textContent = sanitized;
      }
    } catch (err) {
      console.warn("Failed to sanitize style tag:", err);
    }
  });

  // 2. Sanitize all inline styles on all elements
  const allElements = clonedDoc.querySelectorAll('*');
  allElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style && htmlEl.style.cssText) {
      const css = htmlEl.style.cssText;
      if (css.includes('oklab') || css.includes('oklch') || css.includes('lab(') || css.includes('lch(')) {
        try {
          htmlEl.style.cssText = sanitizeCssColors(css);
        } catch (err) {
          console.warn("Failed to sanitize inline style:", err);
        }
      }
    }

    // Also check SVG attributes (fill, stroke, stop-color)
    const fillAttr = el.getAttribute('fill');
    if (fillAttr && (fillAttr.includes('oklab') || fillAttr.includes('oklch'))) {
      el.setAttribute('fill', sanitizeCssColors(fillAttr));
    }
    const strokeAttr = el.getAttribute('stroke');
    if (strokeAttr && (strokeAttr.includes('oklab') || strokeAttr.includes('oklch'))) {
      el.setAttribute('stroke', sanitizeCssColors(strokeAttr));
    }
    const stopColor = el.getAttribute('stop-color');
    if (stopColor && (stopColor.includes('oklab') || stopColor.includes('oklch'))) {
      el.setAttribute('stop-color', sanitizeCssColors(stopColor));
    }
  });
}

/**
 * Convert any image URL (remote or local) to a Base64 data URL
 * to avoid canvas CORS / tainting issues during export
 */
export async function imageUrlToDataUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || url);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    // Ignore and attempt canvas fallback
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 100;
        canvas.height = img.naturalHeight || img.height || 100;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch {
        // Ignored
      }
      resolve(url);
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

/**
 * Safely trigger file download from blob or base64 data URL
 */
export function triggerFileDownload(dataUrlOrBlob: string | Blob, filename: string): boolean {
  try {
    const link = document.createElement('a');
    link.download = filename;
    if (typeof dataUrlOrBlob === 'string') {
      link.href = dataUrlOrBlob;
    } else {
      link.href = URL.createObjectURL(dataUrlOrBlob);
    }
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      if (typeof dataUrlOrBlob !== 'string') {
        URL.revokeObjectURL(link.href);
      }
    }, 200);
    return true;
  } catch (err) {
    console.error("triggerFileDownload failed:", err);
    return false;
  }
}

