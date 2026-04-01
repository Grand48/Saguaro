export function CactusHardHat({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* Hard hat dome */}
      <path d="M12 2C8.27 2 5.2 4.84 4.56 8.5h14.88C18.8 4.84 15.73 2 12 2z" />
      {/* Hard hat brim */}
      <rect x="3.5" y="8.5" width="17" height="1.8" rx="0.9" />
      {/* Cactus trunk */}
      <rect x="10.5" y="10.3" width="3" height="11.2" rx="1.5" />
      {/* Left arm — horizontal connector then upright */}
      <rect x="6.5" y="13.5" width="4" height="2.2" rx="1.1" />
      <rect x="6.5" y="11" width="2.2" height="4.7" rx="1.1" />
      {/* Right arm — horizontal connector then upright */}
      <rect x="13.5" y="16" width="4" height="2.2" rx="1.1" />
      <rect x="15.3" y="13.5" width="2.2" height="4.7" rx="1.1" />
    </svg>
  );
}
