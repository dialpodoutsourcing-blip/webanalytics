export function urlBelongsToProperty(candidate: string, property: string): boolean {
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return false;
    if (property.startsWith('sc-domain:')) {
      const domain = property.slice(10).toLowerCase().replace(/\.$/, '');
      const host = url.hostname.toLowerCase().replace(/\.$/, '');
      return host === domain || host.endsWith(`.${domain}`);
    }
    const prefix = new URL(property);
    if (url.origin !== prefix.origin) return false;
    const base = prefix.pathname.endsWith('/') ? prefix.pathname : `${prefix.pathname}/`;
    return url.pathname === prefix.pathname || url.pathname.startsWith(base);
  } catch { return false; }
}
