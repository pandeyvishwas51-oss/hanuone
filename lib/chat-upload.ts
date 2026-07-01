/** Client-side helper: turn a File into a base64 attachment for the AI doctor API. */

export interface ChatAttachment {
  kind: "image" | "pdf";
  mediaType: string;
  data: string; // base64, no data: prefix
  name: string;
}

export const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export function isAllowed(file: File): boolean {
  return /^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.type === "application/pdf";
}

export function fileToAttachment(file: File): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    if (!isAllowed(file)) return reject(new Error("Only JPG, PNG, WEBP, GIF or PDF files are supported."));
    if (file.size > MAX_FILE_BYTES) return reject(new Error("File is too large (max 5 MB)."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve({
        kind: file.type === "application/pdf" ? "pdf" : "image",
        mediaType: file.type,
        data: base64,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  });
}
