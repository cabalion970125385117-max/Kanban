/**
 * MarkdownPreview — renders a markdown string as safe HTML.
 * No external deps: uses a lightweight regex pipeline.
 */

interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

/** Convert markdown to HTML — handles the most common subset. */
function renderMarkdown(md: string): string {
  let html = md
    // Escape raw HTML to prevent injection
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Fenced code blocks  ``` … ```
  html = html.replace(/```([\s\S]*?)```/g, (_, code) =>
    `<pre class="md-pre"><code>${code.trim()}</code></pre>`,
  );

  // Headers (H1–H3)
  html = html.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');

  // Task lists [ ] / [x]
  html = html.replace(/^- \[x\] (.+)$/gim, '<li class="md-task done"><span class="md-cb">✓</span> $1</li>');
  html = html.replace(/^- \[ \] (.+)$/gim, '<li class="md-task"><span class="md-cb">○</span> $1</li>');

  // Unordered lists
  html = html.replace(/^[-*] (.+)$/gm, '<li class="md-li">$1</li>');
  // Wrap consecutive <li> into <ul>
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul class="md-ul">${m}</ul>`);

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="md-oli">$1</li>');
  html = html.replace(/(<li class="md-oli">.*<\/li>\n?)+/g, (m) => `<ol class="md-ol">${m}</ol>`);

  // Blockquotes — note: `>` was already escaped to `&gt;` above
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
    '<a href="$2" class="md-link" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // @mentions
  html = html.replace(
    /@(\S+)/g,
    '<span class="md-mention">@$1</span>',
  );

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="md-hr" />');

  // Paragraphs: double newline → <p>
  html = html
    .split(/\n{2,}/)
    .map((block) => {
      if (/^<(h[1-3]|ul|ol|pre|blockquote|hr)/.test(block.trim())) return block;
      const wrapped = block.trim();
      if (!wrapped) return '';
      return `<p class="md-p">${wrapped.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');

  return html;
}

export function MarkdownPreview({ markdown, className }: MarkdownPreviewProps) {
  if (!markdown.trim()) {
    return (
      <p className="text-sm text-[var(--color-text-muted)] italic">
        No description — click Edit to add one.
      </p>
    );
  }

  return (
    <div
      className={`md-preview text-sm text-[var(--color-text)] ${className ?? ''}`}
      // Safe: we escape all HTML before processing, only our own tags remain
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }}
    />
  );
}
