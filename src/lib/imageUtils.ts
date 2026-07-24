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

export function oklchToRgb(l: number, c: number, hDeg: number): [number, number, number] {
  const hRad = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  let rL = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let gL = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bL = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const f = (x: number) => {
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };

  const r = Math.max(0, Math.min(255, Math.round(f(rL) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(f(gL) * 255)));
  const b_val = Math.max(0, Math.min(255, Math.round(f(bL) * 255)));

  return [r, g, b_val];
}

export function replaceOklchWithRgb(cssText: string): string {
  return cssText.replace(/oklch\(([^)]+)\)/g, (match, p1) => {
    try {
      const parts = p1.trim().split(/[\s/]+/).filter(Boolean);
      if (parts.length < 3) return match;

      let lVal = parts[0];
      let l = lVal.endsWith('%') ? parseFloat(lVal) / 100 : parseFloat(lVal);

      let cVal = parts[1];
      let c = cVal.endsWith('%') ? parseFloat(cVal) / 100 : parseFloat(cVal);

      let hVal = parts[2];
      let h = parseFloat(hVal);
      if (hVal.endsWith('deg')) {
        h = parseFloat(hVal);
      } else if (hVal.endsWith('rad')) {
        h = (parseFloat(hVal) * 180) / Math.PI;
      }

      let alpha: number | null = null;
      if (parts.length >= 4) {
        let aVal = parts[3];
        alpha = aVal.endsWith('%') ? parseFloat(aVal) / 100 : parseFloat(aVal);
      }

      const [r, g, b] = oklchToRgb(l, c, h);

      if (alpha !== null) {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else {
        return `rgb(${r}, ${g}, ${b})`;
      }
    } catch (e) {
      console.warn("Failed to parse oklch color:", match, e);
      return 'rgb(0, 0, 0)';
    }
  });
}

export function html2canvasOklchOnClone(clonedDoc: Document): void {
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach(style => {
    try {
      if (style.innerHTML && style.innerHTML.includes('oklch')) {
        style.innerHTML = replaceOklchWithRgb(style.innerHTML);
      }
    } catch (err) {
      console.warn("Failed to sanitize style tag:", err);
    }
  });

  const allElements = clonedDoc.querySelectorAll('*');
  allElements.forEach(el => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style) {
      for (let i = 0; i < htmlEl.style.length; i++) {
        const propName = htmlEl.style[i];
        const propValue = htmlEl.style.getPropertyValue(propName);
        if (propValue && propValue.includes('oklch')) {
          try {
            const replaced = replaceOklchWithRgb(propValue);
            htmlEl.style.setProperty(propName, replaced);
          } catch (err) {
            console.warn("Failed to sanitize inline style prop:", propName, err);
          }
        }
      }
    }
  });
}
