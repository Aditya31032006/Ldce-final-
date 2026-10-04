import React from 'react';
import '../styles/assistant.scss';

/**
 * Robust, minimalist Markdown renderer tailored for Executive Assistant telemetry.
 * Formats:
 * - Bold / Italic asterisks (***, **, *, __, _) with auto-closure during streaming
 * - Dashes: bullet lists (-), horizontal rules (---), and em-dashes (--)
 * - Bullet lists (*, -, +, •) with emerald markers
 * - Numbered lists (1., 2.)
 * - Multiline code fences (```lang ... ```)
 * - Data tables (| Header | Value |)
 * - Blockquotes (> note)
 * - Key-value metric chips
 */
export default function MarkdownRenderer({ content, isStreaming = false }) {
  if (!content && !isStreaming) return null;

  // Auto-close unclosed formatting tags during active streaming
  // This guarantees raw asterisks or backticks never show up while the model is typing!
  let normalizedContent = content || '';
  if (isStreaming && normalizedContent) {
    normalizedContent = autoCloseMarkdown(normalizedContent);
  }

  const rawLines = normalizedContent.split('\n');
  const blocks = [];

  let inTable = false;
  let tableRows = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines = [];

  let listType = null; // 'ul' | 'ol' | null
  let listItems = [];

  const flushTable = (idx) => {
    if (tableRows.length > 0) {
      const headerRow = tableRows[0];
      // Filter out divider rows like |---|---|
      const bodyRows = tableRows.slice(1).filter(row =>
        !row.every(cell => cell.match(/^[:\-\s]+$/))
      );

      blocks.push(
        <div key={`table-${idx}`} className="ai-table-wrapper thin-scrollbar">
          <table>
            {headerRow && (
              <thead>
                <tr>
                  {headerRow.map((cell, cIdx) => (
                    <th key={cIdx}>{renderInline(cell.trim())}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx}>{renderInline(cell.trim())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  const flushList = (idx) => {
    if (listItems.length > 0 && listType) {
      if (listType === 'ul') {
        blocks.push(
          <ul key={`ul-${idx}`} className="ai-styled-list">
            {listItems.map((item, i) => (
              <li key={i}>{renderInline(item)}</li>
            ))}
          </ul>
        );
      } else {
        blocks.push(
          <ol key={`ol-${idx}`} className="ai-styled-numbered-list">
            {listItems.map((item, i) => (
              <li key={i}>{renderInline(item)}</li>
            ))}
          </ol>
        );
      }
      listItems = [];
      listType = null;
    }
  };

  const flushCodeBlock = (idx) => {
    if (codeBlockLines.length > 0 || inCodeBlock) {
      blocks.push(
        <div key={`code-${idx}`} className="ai-code-block-container">
          {codeBlockLang && <div className="ai-code-header">{codeBlockLang}</div>}
          <pre className="thin-scrollbar">
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        </div>
      );
      codeBlockLines = [];
      codeBlockLang = '';
      inCodeBlock = false;
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Multiline Code Fences (```lang)
    if (trimmed.startsWith('```')) {
      if (listType) flushList(i);
      if (inTable) flushTable(i);

      if (inCodeBlock) {
        flushCodeBlock(i);
      } else {
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // 2. Markdown Tables (| cell | cell |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (listType) flushList(i);
      inTable = true;
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable(i);
    }

    // 3. Unordered Bullet Lists (* or - or + or •)
    const bulletMatch = line.match(/^(\s*)([-*+•])\s+(.+)$/);
    if (bulletMatch) {
      if (inTable) flushTable(i);
      if (listType !== 'ul') {
        if (listType) flushList(i);
        listType = 'ul';
      }
      listItems.push(bulletMatch[3].trim());
      continue;
    }

    // 4. Ordered Lists (1. 2. etc.)
    const numberMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (numberMatch) {
      if (inTable) flushTable(i);
      if (listType !== 'ol') {
        if (listType) flushList(i);
        listType = 'ol';
      }
      listItems.push(numberMatch[3].trim());
      continue;
    }

    // End of list block
    if (listType) {
      flushList(i);
    }

    // 5. Horizontal Dividers (--- or *** or ___)
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push(<hr key={`hr-${i}`} className="ai-divider" />);
      continue;
    }

    // 6. Blockquotes (> text)
    if (trimmed.startsWith('> ') || trimmed === '>') {
      blocks.push(
        <blockquote key={`quote-${i}`} className="ai-callout-quote">
          <p>{renderInline(trimmed.slice(2).trim())}</p>
        </blockquote>
      );
      continue;
    }

    // 7. Section Headers (#, ##, ###, ####)
    if (trimmed.startsWith('#### ')) {
      blocks.push(<h4 key={`h4-${i}`}>{renderInline(trimmed.slice(5))}</h4>);
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push(<h3 key={`h3-${i}`}>{renderInline(trimmed.slice(4))}</h3>);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push(<h2 key={`h2-${i}`}>{renderInline(trimmed.slice(3))}</h2>);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push(<h2 key={`h1-${i}`}>{renderInline(trimmed.slice(2))}</h2>);
      continue;
    }

    // 8. Empty lines
    if (!trimmed) {
      continue;
    }

    // 9. Standard Text Paragraph
    blocks.push(
      <p key={`p-${i}`} className="ai-paragraph">
        {renderInline(trimmed)}
      </p>
    );
  }

  if (inCodeBlock) flushCodeBlock('end');
  if (inTable) flushTable('end');
  if (listType) flushList('end');

  return (
    <div className="assistant-markdown-flow">
      {blocks}
      {isStreaming && (
        <span className="ai-streaming-cursor-wrapper" title="Advisor is synthesizing...">
          <span className="ai-streaming-cursor" />
        </span>
      )}
    </div>
  );
}

/**
 * Automatically closes unclosed markdown tokens (e.g. `**`, `*`, ```, `)
 * so incomplete tokens during streaming do not show raw asterisks on screen.
 */
function autoCloseMarkdown(text) {
  let processed = text;

  // Auto-close code blocks
  const codeBlockCount = (processed.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    processed += '\n```';
  }

  // Auto-close bold (**)
  // Count pairs of **
  const doubleStarCount = (processed.match(/\*\*/g) || []).length;
  if (doubleStarCount % 2 !== 0) {
    processed += '**';
  }

  // Auto-close single asterisks (excluding closed ** pairs)
  // Simple check for unclosed single star at the end
  const singleStarCount = (processed.replace(/\*\*/g, '').match(/\*/g) || []).length;
  if (singleStarCount % 2 !== 0) {
    processed += '*';
  }

  // Auto-close inline backticks
  const backtickCount = (processed.replace(/```[\s\S]*?```/g, '').match(/`/g) || []).length;
  if (backtickCount % 2 !== 0) {
    processed += '`';
  }

  return processed;
}

/**
 * Parses inline formatting:
 * - ***bold italic***
 * - **bold** and __bold__
 * - *italic* and _italic_
 * - `code`
 * - Em-dash (--)
 */
function renderInline(text) {
  if (!text) return '';

  // Clean raw double hyphens to proper em-dash for clean typography
  let cleaned = text.replace(/(\s+)--(\s+)/g, '$1—$2');

  // Tokenize regex for formatting spans
  const regex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      parts.push(cleaned.slice(lastIndex, match.index));
    }
    const token = match[0];

    // Inline Code
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="ai-inline-code">
          {token.slice(1, -1)}
        </code>
      );
    }
    // Bold Italic
    else if (token.startsWith('***') && token.endsWith('***')) {
      parts.push(
        <strong key={match.index} className="ai-bold-italic">
          <em>{token.slice(3, -3)}</em>
        </strong>
      );
    }
    // Bold
    else if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      const boldText = token.slice(2, -2);
      parts.push(
        <strong key={match.index} className="ai-bold-text">
          {boldText}
        </strong>
      );
    }
    // Italic
    else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      parts.push(
        <em key={match.index} className="ai-italic-text">
          {token.slice(1, -1)}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < cleaned.length) {
    parts.push(cleaned.slice(lastIndex));
  }

  return parts.length > 0 ? parts : cleaned;
}
