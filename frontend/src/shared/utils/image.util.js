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
      
      // If not a standard raster image or FileReader returned string
      if (typeof rawBase64 !== 'string') {
        return resolve(rawBase64);
      }

      const img = new Image();
      img.onerror = () => {
        // Fallback directly to raw base64 if image constructor fails
        resolve(rawBase64);
      };

      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

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

          const isPng = file.type === 'image/png';

          if (!isPng) {
            // Fill background with white to avoid black background on transparent images
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // If PNG and under 2MB, preserve PNG; otherwise convert to JPEG
          const outputType = isPng && file.size < 2 * 1024 * 1024 ? 'image/png' : 'image/jpeg';
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
 * Converts an external image URL to a Base64 data URL
 * @param {string} url 
 * @param {number} maxWidth 
 * @param {number} maxHeight 
 * @param {number} quality 
 * @returns {Promise<string>} Base64 data URL string
 */
export function urlToBase64(url, maxWidth = 800, maxHeight = 800, quality = 0.85) {
  if (!url) return Promise.resolve('');
  // If already a Base64 data URL, return immediately without re-compressing
  if (typeof url === 'string' && url.trim().startsWith('data:image/')) {
    return Promise.resolve(url.trim());
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

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
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

export default {
  fileToBase64,
  urlToBase64,
};
