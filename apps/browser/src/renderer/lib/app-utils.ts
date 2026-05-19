export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getLuminance(color: string): number {
  let r: number;
  let g: number;
  let b: number;

  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else if (color.startsWith("rgb")) {
    const matches = color.match(/\d+/g);
    if (!matches) return 0;
    r = parseInt(matches[0]);
    g = parseInt(matches[1]);
    b = parseInt(matches[2]);
  } else {
    return 0;
  }

  const [rLinear, gLinear, bLinear] = [r, g, b].map((value) => {
    const srgb = value / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

export function getWebContentsBounds(
  rect: DOMRect,
  orientation: "portrait" | "landscape"
): Bounds {
  const statusBarHeight = 58;
  const statusBarWidth = 58;

  return {
    x: Math.round(rect.x + (orientation === "landscape" ? statusBarWidth : 0)),
    y: Math.round(rect.y + (orientation === "landscape" ? 0 : statusBarHeight)),
    width: Math.round(
      rect.width - (orientation === "landscape" ? statusBarWidth : 0)
    ),
    height: Math.round(
      rect.height - (orientation === "landscape" ? 0 : statusBarHeight)
    ),
  };
}

export function normalizeNavigationUrl(url: string): string {
  let finalUrl = url.trim();

  if (
    finalUrl.startsWith("http://") ||
    finalUrl.startsWith("https://") ||
    finalUrl.startsWith("file://")
  ) {
    return finalUrl;
  }

  const isLocalUrl =
    /^(localhost|127\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?/i.test(
      finalUrl
    );

  finalUrl = `${isLocalUrl ? "http" : "https"}://${finalUrl}`;
  return finalUrl;
}
