/**
 * Compresses an image file by resizing it and converting it to a JPEG data URL.
 * This is crucial for reducing the storage footprint of images saved in the database.
 * @param file The image file to compress.
 * @param maxWidth The maximum width or height of the compressed image.
 * @param quality The quality of the output JPEG image (0 to 1).
 * @returns A promise that resolves with the compressed image as a base64 data URL.
 */
export const compressImage = (file: File, maxWidth = 1024, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      if (!event.target?.result) {
        return reject(new Error("Could not read file."));
      }
      img.src = event.target.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return reject(new Error("Could not get canvas context."));
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Use JPEG format for better compression of photographic images
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
