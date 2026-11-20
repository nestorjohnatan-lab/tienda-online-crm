interface NexoraLogoProps {
  subtitle?: string;
  size?: 'sm' | 'md';
  tone?: 'dark' | 'light';
}

/**
 * Logotipo oficial NEXORA MARKET (Graphite Carbon #14171C, Signal Red #E62129, Pure White #FFFFFF).
 */
export function NexoraLogo({ subtitle = 'CRM', size = 'md', tone = 'dark' }: NexoraLogoProps) {
  const isLightSurface = tone === 'light';
  const wordColor = isLightSurface ? '#14171C' : '#FFFFFF';
  const subColor = isLightSurface ? '#525866' : '#A0A6B1';
  const markSize = size === 'sm' ? 32 : 36;

  return (
    <span className={`nexora-logo nexora-logo--${size}`}>
      <span className="nexora-logo__badge" style={{ width: markSize, height: markSize }} aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M11 54V12C11 9.79086 12.7909 8 15 8H21.2C22.9 8 24.5 8.85 25.45 10.25L41 33.2V12C41 9.79086 42.7909 8 45 8H49C51.2091 8 53 9.79086 53 12V52C53 54.2091 51.2091 56 49 56H42.8C41.1 56 39.5 55.15 38.55 53.75L23 30.8V52C23 54.2091 21.2091 56 19 56H15C12.7909 56 11 54.2091 11 52V54Z"
            fill="#14171C"
          />
          <rect x="14.5" y="13" width="5.2" height="38" rx="1.6" fill="#FFFFFF" />
          <rect x="44.3" y="13" width="5.2" height="38" rx="1.6" fill="#FFFFFF" />
          <path d="M18.2 12.8L23.5 12.8L45.8 51.2L40.5 51.2L18.2 12.8Z" fill="#E62129" />
          <path
            d="M32 25.5L33.8 30.2L38.5 32L33.8 33.8L32 38.5L30.2 33.8L25.5 32L30.2 30.2L32 25.5Z"
            fill="#FFFFFF"
          />
        </svg>
      </span>
      <span className="nexora-logo__text">
        <span className="nexora-logo__word" style={{ color: wordColor }}>
          NEXORA
          <svg className="nexora-logo__arrow" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8"
              stroke="#E62129"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="nexora-logo__sub" style={{ color: subColor }}>
          {subtitle}
        </span>
      </span>
    </span>
  );
}
