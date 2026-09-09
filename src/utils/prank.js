export const COUNTRY_NAMES = {
  AD: 'Andorra', AE: 'United Arab Emirates', AF: 'Afghanistan', AL: 'Albania', AM: 'Armenia',
  AO: 'Angola', AR: 'Argentina', AT: 'Austria', AU: 'Australia', AZ: 'Azerbaijan',
  BA: 'Bosnia and Herzegovina', BD: 'Bangladesh', BE: 'Belgium', BF: 'Burkina Faso',
  BG: 'Bulgaria', BH: 'Bahrain', BI: 'Burundi', BJ: 'Benin', BN: 'Brunei', BO: 'Bolivia',
  BR: 'Brazil', BY: 'Belarus', CA: 'Canada', CD: 'Congo (DRC)', CG: 'Congo', CH: 'Switzerland',
  CI: "C\u00f4te d\u2019Ivoire", CL: 'Chile', CM: 'Cameroon', CN: 'China', CO: 'Colombia',
  CR: 'Costa Rica', CU: 'Cuba', CY: 'Cyprus', CZ: 'Czechia', DE: 'Germany', DK: 'Denmark',
  DO: 'Dominican Republic', DZ: 'Algeria', EC: 'Ecuador', EE: 'Estonia', EG: 'Egypt',
  ES: 'Spain', FI: 'Finland', FR: 'France', GA: 'Gabon', GB: 'United Kingdom', GE: 'Georgia',
  GH: 'Ghana', GR: 'Greece', GT: 'Guatemala', HK: 'Hong Kong', HN: 'Honduras', HR: 'Croatia',
  HT: 'Haiti', HU: 'Hungary', ID: 'Indonesia', IE: 'Ireland', IL: 'Israel', IN: 'India',
  IQ: 'Iraq', IR: 'Iran', IS: 'Iceland', IT: 'Italy', JM: 'Jamaica', JO: 'Jordan',
  JP: 'Japan', KE: 'Kenya', KG: 'Kyrgyzstan', KH: 'Cambodia', KR: 'South Korea',
  KW: 'Kuwait', KZ: 'Kazakhstan', LA: 'Laos', LB: 'Lebanon', LK: 'Sri Lanka',
  LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia', LY: 'Libya', MA: 'Morocco',
  MC: 'Monaco', MD: 'Moldova', ME: 'Montenegro', MG: 'Madagascar', MK: 'North Macedonia',
  ML: 'Mali', MM: 'Myanmar', MN: 'Mongolia', MT: 'Malta', MX: 'Mexico', MY: 'Malaysia',
  MZ: 'Mozambique', NA: 'Namibia', NE: 'Niger', NG: 'Nigeria', NI: 'Nicaragua',
  NL: 'Netherlands', NO: 'Norway', NP: 'Nepal', NZ: 'New Zealand', OM: 'Oman',
  PA: 'Panama', PE: 'Peru', PG: 'Papua New Guinea', PH: 'Philippines', PK: 'Pakistan',
  PL: 'Poland', PR: 'Puerto Rico', PS: 'Palestine', PT: 'Portugal', PY: 'Paraguay',
  QA: 'Qatar', RO: 'Romania', RS: 'Serbia', RU: 'Russia', RW: 'Rwanda', SA: 'Saudi Arabia',
  SD: 'Sudan', SE: 'Sweden', SG: 'Singapore', SI: 'Slovenia', SK: 'Slovakia',
  SN: 'Senegal', SV: 'El Salvador', SY: 'Syria', TH: 'Thailand', TN: 'Tunisia',
  TR: 'T\u00fcrkiye', TT: 'Trinidad and Tobago', TW: 'Taiwan', TZ: 'Tanzania',
  UA: 'Ukraine', UG: 'Uganda', US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan',
  VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen', ZA: 'South Africa', ZM: 'Zambia', ZW: 'Zimbabwe',
};

export function detectBrowser() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return { name: 'Microsoft Edge', version: (ua.match(/Edg\/([\d.]+)/) || [])[1] };
  if (/OPR\//.test(ua)) return { name: 'Opera', version: (ua.match(/OPR\/([\d.]+)/) || [])[1] };
  if (/CriOS\//.test(ua)) return { name: 'Google Chrome (iOS)', version: (ua.match(/CriOS\/([\d.]+)/) || [])[1] };
  if (/FxiOS\//.test(ua)) return { name: 'Mozilla Firefox (iOS)', version: (ua.match(/FxiOS\/([\d.]+)/) || [])[1] };
  if (/Chrome\//.test(ua)) return { name: 'Google Chrome', version: (ua.match(/Chrome\/([\d.]+)/) || [])[1] };
  if (/Firefox\//.test(ua)) return { name: 'Mozilla Firefox', version: (ua.match(/Firefox\/([\d.]+)/) || [])[1] };
  if (/Safari\//.test(ua)) return { name: 'Safari', version: (ua.match(/Version\/([\d.]+)/) || [])[1] };
  return { name: 'Unknown', version: '?' };
}

export function detectPlatform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPod/.test(ua)) return 'iOS (iPhone)';
  if (/iPad/.test(ua)) return 'iPadOS (iPad)';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Linux/.test(ua)) return 'Linux';
  return navigator.platform || 'Unknown';
}

export function detectDeviceType() {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/.test(ua)) return 'Tablet';
  if (/iPhone|iPod|Android.*Mobile|Mobile/.test(ua)) return 'Mobile';
  return 'No (desktop)';
}

export function detectOrientation() {
  const orientation = window.screen && screen.orientation;
  if (orientation && orientation.type) {
    return orientation.type.includes('landscape') ? 'landscape' : 'portrait';
  }
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

export function detectGPU() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { vendor: 'WebGL unavailable', renderer: 'WebGL not supported' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return { vendor: 'Hidden', renderer: 'not exposed by the driver' };
    return {
      vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || 'unknown',
      renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || 'unknown',
    };
  } catch {
    return { vendor: 'Blocked', renderer: 'WebGL blocked by browser settings' };
  }
}

export function fmtTime(timeZone) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      ...(timeZone ? { timeZone } : {}),
    }).format(new Date());
  } catch {
    return new Date().toLocaleString('en-US');
  }
}

export async function fetchGeo() {
  try {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = setTimeout(() => { if (controller) controller.abort(); }, 5000);
    const response = await fetch('https://ipinfo.io/json', controller ? { signal: controller.signal } : undefined);
    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = await response.json();
    return data && data.ip ? data : null;
  } catch {
    return null;
  }
}
