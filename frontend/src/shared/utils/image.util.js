/**
 * Utility for converting and compressing images into Base64 Data URLs
 */

/**
 * Reads a File and converts/compresses it to a Base64 data URL
 * @param {File} file 
 * @param {number} maxWidth Default 800
 * @param {number} maxHeight Default 800
 * @param {number} quality Default 0.85
 * @returns {Promise<string>} Base64 data URL string
 */
export function fileToBase64(file, maxWidth = 800, maxHeight = 800, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const rawBase64 = reader.result;

      // If not a standard raster image or FileReader returned non-string
      if (typeof rawBase64 !== 'string') {
        return resolve(rawBase64);
      }

      // If SVG or GIF, preserve directly to keep vector sharpness or animation
      const isSvg = file.type === 'image/svg+xml' || (file.name && file.name.toLowerCase().endsWith('.svg'));
      const isGif = file.type === 'image/gif' || (file.name && file.name.toLowerCase().endsWith('.gif'));
      if (isSvg || isGif) {
        return resolve(rawBase64);
      }

      const img = new Image();
      let finished = false;

      // Safety timeout: never hang forever
      const timeoutId = setTimeout(() => {
        if (!finished) {
          finished = true;
          resolve(rawBase64);
        }
      }, 4000);

      img.onerror = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timeoutId);
          resolve(rawBase64);
        }
      };

      img.onload = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext('2d');

          const isPng = file.type === 'image/png' || (file.name && file.name.toLowerCase().endsWith('.png'));

          if (!isPng) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const outputType = isPng ? 'image/png' : 'image/jpeg';
          const compressedBase64 = canvas.toDataURL(outputType, quality);
          resolve(compressedBase64 || rawBase64);
        } catch {
          // If any canvas error occurs (e.g. security/taint), fallback to raw base64
          resolve(rawBase64);
        }
      };

      img.src = rawBase64;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Converts an external image URL to a Base64 data URL with graceful fallback
 * @param {string} url 
 * @param {number} maxWidth 
 * @param {number} maxHeight 
 * @param {number} quality 
 * @returns {Promise<string>} Base64 data URL string or original URL
 */
export function urlToBase64(url, maxWidth = 800, maxHeight = 800, quality = 0.85) {
  if (!url || typeof url !== 'string') return Promise.resolve('');
  const trimmed = url.trim();

  // If already a Base64 data URL, return immediately without re-compressing
  if (trimmed.startsWith('data:image/')) {
    return Promise.resolve(trimmed);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.referrerPolicy = 'no-referrer';

    let finished = false;
    const timeoutId = setTimeout(() => {
      if (!finished) {
        finished = true;
        resolve(trimmed);
      }
    }, 3000);

    img.onload = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutId);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64 || trimmed);
      } catch {
        resolve(trimmed);
      }
    };

    img.onerror = () => {
      if (!finished) {
        finished = true;
        clearTimeout(timeoutId);
        resolve(trimmed);
      }
    };

    img.src = trimmed;
  });
}

export default {
  fileToBase64,
  urlToBase64,
};
