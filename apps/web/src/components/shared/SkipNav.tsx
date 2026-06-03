/**
 * Visually hidden "Skip to main content" link.
 * Becomes visible on keyboard focus so screen-reader and keyboard
 * users can jump past the repeated navigation on every page.
 */
export function SkipNav() {
  return (
    <a
      href="#main-content"
      className={[
        // Hidden by default
        'sr-only',
        // Reveal on focus
        'focus:not-sr-only',
        'focus:fixed focus:top-2 focus:left-2 focus:z-[9999]',
        'focus:rounded-md focus:px-4 focus:py-2',
        'focus:bg-[var(--color-accent)] focus:text-white',
        'focus:font-semibold focus:shadow-lg',
        'focus:outline-none focus:ring-2 focus:ring-white',
      ].join(' ')}
    >
      Skip to main content
    </a>
  );
}
