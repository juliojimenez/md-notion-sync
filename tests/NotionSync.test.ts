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

// Mock fs properly
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('NotionSync', () => {
  let notionSync: NotionSync;
  let mockNotionMethods: {
    list: jest.MockedFunction<any>;
    append: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
  };
  let mockFs: {
    existsSync: jest.MockedFunction<any>;
    readFileSync: jest.MockedFunction<any>;
    writeFileSync: jest.MockedFunction<any>;
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

    // Get fs mock references
    mockFs = require('fs');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ... (keep all existing clearPageContent and addBlocksToPage tests as-is)

  describe('syncMarkdownToNotion', () => {
    beforeEach(() => {
      // Set up default fs mocks for this describe block
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('# Test\nContent here.');
      
      mockNotionMethods.list.mockResolvedValue({ results: [] });
      mockNotionMethods.append.mockResolvedValue({});
    });

    test('syncs markdown file successfully', async () => {
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
      mockFs.existsSync.mockReturnValue(false);

      await expect(notionSync.syncMarkdownToNotion({
        notionToken: 'test-token',
        pageId: 'test-page-id',
        filePath: './nonexistent.md'
      })).rejects.toThrow('File not found: ./nonexistent.md');
    });

    test('throws error on file read failure', async () => {
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

      // Set up the fs mock for this specific test
      mockFs.existsSync.mockReturnValue(true);
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
