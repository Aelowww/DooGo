/**
 * Turns a picked image into a small square JPEG data URL (center-cropped).
 * Profile photos are stored this way on the Firestore profile, so DooGo
 * doesn't need Cloud Storage (which requires the paid Blaze plan).
 */
export async function toAvatarDataUrl(file: File, size = 256, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported in this browser.");
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Shrinks a photo of a document (keeping its proportions) to a JPEG data URL small enough
 * for a Firestore document. Tries lower quality until it fits under `maxBytes`.
 */
export async function toDocumentDataUrl(file: File, maxSide = 1400, maxBytes = 650_000): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported in this browser.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.82, 0.7, 0.58, 0.46]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= maxBytes) return url;
  }
  throw new Error("This image is too detailed to upload. Try a closer, clearer photo.");
}
