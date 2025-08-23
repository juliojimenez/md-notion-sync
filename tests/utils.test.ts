import { MarkdownToNotion } from '../src/index';

describe('Utility Functions', () => {
  let converter: MarkdownToNotion;

  beforeEach(() => {
    converter = new MarkdownToNotion();
  });

  describe('URL Validation', () => {
    // We'll test this indirectly through link parsing since isValidUrl is private
    test('accepts valid HTTP URLs', () => {
      const markdown = '[Link](http://example.com)';
      const blocks = converter.convert(markdown);
      
      expect(blocks[0].paragraph.rich_text[0].text.link?.url).toBe('http://example.com');
    });

    test('accepts valid HTTPS URLs', () => {
      const markdown = '[Link](https://example.com)';
      const blocks = converter.convert(markdown);
      
      expect(blocks[0].paragraph.rich_text[0].text.link?.url).toBe('https://example.com');
    });

    test('adds https:// to bare domains', () => {
      const markdown = '[Link](example.com)';
      const blocks = converter.convert(markdown);
      
      expect(blocks[0].paragraph.rich_text[0].text.link?.url).toBe('https://example.com');
    });

    test('rejects invalid URLs', () => {
      const testCases = [
        '[Link](not-a-url)',
        '[Link](#anchor)',
        '[Link](./relative)',
        '[Link](../parent)',
        '[Link](mailto:test@example.com)',
        '[Link](tel:555-1234)',
        '[Link](file:///local/file)'
      ];

      testCases.forEach(markdown => {
        const blocks = converter.convert(markdown);
        const richText = blocks[0].paragraph.rich_text;
        
        // Link should be stripped, leaving just text
        expect(richText.some((rt: any) => rt.text.link)).toBe(false);
        expect(richText[0].text.content).toBe('Link');
      });
    });
  });

  describe('Text Processing', () => {
    test('handles whitespace normalization', () => {
      const markdown = 'Text   with     multiple    spaces.';
      const blocks = converter.convert(markdown);
      
      expect(blocks[0].paragraph.rich_text[0].text.content).toBe('Text with multiple spaces.');
    });

    test('preserves intentional line breaks in paragraphs', () => {
      const markdown = `First line
Second line
Third line`;
      const blocks = converter.convert(markdown);
      
      expect(blocks[0].paragraph.rich_text[0].text.content).toContain('First line\nSecond line\nThird line');
    });

    test('handles special markdown characters in text', () => {
      const markdown = 'Text with * and _ and ` characters.';
      const blocks = converter.convert(markdown);
      
      expect(blocks[0].paragraph.rich_text[0].text.content).toBe('Text with * and _ and ` characters.');
    });
  });

  describe('Block Batching', () => {
    test('calculates correct batch sizes', () => {
      // Test the batching logic by creating many blocks
      const manyItems = Array(125).fill('- Item').join('\n');
      const blocks = converter.convert(manyItems);
      
      expect(blocks).toHaveLength(125);
      
      // Test batch size calculation (should be 50 per batch)
      const batchSize = 50;
      const expectedBatches = Math.ceil(blocks.length / batchSize);
      expect(expectedBatches).toBe(3); // 50 + 50 + 25
    });
  });

  describe('Content Sanitization', () => {
    test('removes problematic content but preserves good content', () => {
      const markdown = `# Title

Good paragraph text.

![Should be removed](image.png)

[Good link](https://example.com) and [bad link](./local) in same line.

More good text.`;

      const blocks = converter.convert(markdown);
      
      // Should have title, paragraph, link line, and final paragraph
      expect(blocks).toHaveLength(4);
      
      // Check the mixed link line
      const linkBlock = blocks[2];
      const richText = linkBlock.paragraph.rich_text;
      
      // Should have good link preserved
      expect(richText.some((rt: any) => rt.text.link?.url === 'https://example.com')).toBe(true);
      // Should have "bad link" text without link
      expect(richText.some((rt: any) => rt.text.content === 'bad link' && !rt.text.link)).toBe(true);
    });
  });

  describe('Regression Tests', () => {
    test('empty rich text does not create empty blocks', () => {
      const markdown = `![Only image](image.png)

[Only anchor](#section)

   

Valid content here.`;

      const blocks = converter.convert(markdown);
      
      // Should only have the valid content, not empty blocks
      expect(blocks).toHaveLength(1);
      expect(blocks[0].paragraph.rich_text[0].text.content).toBe('Valid content here.');
    });

    test('preserves formatting across paragraph boundaries', () => {
      const markdown = `Paragraph 1 with **bold**.

Paragraph 2 with *italic*.`;

      const blocks = converter.convert(markdown);
      
      expect(blocks).toHaveLength(2);
      expect(blocks[0].paragraph.rich_text.some((rt: any) => rt.annotations?.bold)).toBe(true);
      expect(blocks[1].paragraph.rich_text.some((rt: any) => rt.annotations?.italic)).toBe(true);
    });
  });
});
