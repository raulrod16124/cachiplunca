import { render, screen } from '@testing-library/react';
import { DEFAULT_TEXT_ALIGN } from '../../../../../domain/element';
import type { RichTextDocument, RichTextMarks } from '../../../../../domain/element';
import { RichTextContent } from '../../../../../presentation/canvas/renderers';

function paragraph(text: string, marks?: RichTextMarks): RichTextDocument {
  return {
    blocks: [
      {
        type: 'paragraph',
        align: DEFAULT_TEXT_ALIGN,
        spans: marks === undefined ? [{ text }] : [{ text, marks }],
      },
    ],
  };
}

describe('RichTextContent', () => {
  it('renders a single paragraph', () => {
    render(<RichTextContent document={paragraph('hello')} />);

    expect(screen.getByText('hello').tagName).toBe('P');
  });

  it('renders multiple paragraphs as separate nodes', () => {
    const doc: RichTextDocument = {
      blocks: [
        { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'one' }] },
        { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'two' }] },
      ],
    };

    render(<RichTextContent document={doc} />);

    expect(screen.getByText('one').tagName).toBe('P');
    expect(screen.getByText('two').tagName).toBe('P');
  });

  it('renders empty documents without crashing', () => {
    const { container } = render(<RichTextContent document={{ blocks: [] }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders empty paragraphs without crashing', () => {
    const doc: RichTextDocument = {
      blocks: [{ type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [] }],
    };

    const { container } = render(<RichTextContent document={doc} />);

    expect(container.querySelector('p')).not.toBeNull();
  });

  it('renders heading levels as h1, h2 and h3', () => {
    const doc: RichTextDocument = {
      blocks: [
        { type: 'heading', level: 1, align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'Title one' }] },
        { type: 'heading', level: 2, align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'Title two' }] },
        { type: 'heading', level: 3, align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'Title three' }] },
      ],
    };

    render(<RichTextContent document={doc} />);

    expect(screen.getByText('Title one').tagName).toBe('H1');
    expect(screen.getByText('Title two').tagName).toBe('H2');
    expect(screen.getByText('Title three').tagName).toBe('H3');
  });

  it('applies the paragraph alignment inline', () => {
    const doc: RichTextDocument = {
      blocks: [{ type: 'paragraph', align: 'center', spans: [{ text: 'centered' }] }],
    };

    render(<RichTextContent document={doc} />);

    expect(screen.getByText('centered')).toHaveStyle({ textAlign: 'center' });
  });

  it('renders bullet lists with list items', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'first' }] },
              ],
            },
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'second' }] },
              ],
            },
          ],
        },
      ],
    };

    const { container } = render(<RichTextContent document={doc} />);

    const list = container.querySelector('ul');
    expect(list).not.toBeNull();
    expect(list?.tagName).toBe('UL');
    expect(screen.getByText('first').tagName).toBe('P');
    expect(screen.getByText('second').tagName).toBe('P');
    expect(list?.querySelectorAll('li')).toHaveLength(2);
  });

  it('renders ordered lists as ol', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'orderedList',
          items: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'step one' }] },
              ],
            },
          ],
        },
      ],
    };

    const { container } = render(<RichTextContent document={doc} />);

    expect(container.querySelector('ol')).not.toBeNull();
    expect(container.querySelector('ul')).toBeNull();
  });

  it('renders nested lists inside list items', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'bulletList',
          items: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'outer' }] },
                {
                  type: 'bulletList',
                  items: [
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          align: DEFAULT_TEXT_ALIGN,
                          spans: [{ text: 'inner' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const { container } = render(<RichTextContent document={doc} />);

    const lists = container.querySelectorAll('ul');
    expect(lists).toHaveLength(2);
    expect(screen.getByText('inner')).toBeInTheDocument();
  });

  it('renders bold, italic, underline and strikethrough marks inline', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: DEFAULT_TEXT_ALIGN,
          spans: [
            { text: 'bold', marks: { bold: true } },
            { text: 'italic', marks: { italic: true } },
            { text: 'underline', marks: { underline: true } },
            { text: 'strike', marks: { strikethrough: true } },
          ],
        },
      ],
    };

    render(<RichTextContent document={doc} />);

    expect(screen.getByText('bold')).toHaveStyle({ fontWeight: 700 });
    expect(screen.getByText('italic')).toHaveStyle({ fontStyle: 'italic' });
    expect(screen.getByText('underline')).toHaveStyle({ textDecoration: 'underline' });
    expect(screen.getByText('strike')).toHaveStyle({ textDecoration: 'line-through' });
  });

  it('combines underline and strikethrough decorations', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: DEFAULT_TEXT_ALIGN,
          spans: [{ text: 'both', marks: { underline: true, strikethrough: true } }],
        },
      ],
    };

    render(<RichTextContent document={doc} />);

    expect(screen.getByText('both')).toHaveStyle({ textDecoration: 'underline line-through' });
  });

  it('renders highlighted spans as mark elements', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: DEFAULT_TEXT_ALIGN,
          spans: [{ text: 'glow', marks: { highlight: true } }],
        },
      ],
    };

    const { container } = render(<RichTextContent document={doc} />);

    const mark = container.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark).toHaveTextContent('glow');
  });

  it('renders color, font family and font size marks', () => {
    const doc: RichTextDocument = {
      blocks: [
        {
          type: 'paragraph',
          align: DEFAULT_TEXT_ALIGN,
          spans: [
            { text: 'red', marks: { color: '#ff0000' } },
            { text: 'arial', marks: { fontFamily: 'arial' } },
            { text: 'big', marks: { fontSize: 24 } },
          ],
        },
      ],
    };

    render(<RichTextContent document={doc} />);

    expect(screen.getByText('red')).toHaveStyle({ color: '#ff0000' });
    expect(screen.getByText('arial').style.fontFamily).toContain('Arial');
    expect(screen.getByText('big')).toHaveStyle({ fontSize: '24px' });
  });

  it('renders unmarked spans as plain text without wrapping elements', () => {
    const { container } = render(<RichTextContent document={paragraph('plain')} />);

    const paragraphNode = container.querySelector('p');
    expect(paragraphNode?.children).toHaveLength(0);
    expect(paragraphNode?.textContent).toBe('plain');
  });

  describe('inline mode', () => {
    it('renders only the first paragraph or heading block', () => {
      const doc: RichTextDocument = {
        blocks: [
          { type: 'heading', level: 2, align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'first' }] },
          { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'second' }] },
        ],
      };

      const { container } = render(<RichTextContent document={doc} mode="inline" />);

      expect(container.textContent).toBe('first');
      expect(container.querySelector('h2')).toBeNull();
      expect(container.querySelector('p')).toBeNull();
    });

    it('skips list blocks and renders the first text block', () => {
      const doc: RichTextDocument = {
        blocks: [
          {
            type: 'bulletList',
            items: [
              {
                type: 'listItem',
                content: [
                  { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'listed' }] },
                ],
              },
            ],
          },
          { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'title text' }] },
        ],
      };

      const { container } = render(<RichTextContent document={doc} mode="inline" />);

      expect(container.textContent).toBe('title text');
      expect(container.querySelector('ul')).toBeNull();
      expect(container.querySelector('li')).toBeNull();
    });

    it('returns null when the document has no text block', () => {
      const doc: RichTextDocument = {
        blocks: [
          {
            type: 'orderedList',
            items: [
              {
                type: 'listItem',
                content: [
                  { type: 'paragraph', align: DEFAULT_TEXT_ALIGN, spans: [{ text: 'only list' }] },
                ],
              },
            ],
          },
        ],
      };

      const { container } = render(<RichTextContent document={doc} mode="inline" />);

      expect(container).toBeEmptyDOMElement();
    });

    it('renders inline marks within the first block', () => {
      const doc: RichTextDocument = {
        blocks: [
          {
            type: 'paragraph',
            align: DEFAULT_TEXT_ALIGN,
            spans: [{ text: 'bold title', marks: { bold: true } }, { text: ' rest' }],
          },
        ],
      };

      const { container } = render(<RichTextContent document={doc} mode="inline" />);

      expect(screen.getByText('bold title')).toHaveStyle({ fontWeight: 700 });
      expect(container.textContent).toBe('bold title rest');
    });
  });
});
