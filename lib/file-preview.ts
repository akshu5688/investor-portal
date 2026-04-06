export type PreviewKind = "image" | "pdf" | "text" | null;

function getExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? (parts.pop() ?? "").toLowerCase() : "";
}

export function getPreviewKind(
  fileName: string,
  mimeType: string | null | undefined
): PreviewKind {
  const mt = (mimeType ?? "").toLowerCase();
  if (mt.startsWith("image/")) return "image";
  if (mt === "application/pdf") return "pdf";
  if (mt === "text/plain" || mt === "text/markdown") return "text";

  const ext = getExtension(fileName);
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (ext === "txt" || ext === "md") return "text";
  return null;
}
