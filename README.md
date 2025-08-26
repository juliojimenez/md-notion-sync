# md-notion-sync

A TypeScript/Node.js package to sync markdown files to Notion pages with proper formatting support.

## Features

- ✅ **Rich Formatting**: Supports headers, bold, italic, code blocks, lists, tables, quotes, and links
- 🧹 **Smart Link Filtering**: Automatically filters out relative links, anchor links, and images
- 🔄 **Batch Processing**: Handles large documents with efficient batch uploads
- 🎯 **Type Safety**: Built with TypeScript for better development experience
- 📦 **Multiple Interfaces**: Use as CLI tool, programmatic API, or GitHub Action
- 🚀 **Easy Setup**: Simple configuration with environment variables

## Installation

```bash
npm install md-notion-sync
```

For global CLI usage:
```bash
npm install -g md-notion-sync
```

## Quick Start

### CLI Usage

1. Initialize configuration:
```bash
md-notion-sync init
```

2. Edit the generated `.env` file with your Notion token:
```env
NOTION_TOKEN=your_notion_integration_token_here
```

3. Sync a markdown file:
```bash
md-notion-sync sync -f README.md -p your_notion_page_id
```

### Programmatic Usage

```typescript
import { syncMarkdownToNotion } from 'md-notion-sync';

await syncMarkdownToNotion({
  notionToken: 'your_notion_token',
  pageId: 'your_page_id', 
  filePath: './README.md',
  clearExisting: true // optional, defaults to true
});
```

### Advanced Usage

```typescript
import { NotionSync, MarkdownToNotion } from 'md-notion-sync';

// Create converter and sync instances
const converter = new MarkdownToNotion();
const sync = new NotionSync('your_token');

// Convert markdown to Notion blocks
const blocks = converter.convert(markdownContent);

// Add to Notion page
await sync.addBlocksToPage('page_id', blocks);
```

## GitHub Action Usage

Create `.github/workflows/sync-readme.yml`:

```yaml
name: Sync README to Notion
on:
  push:
    paths: ['README.md']

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install package
        run: npm install -g md-notion-sync
      
      - name: Sync to Notion
        run: md-notion-sync sync -f README.md -p ${{ secrets.NOTION_PAGE_ID }}
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
```

## Configuration

### Environment Variables

- `NOTION_TOKEN`: Your Notion integration token (required)
- `NOTION_PAGE_ID`: Default page ID to sync to (optional)

### CLI Options

```bash
md-notion-sync sync [options]

Options:
  -f, --file <path>     Path to markdown file (required)
  -p, --page-id <id>    Notion page ID (required)
  -t, --token <token>   Notion API token (or use NOTION_TOKEN env var)
  --no-clear            Don't clear existing content before syncing
  -h, --help            Display help for command
```

## Supported Markdown Features

| Feature | Support | Notes |
|---------|---------|-------|
| Headers (H1-H3) | ✅ | Converted to Notion heading blocks |
| **Bold** text | ✅ | Rich text formatting |
| *Italic* text | ✅ | Rich text formatting |
| `Inline code` | ✅ | Rich text formatting |
| Code blocks | ✅ | With language syntax highlighting |
| Lists (ordered/unordered) | ✅ | Nested lists supported |
| Tables | ✅ | With headers and formatting |
| > Blockquotes | ✅ | Converted to quote blocks |
| Links | ✅ | External links only |
| Images | ❌ | Filtered out (not supported by Notion API) |
| Horizontal rules | ✅ | Converted to divider blocks |

## Getting Your Notion Token

1. Go to [Notion Developers](https://www.notion.so/my-integrations)
2. Click "Create new integration"
3. Give it a name and select your workspace
4. Copy the "Internal Integration Token"
5. Share your target page with the integration

## Getting a Notion Page ID

The page ID is the string of characters after your workspace name and before any query parameters:

```
https://www.notion.so/workspace/Page-Title-HERE_IS_THE_PAGE_ID
```

## API Reference

### `syncMarkdownToNotion(options)`

Main sync function.

**Parameters:**
- `options.notionToken` (string): Notion API token
- `options.pageId` (string): Target Notion page ID  
- `options.filePath` (string): Path to markdown file
- `options.clearExisting` (boolean, optional): Clear existing content first (default: true)

### `MarkdownToNotion`

Converter class for transforming markdown to Notion blocks.

**Methods:**
- `convert(markdown: string): NotionBlock[]` - Convert markdown string to Notion blocks

### `NotionSync`

Notion API wrapper class.

**Methods:**
- `clearPageContent(pageId: string): Promise<void>` - Clear all blocks from a page
- `addBlocksToPage(pageId: string, blocks: NotionBlock[]): Promise<void>` - Add blocks to a page
- `syncMarkdownToNotion(options: SyncOptions): Promise<void>` - Full sync operation

## Error Handling

The package includes comprehensive error handling for:
- Invalid Notion tokens
- Missing or inaccessible files
- Network failures
- Notion API rate limits
- Invalid page IDs
