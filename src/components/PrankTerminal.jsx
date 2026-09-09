import { useState, useEffect, useRef, useCallback } from 'react';
import { COUNTRY_NAMES, detectBrowser, detectPlatform, detectDeviceType, detectOrientation, detectGPU, fmtTime, fetchGeo } from '../utils/prank';

export default function PrankTerminal() {
  const bodyRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [geoValues, setGeoValues] = useState({});
  const [closingVisible, setClosingVisible] = useState(false);
  const initialized = useRef(false);
  const gpuProbed = useRef(false);

  const buildRows = useCallback(() => {
    const browser = detectBrowser();
    const rowDefs = [
      { key: 'ip', label: 'IP Address', initial: 'scanning\u2026' },
      { key: 'country', label: 'Country', initial: 'scanning\u2026' },
      { key: 'region', label: 'Region', initial: 'scanning\u2026' },
      { key: 'city', label: 'City', initial: 'scanning\u2026' },
      { key: 'zip', label: 'ZIP Code', initial: 'scanning\u2026' },
      { key: 'full', label: 'Full Location', initial: 'scanning\u2026' },
      { key: 'lat', label: 'Latitude', initial: 'scanning\u2026' },
      { key: 'lng', label: 'Longitude', initial: 'scanning\u2026' },
      { key: 'tz', label: 'Timezone', initial: 'scanning\u2026' },
      { key: 'time', label: 'Current Time', initial: fmtTime() },
      { key: 'org', label: 'ISP', initial: 'scanning\u2026' },
      { key: 'org2', label: 'Organization', initial: 'scanning\u2026' },
      { key: 'asn', label: 'Autonomous System', initial: 'scanning\u2026' },
      { key: null, label: 'Browser Name', initial: browser.name },
      { key: null, label: 'Platform Name', initial: detectPlatform() },
      { key: null, label: 'Browser Version', initial: browser.version },
      { key: null, label: 'Mobile/Tablet', initial: detectDeviceType() },
      { key: null, label: 'Referrer', initial: document.referrer || 'typed, opened directly, or referrer stripped' },
      { key: null, label: 'System Languages', initial: (navigator.languages || [navigator.language || 'en-US']).join(', ') },
      { key: null, label: 'Screen Width', initial: `${screen.width}px` },
      { key: null, label: 'Screen Height', initial: `${screen.height}px` },
      { key: null, label: 'Window Width', initial: `${window.innerWidth}px` },
      { key: null, label: 'Window Height', initial: `${window.innerHeight}px` },
      { key: null, label: 'Display Pixel Depth', initial: String(screen.pixelDepth || 'unknown') },
      { key: null, label: 'Screen Orientation', initial: detectOrientation() },
      { key: null, label: 'CPU Threads', initial: String(navigator.hardwareConcurrency || 'unknown') },
      { key: null, label: 'Available Browser Memory', initial: navigator.deviceMemory ? `${Math.round(navigator.deviceMemory * 1024)}MB` : 'not exposed by browser' },
      { key: 'gpuVendor', label: 'GPU Vendor', initial: 'detecting\u2026' },
      { key: 'gpuRenderer', label: 'GPU Info', initial: 'detecting\u2026' },
    ];
    return rowDefs;
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const rowDefs = buildRows();
    setRows(rowDefs);

    const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reduced ? 0 : rowDefs.length * 70 + 200;
    const timer = setTimeout(() => setClosingVisible(true), delay);

    fetchGeo().then((geo) => {
      if (!geo) {
        setGeoValues({
          ip: 'lookup unavailable', country: 'lookup unavailable',
          region: 'lookup unavailable', city: 'lookup unavailable',
          zip: 'lookup unavailable', full: 'lookup unavailable',
          lat: 'lookup unavailable', lng: 'lookup unavailable',
          tz: 'lookup unavailable', time: fmtTime(),
          org: 'lookup unavailable', org2: 'lookup unavailable',
          asn: 'lookup unavailable',
        });
        return;
      }

      const org = geo.org || '';
      const asnMatch = org.match(/^AS\d+/);
      const asn = asnMatch ? asnMatch[0] : '';
      const orgName = asn ? org.slice(asn.length).trim() : org;
      const loc = (geo.loc || '').split(',');
      const countryName = (code) => COUNTRY_NAMES[code] || code || 'unavailable';

      setGeoValues({
        ip: geo.ip || 'unavailable',
        country: countryName(geo.country),
        region: geo.region || 'unavailable',
        city: geo.city || 'unavailable',
        zip: geo.postal || 'unavailable',
        full: geo.city && geo.region ? `${geo.city}, ${geo.region}, ${countryName(geo.country)}` : 'unavailable',
        lat: loc[0] || 'unavailable',
        lng: loc[1] || 'unavailable',
        tz: geo.timezone || 'unavailable',
        time: geo.timezone ? fmtTime(geo.timezone) : fmtTime(),
        org: orgName || 'unavailable',
        org2: orgName || 'unavailable',
        asn: asn || 'unavailable',
      });
    }).catch(() => {});

    return () => clearTimeout(timer);
  }, [buildRows]);

  useEffect(() => {
    if (gpuProbed.current) return;
    const el = bodyRef.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        gpuProbed.current = true;
        try {
          const gpu = detectGPU();
          setGeoValues((prev) => ({
            ...prev,
            gpuVendor: gpu.vendor,
            gpuRenderer: gpu.renderer,
          }));
        } catch {}
      });
    }, { threshold: 0.05 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const getValue = (rowDef) => {
    if (rowDef.key && geoValues[rowDef.key] !== undefined) {
      return geoValues[rowDef.key];
    }
    return rowDef.initial;
  };

  return (
    <article className="feed-video prank-card" aria-label="Device scan results">
      <div className="terminal" role="img" aria-label="Scan result for this device">
        <div className="terminal-bar">
          <span className="dot dot-red" aria-hidden="true"></span>
          <span className="dot dot-yellow" aria-hidden="true"></span>
          <span className="dot dot-green" aria-hidden="true"></span>
          <span className="terminal-title">tiger — terminal (zsh)</span>
        </div>
        <div className="terminal-body" ref={bodyRef}>
          <p className="t-boot">&gt; establishing remote uplink&hellip;</p>
          {rows.map((rowDef, i) => (
            <TerminalRow key={i} rowDef={rowDef} index={i} getValue={getValue} />
          ))}
          {closingVisible && (
            <p className="t-boot t-blink">
              &gt; you have been fully observed &mdash; data never left your device except this IP lookup
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function TerminalRow({ rowDef, index, getValue }) {
  const [visible, setVisible] = useState(false);
  const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => setVisible(true), index * 70);
    return () => clearTimeout(timer);
  }, [index, reduced]);

  const value = getValue(rowDef);

  return (
    <div
      className="t-row"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(3px)',
        transition: visible ? 'opacity .45s ease, transform .45s ease' : 'none',
      }}
    >
      <span className="t-key">{rowDef.label}</span>
      <span className="t-val">{value}</span>
    </div>
  );
}
