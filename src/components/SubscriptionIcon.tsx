interface SubscriptionIconProps {
  url?: string | null;
  name: string;
  size?: 'sm' | 'md';
}

function getFavicon(url: string) {
  if (!url) return null;
  try {
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

export function SubscriptionIcon({ url, name, size = 'sm' }: SubscriptionIconProps) {
  const favicon = url ? getFavicon(url) : null;
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  if (favicon) {
    return (
      <img
        src={favicon}
        alt={name}
        className={`${dim} rounded shrink-0`}
        onError={e => {
          const img = e.target as HTMLImageElement;
          img.style.display = 'none';
          const fallback = img.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
    );
  }

  return (
    <div className={`${dim} rounded bg-surface-3 shrink-0 flex items-center justify-center`}>
      <span className="text-[8px] font-bold text-muted-foreground uppercase">
        {name.slice(0, 2)}
      </span>
    </div>
  );
}
