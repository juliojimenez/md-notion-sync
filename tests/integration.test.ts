import { syncMarkdownToNotion, MarkdownToNotion } from '../src/index';
import fs from 'fs';
// import path from 'path';

// Mock external dependencies
jest.mock('@notionhq/client');
jest.mock('fs');

describe('Integration Tests', () => {
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(() => {
    mockFs = fs as jest.Mocked<typeof fs>;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('syncMarkdownToNotion function', () => {
    test('integrates converter and sync correctly', async () => {
      const testMarkdown = `# Test Document

This is a **test** document with:

- Lists
- Code: \`console.log()\`
- Links: [Example](https://example.com)

\`\`\`javascript
function test() {
  return 'hello';
}
\`\`\``;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(testMarkdown);

      // Mock the Notion client methods
      const { Client } = require('@notionhq/client');
      const mockNotionInstance = {
        blocks: {
          children: {
            list: jest.fn().mockResolvedValue({ results: [] }),
            append: jest.fn().mockResolvedValue({})
          },
          delete: jest.fn().mockResolvedValue({})
        }
      };
      Client.mockImplementation(() => mockNotionInstance);

      await syncMarkdownToNotion({
        notionToken: 'test-token',
        pageId: 'test-page-id',
        filePath: './test.md'
      });

      // Verify file operations
      expect(mockFs.existsSync).toHaveBeenCalledWith('./test.md');
      expect(mockFs.readFileSync).toHaveBeenCalledWith('./test.md', 'utf8');

      // Verify Notion operations
      expect(mockNotionInstance.blocks.children.list).toHaveBeenCalled();
      expect(mockNotionInstance.blocks.children.append).toHaveBeenCalled();

      // Verify the blocks were converted correctly
      const appendCall = mockNotionInstance.blocks.children.append.mock.calls[0][0];
      expect(appendCall.block_id).toBe('test-page-id');
      expect(appendCall.children).toBeDefined();
      expect(Array.isArray(appendCall.children)).toBe(true);
      expect(appendCall.children.length).toBeGreaterThan(0);
    });

    test('handles file not found error', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(syncMarkdownToNotion({
        notionToken: 'test-token',
        pageId: 'test-page-id',
        filePath: './missing.md'
      })).rejects.toThrow('File not found: ./missing.md');
    });

    test('propagates Notion API errors', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('# Test');

      const { Client } = require('@notionhq/client');
      const mockNotionInstance = {
        blocks: {
          children: {
            list: jest.fn().mockResolvedValue({ results: [] }),
            append: jest.fn().mockRejectedValue(new Error('Invalid page ID'))
          }
        }
      };
      Client.mockImplementation(() => mockNotionInstance);

      await expect(syncMarkdownToNotion({
        notionToken: 'test-token',
        pageId: 'invalid-page-id',
        filePath: './test.md'
      })).rejects.toThrow('Invalid page ID');
    });
  });

  describe('End-to-End Scenarios', () => {
    test('processes real README-style content', async () => {
      const readmeContent = `# My Project

A TypeScript library for awesome things.

## Installation

\`\`\`bash
npm install my-project
\`\`\`

## Quick Start

\`\`\`typescript
import { MyClass } from 'my-project';

const instance = new MyClass();
await instance.doSomething();
\`\`\`

## Features

- ✅ Type safety
- 🚀 Fast performance  
- 📦 Easy integration
- 🔧 Configurable

## API Reference

| Method | Parameters | Returns |
|--------|------------|---------|
| \`doSomething()\` | none | Promise<void> |
| \`configure()\` | options: Config | void |

## Configuration

> **Note**: Configuration is optional but recommended.

---

## License

MIT License - see [LICENSE](./LICENSE) file.`;

      const converter = new MarkdownToNotion();
      const blocks = converter.convert(readmeContent);

      // Verify overall structure
      expect(blocks.length).toBeGreaterThan(10);
      
      // Check specific block types are present
      const blockTypes = blocks.map(block => block.type);
      expect(blockTypes).toContain('heading_1');
      expect(blockTypes).toContain('heading_2');
      expect(blockTypes).toContain('code');
      expect(blockTypes).toContain('bulleted_list_item');
      expect(blockTypes).toContain('table');
      expect(blockTypes).toContain('quote');
      expect(blockTypes).toContain('divider');

      // Verify rich text formatting is preserved
      const hasFormattedText = blocks.some(block => {
        if (block.type === 'paragraph' && block.paragraph?.rich_text) {
          return block.paragraph.rich_text.some((rt: any) => 
            rt.annotations?.bold || rt.annotations?.italic || rt.annotations?.code
          );
        }
        return false;
      });
      expect(hasFormattedText).toBe(true);
    });

    test('handles empty and whitespace-only content', () => {
      const converter = new MarkdownToNotion();
      
      expect(converter.convert('')).toHaveLength(0);
      expect(converter.convert('   \n\n   ')).toHaveLength(0);
      expect(converter.convert('\t\t\n\n\t')).toHaveLength(0);
    });

    test('processes large documents efficiently', () => {
      const converter = new MarkdownToNotion();
      
      // Create a large document
      const sections = Array(100).fill(null).map((_, i) => `
## Section ${i}

This is content for section ${i} with some **formatting**.

- Item 1 for section ${i}
- Item 2 for section ${i}

\`\`\`javascript
// Code block ${i}
console.log('Section ${i}');
\`\`\`
`).join('\n');

      const largeMarkdown = `# Large Document\n${sections}`;
      
      const startTime = Date.now();
      const blocks = converter.convert(largeMarkdown);
      const endTime = Date.now();

      expect(blocks.length).toBeGreaterThan(400); // Lots of blocks
      expect(endTime - startTime).toBeLessThan(2000); // Should be fast
    });
  });

  describe('Error Recovery', () => {
    test('handles malformed tables gracefully', () => {
      const converter = new MarkdownToNotion();
      const malformedTable = `| Header 1 | Header 2
Missing separator row
| Cell 1 | Cell 2 |`;

      const blocks = converter.convert(malformedTable);
      
      // Should fallback to paragraph blocks instead of crashing
      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks.every(block => block.object === 'block')).toBe(true);
    });

    test('handles unclosed formatting gracefully', () => {
      const converter = new MarkdownToNotion();
      const malformedMarkdown = `**This bold is unclosed
*This italic is unclosed
\`This code is unclosed
[This link is malformed(missing closing bracket`;

      const blocks = converter.convert(malformedMarkdown);
      
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('paragraph');
      expect(blocks[0].paragraph.rich_text.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world Content Patterns', () => {
    test('handles GitHub README badges and shields', () => {
      const converter = new MarkdownToNotion();
      const badgeMarkdown = `# Project
      
[![Build Status](https://travis-ci.org/user/repo.svg?branch=main)](https://travis-ci.org/user/repo)
[![npm version](https://badge.fury.io/js/package.svg)](https://badge.fury.io/js/package)

Some description here.`;

      const blocks = converter.convert(badgeMarkdown);
      
      // Should filter out badge images but keep the description
      expect(blocks.some(block => 
        block.type === 'paragraph' && 
        block.paragraph?.rich_text?.some((rt: any) => 
          rt.text.content.includes('description')
        )
      )).toBe(true);
    });

    test('handles emoji and unicode correctly', () => {
      const converter = new MarkdownToNotion();
      const emojiMarkdown = `# 🚀 Project Name

Features:
- ✅ Works great
- 🔧 Easy config
- 📦 Simple install

## 日本語 Support

Works with 中文, العربية, and Русский text.`;

      const blocks = converter.convert(emojiMarkdown);
      
      expect(blocks[0].heading_1.rich_text[0].text.content).toBe('🚀 Project Name');
      
      const unicodeBlock = blocks.find(block => 
        block.type === 'heading_2' && 
        block.heading_2?.rich_text?.[0]?.text?.content?.includes('日本語')
      );
      expect(unicodeBlock).toBeDefined();
    });

    test('handles complex nested markdown', () => {
      const converter = new MarkdownToNotion();
      const complexMarkdown = `# API Documentation

## Authentication

To authenticate, use **Bearer tokens**:

\`\`\`bash
curl -H "Authorization: Bearer TOKEN" https://api.example.com
\`\`\`

### Rate Limits

| Endpoint | Rate Limit | Note |
|----------|------------|------|
| \`/users\` | 100/hour | *Per user* |
| \`/data\` | 1000/hour | **Global limit** |

> **Important**: Rate limits reset at midnight UTC.

---

## Error Codes

Common errors you might encounter:

1. **401 Unauthorized** - Invalid or missing token
2. **429 Too Many Requests** - Rate limit exceeded
3. **500 Internal Error** - Server issue

For more help, contact [support](https://support.example.com).`;

      const blocks = converter.convert(complexMarkdown);
      
      // Should handle all the different elements
      const blockTypes = blocks.map(block => block.type);
      expect(blockTypes).toContain('heading_1');
      expect(blockTypes).toContain('heading_2');
      expect(blockTypes).toContain('heading_3');
      expect(blockTypes).toContain('code');
      expect(blockTypes).toContain('table');
      expect(blockTypes).toContain('quote');
      expect(blockTypes).toContain('divider');
      expect(blockTypes).toContain('numbered_list_item');
      
      // Verify rich text formatting is preserved
      const hasLinks = blocks.some(block => 
        block.paragraph?.rich_text?.some((rt: any) => rt.text.link)
      );
      expect(hasLinks).toBe(true);
    });
  });
});
