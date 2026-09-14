import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import DOMPurify from 'isomorphic-dompurify';

interface SafeMarkdownProps {
  children: string;
  className?: string;
  components?: Components;
}

export function SafeMarkdown({ children, className, components }: SafeMarkdownProps) {
  const sanitized = DOMPurify.sanitize(children || '');
  
  if (className) {
    return (
      <div className={className}>
        <ReactMarkdown components={components}>
          {sanitized}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <ReactMarkdown components={components}>
      {sanitized}
    </ReactMarkdown>
  );
}
