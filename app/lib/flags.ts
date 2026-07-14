// app/lib/flags.ts
// Shared TxLINE team-name -> flag-code map and helpers (flagcdn, free, no key).

export const FLAG: Record<string, string> = {
  argentina: "ar", brazil: "br", france: "fr", spain: "es", england: "gb-eng",
  germany: "de", portugal: "pt", netherlands: "nl", holland: "nl", belgium: "be",
  croatia: "hr", uruguay: "uy", "united states": "us", usa: "us", mexico: "mx",
  canada: "ca", japan: "jp", "south korea": "kr", "korea republic": "kr", australia: "au",
  morocco: "ma", senegal: "sn", ghana: "gh", nigeria: "ng", cameroon: "cm",
  "ivory coast": "ci", "cote d ivoire": "ci", switzerland: "ch", denmark: "dk",
  poland: "pl", serbia: "rs", ecuador: "ec", colombia: "co", peru: "pe", chile: "cl",
  paraguay: "py", norway: "no", sweden: "se", italy: "it", austria: "at", ukraine: "ua",
  wales: "gb-wls", scotland: "gb-sct", ireland: "ie", turkey: "tr", turkiye: "tr",
  egypt: "eg", algeria: "dz", tunisia: "tn", "saudi arabia": "sa", iran: "ir",
  qatar: "qa", myanmar: "mm", vietnam: "vn", "cape verde": "cv", panama: "pa",
  "costa rica": "cr", jamaica: "jm", "new zealand": "nz", "south africa": "za",
  greece: "gr", romania: "ro", "czech republic": "cz", czechia: "cz", hungary: "hu",
  slovakia: "sk", slovenia: "si", uzbekistan: "uz", "united arab emirates": "ae",
  bolivia: "bo", venezuela: "ve", honduras: "hn", "el salvador": "sv", jordan: "jo",
  iraq: "iq", oman: "om", bahrain: "bh", kuwait: "kw", india: "in", pakistan: "pk",
  "sri lanka": "lk", bangladesh: "bd", thailand: "th", indonesia: "id", malaysia: "my",
  "china pr": "cn", china: "cn",
};

export function normName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function flagCode(name?: string): string | undefined {
  if (!name) return undefined;
  return FLAG[normName(name)];
}

export function flagUrl(code: string, size: "24x18" | "32x24" | "48x36" = "24x18"): string {
  return `https://flagcdn.com/${size}/${code}.png`;
}
