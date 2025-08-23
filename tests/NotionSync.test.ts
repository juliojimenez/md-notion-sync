import { NotionSync, NotionBlock } from '../src/index';
// import { Client } from '@notionhq/client';

// Mock the Notion client
jest.mock('@notionhq/client', () => {
  return {
    Client: jest.fn().mockImplementation(() => ({
      blocks: {
        children: {
          list: jest.fn(),
          append: jest.fn()
        },
        delete: jest.fn()
      }
    }))
  };
});

describe('NotionSync', () => {
  let notionSync: NotionSync;
  let mockNotionMethods: {
    list: jest.MockedFunction<any>;
    append: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create the NotionSync instance (which creates a mocked Client)
    notionSync = new NotionSync('mock-token');
    
    // Get references to the mocked methods for easier testing
    const mockClient = (notionSync as any).notion;
    mockNotionMethods = {
      list: mockClient.blocks.children.list,
      append: mockClient.blocks.children.append,
      delete: mockClient.blocks.delete
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('clearPageContent', () => {
    test('clears existing blocks successfully', async () => {
      const mockBlocks = [
        { id: 'block1', type: 'paragraph' },
        { id: 'block2', type: 'heading_1' }
      ];

      mockNotionMethods.list.mockResolvedValue({
        results: mockBlocks
      });

      mockNotionMethods.delete.mockResolvedValue({});

      await notionSync.clearPageContent('test-page-id');

      expect(mockNotionMethods.list).toHaveBeenCalledWith({
        block_id: 'test-page-id'
      });

      expect(mockNotionMethods.delete).toHaveBeenCalledTimes(2);
      expect(mockNotionMethods.delete).toHaveBeenCalledWith({
        block_id: 'block1'
      });
      expect(mockNotionMethods.delete).toHaveBeenCalledWith({
        block_id: 'block2'
      });
    });

    test('handles clear error gracefully', async () => {
      mockNotionMethods.list.mockRejectedValue(new Error('Access denied'));

      // Should not throw
      await expect(notionSync.clearPageContent('test-page-id')).resolves.toBeUndefined();
    });

    test('handles delete error gracefully', async () => {
      mockNotionMethods.list.mockResolvedValue({
        results: [{ id: 'block1' }]
      });

      mockNotionMethods.delete.mockRejectedValue(new Error('Delete failed'));

      // Should not throw during clearing
      await expect(notionSync.clearPageContent('test-page-id')).resolves.toBeUndefined();
    });
  });

  describe('addBlocksToPage', () => {
    test('adds blocks in batches', async () => {
      const blocks: NotionBlock[] = Array(75).fill(null).map((_, i) => ({
        object: 'block' as const,
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text' as const, text: { content: `Block ${i}` } }]
        }
      }));

      mockNotionMethods.append.mockResolvedValue({});

      await notionSync.addBlocksToPage('test-page-id', blocks);

      // Should call append twice (50 + 25 blocks)
      expect(mockNotionMethods.append).toHaveBeenCalledTimes(2);
      
      // First batch should have 50 blocks
      expect(mockNotionMethods.append).toHaveBeenNthCalledWith(1, {
        block_id: 'test-page-id',
        children: blocks.slice(0, 50)
      });

      // Second batch should have 25 blocks
      expect(mockNotionMethods.append).toHaveBeenNthCalledWith(2, {
        block_id: 'test-page-id',
        children: blocks.slice(50, 75)
      });
    });

    test('handles single batch correctly', async () => {
      const blocks: NotionBlock[] = Array(10).fill(null).map(() => ({
        object: 'block' as const,
        type: 'paragraph',
        paragraph: { rich_text: [] }
      }));

      mockNotionMethods.append.mockResolvedValue({});

      await notionSync.addBlocksToPage('test-page-id', blocks);

      expect(mockNotionMethods.append).toHaveBeenCalledTimes(1);
    });

    test('throws error on API failure', async () => {
      const blocks: NotionBlock[] = [{
        object: 'block' as const,
        type: 'paragraph',
        paragraph: { rich_text: [] }
      }];

      mockNotionMethods.append.mockRejectedValue(new Error('API Error'));

      await expect(notionSync.addBlocksToPage('test-page-id', blocks))
        .rejects.toThrow('API Error');
    });

    test('handles empty blocks array', async () => {
      await notionSync.addBlocksToPage('test-page-id', []);

      expect(mockNotionMethods.append).not.toHaveBeenCalled();
    });
  });

  describe('syncMarkdownToNotion', () => {
    beforeEach(() => {
      const mockFs = require('fs');
      jest.spyOn(mockFs, 'existsSync').mockReturnValue(true);
      jest.spyOn(mockFs, 'readFileSync').mockReturnValue('# Test\nContent here.');
      
      mockNotionMethods.list.mockResolvedValue({ results: [] });
      mockNotionMethods.append.mockResolvedValue({});
    });

    test('syncs markdown file successfully', async () => {
      const mockFs = require('fs');
      
      await notionSync.syncMarkdownToNotion({
        notionToken: 'test-token',
        pageId: 'test-page-id',
        filePath: './test.md'
      });

      expect(mockFs.existsSync).toHaveBeenCalledWith('./test.md');
      expect(mockFs.readFileSync).toHaveBeenCalledWith('./test.md', 'utf8');
      expect(mockNotionMethods.list).toHaveBeenCalled(); // Clear existing
      expect(mockNotionMethods.append).toHaveBeenCalled(); // Add new blocks
    });

    test('skips clearing when clearExisting is false', async () => {
      await notionSync.syncMarkdownToNotion({
        notionToken: 'test-token',
        pageId: 'test-page-id',
        filePath: './test.md',
        clearExisting: false
      });

      expect(mockNotionMethods.list).not.toHaveBeenCalled();
      expect(mockNotionMethods.append).toHaveBeenCalled();
    });

    test('throws error for non-existent file', async () => {
      const mockFs = require('fs');
      mockFs.existsSync.mockReturnValue(false);

      await expect(notionSync.syncMarkdownToNotion({
        notionToken: 'test-token',
        pageId: 'test-page-id',
        filePath: './nonexistent.md'
      })).rejects.toThrow('File not found: ./nonexistent.md');
    });

    test('throws error on file read failure', async () => {
      const mockFs = require('fs');
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(notionSync.syncMarkdownToNotion({
        notionToken: 'test-token',
        pageId: 'test-page-id',
        filePath: './test.md'
      })).rejects.toThrow('Permission denied');
    });

    test('handles Notion API errors', async () => {
      mockNotionMethods.append.mockRejectedValue(new Error('Notion API Error'));

      await expect(notionSync.syncMarkdownToNotion({
        notionToken: 'test-token',
        pageId: 'test-page-id',
        filePath: './test.md'
      })).rejects.toThrow('Notion API Error');
    });
  });

  describe('Integration Tests', () => {
    test('full pipeline from markdown to Notion blocks', async () => {
      const mockFs = require('fs');
      const complexMarkdown = `# Integration Test

This tests the **full pipeline** from markdown to Notion.

## Features Tested

- Markdown parsing
- Rich text formatting  
- Block creation

\`\`\`typescript
const result = await sync();
\`\`\`

> All tests should pass!`;

      mockFs.readFileSync.mockReturnValue(complexMarkdown);
      mockNotionMethods.list.mockResolvedValue({ results: [] });
      mockNotionMethods.append.mockResolvedValue({});

      await notionSync.syncMarkdownToNotion({
        notionToken: 'test-token',
        pageId: 'test-page-id',
        filePath: './integration.md'
      });

      // Verify the Notion API was called with the converted blocks
      expect(mockNotionMethods.append).toHaveBeenCalledTimes(1);
      
      const calledWith = mockNotionMethods.append.mock.calls[0][0];
      expect(calledWith.block_id).toBe('test-page-id');
      expect(calledWith.children).toBeDefined();
      expect(Array.isArray(calledWith.children)).toBe(true);
      expect(calledWith.children.length).toBeGreaterThan(5);
    });
  });
});
