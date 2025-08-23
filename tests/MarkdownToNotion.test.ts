import { MarkdownToNotion } from '../src/index';

describe('MarkdownToNotion', () => {
  let converter: MarkdownToNotion;

  beforeEach(() => {
    converter = new MarkdownToNotion();
  });

  describe('Basic Formatting', () => {
    test('converts simple paragraphs', () => {
      const markdown = 'This is a simple paragraph.';
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'This is a simple paragraph.' }
            }
          ]
        }
      });
    });

    test('converts multiple paragraphs', () => {
      const markdown = `First paragraph.

Second paragraph with more text.`;
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('paragraph');
      expect(blocks[1].type).toBe('paragraph');
    });

    test('skips empty lines', () => {
      const markdown = `First paragraph.



Second paragraph.`;
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('paragraph');
      expect(blocks[1].type).toBe('paragraph');
    });
  });

  describe('Headers', () => {
    test('converts H1 headers', () => {
      const markdown = '# Main Title';
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'Main Title' }
            }
          ]
        }
      });
    });

    test('converts H2 and H3 headers', () => {
      const markdown = `## Section Title
### Subsection Title`;
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(2);
      expect(blocks[0].type).toBe('heading_2');
      expect(blocks[1].type).toBe('heading_3');
    });

    test('limits headers to H3 maximum', () => {
      const markdown = '#### Deep Header';
      const blocks = converter.convert(markdown);

      expect(blocks[0].type).toBe('heading_3');
    });
  });

  describe('Rich Text Formatting', () => {
    test('converts bold text', () => {
      const markdown = 'This is **bold** text.';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text).toEqual([
        { type: 'text', text: { content: 'This is ' } },
        { type: 'text', text: { content: 'bold' }, annotations: { bold: true } },
        { type: 'text', text: { content: ' text.' } }
      ]);
    });

    test('converts italic text', () => {
      const markdown = 'This is *italic* text.';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text).toEqual([
        { type: 'text', text: { content: 'This is ' } },
        { type: 'text', text: { content: 'italic' }, annotations: { italic: true } },
        { type: 'text', text: { content: ' text.' } }
      ]);
    });

    test('converts inline code', () => {
      const markdown = 'Use `console.log()` for debugging.';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text).toEqual([
        { type: 'text', text: { content: 'Use ' } },
        { type: 'text', text: { content: 'console.log()' }, annotations: { code: true } },
        { type: 'text', text: { content: ' for debugging.' } }
      ]);
    });

    test('converts multiple formatting in one line', () => {
      const markdown = 'This is **bold** and *italic* and `code`.';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text).toEqual([
        { type: 'text', text: { content: 'This is ' } },
        { type: 'text', text: { content: 'bold' }, annotations: { bold: true } },
        { type: 'text', text: { content: ' and ' } },
        { type: 'text', text: { content: 'italic' }, annotations: { italic: true } },
        { type: 'text', text: { content: ' and ' } },
        { type: 'text', text: { content: 'code' }, annotations: { code: true } },
        { type: 'text', text: { content: '.' } }
      ]);
    });
  });

  describe('Links', () => {
    test('converts valid external links', () => {
      const markdown = 'Visit [Google](https://google.com) for search.';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text).toEqual([
        { type: 'text', text: { content: 'Visit ' } },
        { type: 'text', text: { content: 'Google', link: { url: 'https://google.com' } } },
        { type: 'text', text: { content: ' for search.' } }
      ]);
    });

    test('adds https:// to domain-only links', () => {
      const markdown = 'Visit [Example](example.com) here.';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text[1].text.link?.url).toBe('https://example.com');
    });

    test('filters out anchor links', () => {
      const markdown = 'Go to [section](#header) below.';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text).toEqual([
        { type: 'text', text: { content: 'Go to  below.' } }
      ]);
    });

    test('filters out relative path links', () => {
      const markdown = 'See [docs](./docs/guide.md) for more.';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text).toEqual([
        { type: 'text', text: { content: 'See  for more.' } }
      ]);
    });

    test('filters out images', () => {
      const markdown = 'Here is an image: ![alt text](image.png)';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text).toEqual([
        { type: 'text', text: { content: 'Here is an image: ' } }
      ]);
    });

    test('filters out nested image-links', () => {
      const markdown = 'Click [![badge](badge.png)](https://example.com) here.';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text).toEqual([
        { type: 'text', text: { content: 'Click  here.' } }
      ]);
    });
  });

  describe('Code Blocks', () => {
    test('converts basic code blocks', () => {
      const markdown = `\`\`\`javascript
console.log('Hello World');
\`\`\``;
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: "console.log('Hello World');" } }],
          language: 'javascript'
        }
      });
    });

    test('handles code blocks without language', () => {
      const markdown = `\`\`\`
plain text code
\`\`\``;
      const blocks = converter.convert(markdown);

      expect(blocks[0].code.language).toBe('plain text');
    });

    test('splits large code blocks', () => {
      const largeCode = 'a'.repeat(2500); // Larger than 2000 char limit
      const markdown = `\`\`\`
${largeCode}
\`\`\``;
      const blocks = converter.convert(markdown);

      expect(blocks.length).toBeGreaterThan(1);
      expect(blocks[0].type).toBe('code');
      expect(blocks[1].type).toBe('code');
    });
  });

  describe('Lists', () => {
    test('converts unordered lists', () => {
      const markdown = `- First item
- Second item
- Third item`;
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(3);
      blocks.forEach(block => {
        expect(block.type).toBe('bulleted_list_item');
        expect(block.bulleted_list_item).toHaveProperty('rich_text');
      });
    });

    test('converts ordered lists', () => {
      const markdown = `1. First item
2. Second item
3. Third item`;
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(3);
      blocks.forEach(block => {
        expect(block.type).toBe('numbered_list_item');
        expect(block.numbered_list_item).toHaveProperty('rich_text');
      });
    });

    test('handles mixed list markers', () => {
      const markdown = `* Item with asterisk
- Item with dash
+ Item with plus`;
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(3);
      blocks.forEach(block => {
        expect(block.type).toBe('bulleted_list_item');
      });
    });

    test('skips empty list items', () => {
      const markdown = `- First item
- 
- Third item`;
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(2);
      expect(blocks[0].bulleted_list_item.rich_text[0].text.content).toContain('First');
      expect(blocks[1].bulleted_list_item.rich_text[0].text.content).toContain('Third');
    });
  });

  describe('Tables', () => {
    test('converts basic tables', () => {
      const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`;
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('table');
      expect(blocks[0].table.table_width).toBe(2);
      expect(blocks[0].table.has_column_header).toBe(true);
      expect(blocks[0].table.children).toHaveLength(3); // Header + 2 rows
    });

    test('handles tables with formatting', () => {
      const markdown = `| **Bold** | *Italic* |
|----------|----------|
| \`code\`   | [link](https://example.com) |`;
      const blocks = converter.convert(markdown);

      const table = blocks[0].table;
      const headerRow = table.children[0].table_row.cells;
      
      expect(headerRow[0][0].annotations.bold).toBe(true);
      expect(headerRow[1][0].annotations.italic).toBe(true);
    });

    test('ignores table separator rows', () => {
      const markdown = `| A | B |
|---|---|
| 1 | 2 |`;
      const blocks = converter.convert(markdown);

      expect(blocks[0].table.children).toHaveLength(2); // Only header + data row
    });
  });

  describe('Other Block Types', () => {
    test('converts blockquotes', () => {
      const markdown = '> This is a quote';
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'This is a quote' }
            }
          ]
        }
      });
    });

    test('converts horizontal rules', () => {
      const markdown = '---';
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toEqual({
        object: 'block',
        type: 'divider',
        divider: {}
      });
    });

    test('handles different horizontal rule styles', () => {
      const markdown = `***
___
---`;
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(3);
      blocks.forEach(block => {
        expect(block.type).toBe('divider');
      });
    });
  });

  describe('Complex Documents', () => {
    test('converts mixed content document', () => {
      const markdown = `# Main Title

This is a paragraph with **bold** and *italic* text.

## Code Example

\`\`\`javascript
function hello() {
  return 'world';
}
\`\`\`

### Features

- Feature 1
- Feature 2

> Important note here

---

| Feature | Status |
|---------|--------|
| Auth    | ✅ Done |
| Tests   | 🚧 WIP |`;

      const blocks = converter.convert(markdown);

      const expectedTypes = [
        'heading_1',     // # Main Title
        'paragraph',     // paragraph with formatting
        'heading_2',     // ## Code Example  
        'code',          // ```javascript block
        'heading_3',     // ### Features
        'bulleted_list_item', // - Feature 1
        'bulleted_list_item', // - Feature 2
        'quote',         // > Important note
        'divider',       // ---
        'table'          // | Feature | Status |
      ];

      expect(blocks).toHaveLength(expectedTypes.length);
      blocks.forEach((block, index) => {
        expect(block.type).toBe(expectedTypes[index]);
      });
    });

    test('handles README-style document', () => {
      const markdown = `# My Project

A description of my project.

## Installation

\`\`\`bash
npm install my-project
\`\`\`

## Features

- Easy to use
- Well documented
- **Fast** performance

## License

MIT License`;

      const blocks = converter.convert(markdown);
      
      expect(blocks.length).toBeGreaterThan(5);
      expect(blocks[0].type).toBe('heading_1');
      expect(blocks.some(block => block.type === 'code')).toBe(true);
      expect(blocks.some(block => block.type === 'bulleted_list_item')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('handles empty markdown', () => {
      const markdown = '';
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(0);
    });

    test('handles whitespace-only markdown', () => {
      const markdown = '   \n\n   \n   ';
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(0);
    });

    test('handles malformed markdown gracefully', () => {
      const markdown = `**unclosed bold
*unclosed italic
\`unclosed code
[unclosed link(missing bracket`;
      const blocks = converter.convert(markdown);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('paragraph');
    });

    test('preserves special characters', () => {
      const markdown = 'Symbols: & < > " \' @ # $ %';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text[0].text.content).toBe('Symbols: & < > " \' @ # $ %');
    });

    test('handles unicode characters', () => {
      const markdown = 'Unicode: 🚀 ✅ 📝 こんにちは';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text[0].text.content).toBe('Unicode: 🚀 ✅ 📝 こんにちは');
    });
  });

  describe('Link Filtering', () => {
    test('preserves external HTTP links', () => {
      const markdown = '[External](http://example.com)';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text[0].text.link?.url).toBe('http://example.com');
    });

    test('preserves external HTTPS links', () => {
      const markdown = '[Secure](https://example.com)';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text[0].text.link?.url).toBe('https://example.com');
    });

    test('filters mailto links', () => {
      const markdown = 'Email [me](mailto:test@example.com) here.';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text).toEqual([
        { type: 'text', text: { content: 'Email ' } },
        { type: 'text', text: { content: 'me' } },
        { type: 'text', text: { content: ' here.' } }
      ]);
    });

    test('filters tel links', () => {
      const markdown = 'Call [us](tel:555-1234) now.';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text[1].text).not.toHaveProperty('link');
    });

    test('filters file protocol links', () => {
      const markdown = 'Open [file](file:///path/to/file.txt) locally.';
      const blocks = converter.convert(markdown);

      expect(blocks[0].paragraph.rich_text[1].text).not.toHaveProperty('link');
    });
  });

  describe('Performance', () => {
    test('handles large documents efficiently', () => {
      const largeMarkdown = Array(1000).fill('- List item with some text').join('\n');
      
      const startTime = Date.now();
      const blocks = converter.convert(largeMarkdown);
      const endTime = Date.now();

      expect(blocks).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('handles deeply nested content', () => {
      const markdown = `# H1
## H2
### H3
#### H4 (should become H3)

Paragraph with **bold**, *italic*, and \`code\`.

- List item 1
  - Nested would be here but Notion doesn't support it
- List item 2

> Quote with **formatting**

\`\`\`python
def function():
    return "test"
\`\`\``;

      const blocks = converter.convert(markdown);
      
      expect(blocks.length).toBeGreaterThan(5);
      expect(blocks.every(block => block.object === 'block')).toBe(true);
    });
  });
});
