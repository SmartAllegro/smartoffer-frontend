/** User/supplier website fields are navigation data, never executable schemes. */
export function safeWebsiteUrl(raw?: string | null): string | undefined {
  const value = (raw || "").trim();
  if (!value || value.startsWith("/") || /[\u0000-\u0020\u007f\\]/.test(value)) return undefined;
  // Do not reinterpret an explicit non-web scheme as a hostname.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

/** An image document cannot insert provider elements into the application DOM. */
export function qrImageSrc(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Keep a window reference for the asynchronous download, but sever its opener now. */
export function preopenDownloadTab(): Window | null {
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  return tab;
}
