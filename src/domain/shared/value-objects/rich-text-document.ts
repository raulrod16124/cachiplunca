export type RichTextDocument =
  | {
      type: 'document';
      content: RichTextBlock[];
    }
  | {
      type: 'block';
      content: RichTextBlock;
    }
  | {
      type: 'inline';
      content: RichTextInline[];
    };

export const richTextDocumentType = {
  Document: 'document' as const,
  Block: 'block' as const,
  Inline: 'inline' as const,
};

export type RichTextBlock =
  | {
      type: 'paragraph';
      content: RichTextInline[];
      attributes?: Record<string, unknown>;
    }
  | {
      type: 'heading';
      level: 1 | 2 | 3;
      content: RichTextInline[];
      attributes?: Record<string, unknown>;
    }
  | {
      type: 'bulletList';
      content: RichTextBlockListItem[];
      attributes?: Record<string, unknown>;
    }
  | {
      type: 'orderedList';
      content: RichTextBlockListItem[];
      attributes?: Record<string, unknown>;
    };

export const richTextBlockType = {
  Paragraph: 'paragraph' as const,
  Heading: 'heading' as const,
  BulletList: 'bulletList' as const,
  OrderedList: 'orderedList' as const,
};

export type RichTextBlockListItem = {
  type: 'listItem';
  content: RichTextBlock;
};

export type RichTextInline =
  | {
      type: 'text';
      text: string;
      attributes?: Record<string, unknown>;
    }
  | {
      type: 'italic';
      content: RichTextInline[];
    }
  | {
      type: 'highlight';
      content: RichTextInline[];
    };

export const richTextInlineType = {
  Text: 'text' as const,
  Italic: 'italic' as const,
  Highlight: 'highlight' as const,
};

/**
 * Create a new rich text document with default paragraph content.
 */
export function createRichTextDocument(): RichTextDocument {
  return {
    type: 'document',
    content: [
      {
        type: 'paragraph',
        content: [],
      },
    ],
  };
}

/**
 * Convert plain text string to a rich text document.
 */
export function richTextFromPlain(text: string): RichTextDocument {
  return {
    type: 'document',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text,
          },
        ],
      },
    ],
  };
}

/**
 * Convert a rich text document to a plain string.
 */
export function richTextToPlain(document: RichTextDocument): string {
  switch (document.type) {
    case 'document':
      if (Array.isArray(document.content)) {
        return document.content
          .map(block => richTextBlockToPlain(block))
          .filter(Boolean)
          .join(' ');
      }
      return '';
    
    case 'block':
      return richTextBlockToPlain(document.content);
    
    case 'inline':
      if (Array.isArray(document.content)) {
        return document.content
          .map(inline => richTextInlineToPlain(inline))
          .filter(Boolean)
          .join('');
      }
      return '';
  }
}

/**
 * Convert a rich text block to a plain string.
 */
function richTextBlockToPlain(block: RichTextBlock): string {
  switch (block.type) {
    case 'paragraph':
    case 'heading': {
      if (Array.isArray(block.content)) {
        return block.content
          .map(inline => richTextInlineToPlain(inline))
          .filter(Boolean)
          .join('');
      }
      return '';
    }
    
    case 'bulletList':
    case 'orderedList': {
      if (Array.isArray(block.content)) {
        return block.content
          .map(item => richTextBlockToPlain(item.content))
          .filter(Boolean)
          .join(', ');
      }
      return '';
    }
    
    default:
      return '';
  }
}

/**
 * Convert a rich text inline element to a plain string.
 */
function richTextInlineToPlain(inline: RichTextInline): string {
  switch (inline.type) {
    case 'text':
      return inline.text;
    
    case 'italic':
    case 'highlight': {
      if (Array.isArray(inline.content)) {
        return inline.content
          .map(item => richTextInlineToPlain(item))
          .filter(Boolean)
          .join('');
      }
      return '';
    }
    
    default:
      return '';
  }
}

/**
 * Validate a rich text document.
 * Returns true if valid, false otherwise.
 */
export function validateRichTextDocument(document: RichTextDocument): boolean {
  try {
    if (!document || typeof document !== 'object') {
      return false;
    }

    switch (document.type) {
      case 'document':
        if (!Array.isArray(document.content)) {
          return false;
        }
        for (const block of document.content) {
          if (!validateRichTextBlock(block)) {
            return false;
          }
        }
        return true;
      
      case 'block':
        return validateRichTextBlock(document.content);
      
      case 'inline':
        if (!Array.isArray(document.content)) {
          return false;
        }
        for (const inline of document.content) {
          if (!validateRichTextInline(inline)) {
            return false;
          }
        }
        return true;
      
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Validate a rich text block.
 */
function validateRichTextBlock(block: RichTextBlock): boolean {
  switch (block.type) {
    case 'paragraph':
    case 'heading': {
      return (
        typeof block.level === 'number' &&
        Array.isArray(block.content) &&
        block.content.every(inline => validateRichTextInline(inline))
      );
    }
    
    case 'bulletList':
    case 'orderedList': {
      if (!Array.isArray(block.content)) {
        return false;
      }
      
      // Validate list items
      const isValid = block.content.every(item => {
        if (item.type !== 'listItem') return false;
        return validateRichTextBlock(item.content);
      });
      
      return isValid;
    }
    
    default:
      return false;
  }
}

/**
 * Validate a rich text inline element.
 */
function validateRichTextInline(inline: RichTextInline): boolean {
  switch (inline.type) {
    case 'text': {
      if (typeof inline.text !== 'string') return false;
      return true;
    }
    
    case 'italic':
    case 'highlight': {
      if (!Array.isArray(inline.content)) return false;
      return inline.content.every(item => validateRichTextInline(item));
    }
    
    default:
      return false;
  }
}

/**
 * Sanitize a rich text document to make it valid.
 */
export function sanitizeRichTextDocument(document: RichTextDocument): RichTextDocument {
  if (validateRichTextDocument(document)) {
    return document;
  }

  return createRichTextDocument();
}

/**
 * Validate title document - ensures exactly one block that is paragraph or heading.
 * Returns true if valid, false otherwise.
 */
export function validateTitleDocument(document: RichTextDocument): boolean {
  try {
    // Must be a valid document
    if (!validateRichTextDocument(document)) {
      return false;
    }

    // Must have at least one content item
    if (document.content.length === 0) {
      return false;
    }

    // Must have only one block in the document
    if (document.content.length > 1) {
      return false;
    }

    const block = document.content[0];
    
    // Block must be either paragraph or heading
    return (
      block.type === 'paragraph' || 
      block.type === 'heading'
    );
  } catch (error) {
    return false;
  }
}

/**
 * Check if a rich text document contains only one inline block.
 */
export function isSingleInlineBlockDocument(document: RichTextDocument): boolean {
  try {
    // Type guard for document type:
    if (document.type !== 'document') {
      return false;
    }
    
    // Must have exactly one content item
    if (document.content.length !== 1) {
      return false;
    }

    const block = document.content[0];
    
    // Block must be paragraph or heading  
    return (
      block.type === 'paragraph' || 
      block.type === 'heading'
    );
  } catch (error) {
    return false;
  }
}
