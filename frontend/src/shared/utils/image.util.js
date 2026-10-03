/**
 * Utility for converting and compressing images into Base64 Data URLs
 */

/**
 * Reads a File and converts/compresses it to a Base64 data URL
 * @param {File} file 
 * @param {number} maxWidth Default 1200
 * @param {number} maxHeight Default 1200
 * @param {number} quality Default 0.85
 * @returns {Promise<string>} Base64 data URL string
 */
export function fileToBase64(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const rawBase64 = reader.result;
      const img = new Image();
      img.onerror = () => resolve(rawBase64); // Fallback to raw base64
      img.onload = () => {
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
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to compressed Base64 JPEG data URL
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
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
export function urlToBase64(url, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
  if (!url) return Promise.resolve('');
  if (url.startsWith('data:image/')) return Promise.resolve(url);

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
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) {
        // In case of CORS canvas taint, return original url
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
