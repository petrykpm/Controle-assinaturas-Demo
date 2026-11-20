interface SubscriptionIconProps {
  url?: string | null;
  name: string;
  size?: 'sm' | 'md';
}

function getFavicon(url: string) {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const domain = new URL(normalized).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  } catch { return null; }
}

export function SubscriptionIcon({ url, name, size = 'sm' }: SubscriptionIconProps) {
  const favicon = url?.trim() ? getFavicon(url.trim()) : null;
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <span className={`${dim} rounded bg-surface-3 shrink-0 inline-flex items-center justify-center overflow-hidden relative`}>
      <span className="text-[8px] font-bold text-muted-foreground uppercase">{name.slice(0, 2)}</span>
      {favicon && <img src={favicon} alt="" loading="lazy" referrerPolicy="no-referrer" className={`${dim} rounded object-contain absolute inset-0 bg-surface-3`} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
    </span>
  );
}
