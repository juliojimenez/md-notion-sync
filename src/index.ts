import { Client } from '@notionhq/client';
import fs from 'fs';
// import path from 'path';

// Define compatible types for Notion blocks
export interface NotionRichText {
  type: 'text';
  text: {
    content: string;
    link?: { url: string };
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    color?: string;
  };
}

export interface NotionBlock {
  object: 'block';
  type: string;
  [key: string]: any;
}

export interface SyncOptions {
  notionToken: string;
  pageId: string;
  filePath: string;
  clearExisting?: boolean;
}

export interface RichTextElement {
  type: 'text';
  text: {
    content: string;
    link?: { url: string };
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
  };
}

export class MarkdownToNotion {
  private blocks: NotionBlock[] = [];

  private isValidUrl(url: string): string | false {
    if (!url || typeof url !== 'string') return false;
    
    // Handle anchor links, relative URLs, and other non-web URLs
    if (url.startsWith('#') || url.startsWith('./') || url.startsWith('../') || 
        url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('file:')) {
      return false; // Skip these types of links
    }
    
    // Ensure URL has a protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      if (url.includes('.') && !url.includes(' ') && url.length > 3) {
        url = 'https://' + url; // Add https:// to domain-like strings
      } else {
        return false; // Skip invalid URLs
      }
    }
    
    try {
      new URL(url);
      return url;
    } catch {
      return false;
    }
  }

  private parseRichText(text: string): RichTextElement[] {
    const richText: RichTextElement[] = [];
    // First pass: remove unwanted link types completely
    let processedText = text;
    
    console.log('Original text:', text);
    
    // More comprehensive regex patterns for removal
    // Remove nested image-links: [![alt](img-url)](link-url)
    processedText = processedText.replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, '');
    
    // Remove standalone images: ![alt](url)
    processedText = processedText.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
    
    // Remove anchor links: [text](#anchor)
    processedText = processedText.replace(/\[[^\]]+\]\(#[^)]*\)/g, '');
    
    // Remove relative path links: [text](./path) or [text](../path)
    processedText = processedText.replace(/\[[^\]]+\]\(\.{0,2}\/[^)]*\)/g, '');
    
    // Clean up any double spaces and trim
    processedText = processedText.replace(/\s+/g, ' ').trim();
    
    console.log('Final processed text:', processedText);
    
    // If after all removals the text is empty or just whitespace, return empty array
    if (!processedText || processedText.trim() === '') {
      return [];
    }
    
    // Now process remaining formatting (bold, italic, code, valid links)
    const parts = processedText.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`|\[[^\]]+?\]\([^)]+?\))/);
    
    for (const part of parts) {
      if (!part) continue;
      
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold text
        const content = part.slice(2, -2);
        if (content) {
          richText.push({
            type: 'text',
            text: { content },
            annotations: { bold: true }
          });
        }
      } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        // Italic text
        const content = part.slice(1, -1);
        if (content) {
          richText.push({
            type: 'text',
            text: { content },
            annotations: { italic: true }
          });
        }
      } else if (part.startsWith('`') && part.endsWith('`')) {
        // Inline code
        const content = part.slice(1, -1);
        if (content) {
          richText.push({
            type: 'text',
            text: { content },
            annotations: { code: true }
          });
        }
      } else if (part.match(/\[([^\]]+)\]\(([^)]+)\)/)) {
        // Links - but only valid ones
        const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
        const linkText = linkMatch[1];
        const linkUrl = linkMatch[2];
        
        // Double-check that this isn't an unwanted link type
        if (!linkUrl.startsWith('#') && 
            !linkUrl.startsWith('./') && 
            !linkUrl.startsWith('../') &&
            this.isValidUrl(linkUrl)) {
          richText.push({
            type: 'text',
            text: { content: linkText, link: { url: linkUrl } }
          });
        } else {
          // If it's an unwanted link, just add the text content
          richText.push({
            type: 'text',
            text: { content: linkText }
          });
        }
      } else {
        // Plain text
        if (part.trim()) {
          richText.push({
            type: 'text',
            text: { content: part }
          });
        }
      }
    }
    
    return richText;
  }

  private parseTable(tableLines: string[]): NotionBlock | null {
    const rows = tableLines.filter(line => line.trim() && !line.match(/^\|[\s\-|:]+\|$/));
    if (rows.length < 2) return null;
    
    const parseRow = (row: string) => {
      return row.split('|')
        .map(cell => cell.trim())
        .filter(cell => cell)
        .map(cell => this.parseRichText(cell));
    };
    
    const headerRow = parseRow(rows[0]);
    const bodyRows = rows.slice(1).map(parseRow);
    
    return {
      object: 'block',
      type: 'table',
      table: {
        table_width: headerRow.length,
        has_column_header: true,
        has_row_header: false,
        children: [
          {
            object: 'block',
            type: 'table_row',
            table_row: {
              cells: headerRow
            }
          },
          ...bodyRows.map(row => ({
            object: 'block',
            type: 'table_row',
            table_row: {
              cells: row
            }
          }))
        ]
      }
    };
  }

  private parseCodeBlock(lines: string[], startIndex: number): { blocks: NotionBlock[]; endIndex: number } {
    let endIndex = startIndex + 1;
    const language = lines[startIndex].replace(/^```/, '').trim() || 'plain text';
    const codeContent: string[] = [];
    
    while (endIndex < lines.length && !lines[endIndex].startsWith('```')) {
      codeContent.push(lines[endIndex]);
      endIndex++;
    }
    
    const content = codeContent.join('\n');
    if (content.length > 2000) {
      // Split large code blocks
      const chunks: string[] = [];
      for (let i = 0; i < content.length; i += 1900) {
        chunks.push(content.substring(i, i + 1900));
      }
      
      return {
        blocks: chunks.map(chunk => ({
          object: 'block',
          type: 'code',
          code: {
            rich_text: [{ type: 'text', text: { content: chunk } }],
            language: language
          }
        })),
        endIndex: endIndex + 1
      };
    }
    
    return {
      blocks: [{
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content } }],
          language: language
        }
      }],
      endIndex: endIndex + 1
    };
  }

  private parseList(lines: string[], startIndex: number, isOrdered = false): { blocks: NotionBlock[]; endIndex: number } {
    const items: NotionBlock[] = [];
    let currentIndex = startIndex;
    
    while (currentIndex < lines.length) {
      const line = lines[currentIndex].trim();
      const listPattern = isOrdered ? /^\d+\.\s+/ : /^[*\-+]\s+/;
      
      if (!listPattern.test(line)) break;
      
      const content = line.replace(listPattern, '');

      // Skip empty list items
      if (!content.trim()) {
        currentIndex++;
        continue;
      }
      const richText = this.parseRichText(content);

      // Only add list item if it has content after processing
      if (richText.length > 0) {
        items.push({
          object: 'block',
          type: isOrdered ? 'numbered_list_item' : 'bulleted_list_item',
          [isOrdered ? 'numbered_list_item' : 'bulleted_list_item']: {
            rich_text: richText
          }
        });
      }
      
      currentIndex++;
    }
    
    return {
      blocks: items,
      endIndex: currentIndex
    };
  }

  public convert(markdown: string): NotionBlock[] {
    const lines = markdown.split('\n');
    const blocks: NotionBlock[] = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        i++;
        continue;
      }
      
      // Headers
      if (line.match(/^#{1,6}\s+/)) {
        const level = line.match(/^#+/)![0].length;
        const content = line.replace(/^#+\s+/, '');
        const headingType = `heading_${Math.min(level, 3)}`;
        
        blocks.push({
          object: 'block',
          type: headingType,
          [headingType]: {
            rich_text: this.parseRichText(content)
          }
        });
        i++;
      }
      // Code blocks
      else if (line.startsWith('```')) {
        const result = this.parseCodeBlock(lines, i);
        blocks.push(...result.blocks);
        i = result.endIndex;
      }
      // Tables (detect by pipe characters)
      else if (line.includes('|') && lines[i + 1] && lines[i + 1].includes('|')) {
        const tableLines: string[] = [];
        let tableIndex = i;
        
        while (tableIndex < lines.length && lines[tableIndex].includes('|')) {
          tableLines.push(lines[tableIndex]);
          tableIndex++;
        }
        
        const table = this.parseTable(tableLines);
        if (table) {
          blocks.push(table);
          i = tableIndex;
        } else {
          // Fallback to paragraph if table parsing fails
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: this.parseRichText(line)
            }
          });
          i++;
        }
      }
      // Ordered lists
      else if (line.match(/^\d+\.\s+/)) {
        const result = this.parseList(lines, i, true);
        blocks.push(...result.blocks);
        i = result.endIndex;
      }
      // Unordered lists
      else if (line.match(/^[*\-+]\s+/)) {
        const result = this.parseList(lines, i, false);
        blocks.push(...result.blocks);
        i = result.endIndex;
      }
      // Blockquotes
      else if (line.startsWith('> ')) {
        const content = line.replace(/^>\s*/, '');
        blocks.push({
          object: 'block',
          type: 'quote',
          quote: {
            rich_text: this.parseRichText(content)
          }
        });
        i++;
      }
      // Horizontal rules
      else if (line.match(/^[-*_]{3,}$/)) {
        blocks.push({
          object: 'block',
          type: 'divider',
          divider: {}
        });
        i++;
      }
      // Regular paragraphs
      else {
        // Collect consecutive lines for the paragraph
        const paragraphLines = [line];
        let nextIndex = i + 1;
        
        while (nextIndex < lines.length) {
          const nextLine = lines[nextIndex].trim();
          if (!nextLine || 
              nextLine.match(/^#{1,3}\s+/) ||
              nextLine.startsWith('```') ||
              nextLine.includes('|') ||
              nextLine.match(/^\d+\.\s+/) ||
              nextLine.match(/^[*\-+]\s+/) ||
              nextLine.startsWith('> ') ||
              nextLine.match(/^[-*_]{3,}$/)) {
            break;
          }
          paragraphLines.push(nextLine);
          nextIndex++;
        }
        
        const paragraphContent = paragraphLines.join('\n');
        const richText = this.parseRichText(paragraphContent);
        
        // Only add paragraph if it has content after processing
        if (richText.length > 0) {
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: richText
            }
          });
        }
        
        i = nextIndex;
      }
    }
    return blocks;
  }
}

export class NotionSync {
  private notion: Client;

  constructor(token: string) {
    this.notion = new Client({ auth: token });
  }

  async clearPageContent(pageId: string): Promise<void> {
    try {
      const response = await this.notion.blocks.children.list({
        block_id: pageId
      });
      
      for (const block of response.results) {
        await this.notion.blocks.delete({
          block_id: block.id
        });
      }
      console.log('Cleared existing page content');
    } catch (error) {
      console.log('Could not clear existing content:', (error as Error).message);
    }
  }

  async addBlocksToPage(pageId: string, blocks: NotionBlock[]): Promise<void> {
    const batchSize = 50; // Notion's limit is 100, but we'll be conservative
    
    for (let i = 0; i < blocks.length; i += batchSize) {
      const batch = blocks.slice(i, i + batchSize);
      
      try {
        await this.notion.blocks.children.append({
          block_id: pageId,
          children: batch as any // Cast to satisfy BlockObjectRequest[]
        });
        console.log(`Added batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(blocks.length / batchSize)}`);
      } catch (error) {
        console.error(`Error adding batch ${Math.floor(i / batchSize) + 1}:`, (error as Error).message);
        
        // Debug: log the problematic batch
        console.log('Problematic batch blocks:');
        batch.forEach((block, idx) => {
          console.log(`Block ${i + idx + 1}:`, JSON.stringify(block, null, 2));
        });
        
        throw error;
      }
    }
  }

  async syncMarkdownToNotion(options: SyncOptions): Promise<void> {
    try {
      console.log(`Reading ${options.filePath}...`);
      
      if (!fs.existsSync(options.filePath)) {
        throw new Error(`File not found: ${options.filePath}`);
      }
      
      const markdownContent = fs.readFileSync(options.filePath, 'utf8');
      
      if (options.clearExisting !== false) {
        console.log('Clearing existing content...');
        await this.clearPageContent(options.pageId);
      }
      
      console.log('Converting markdown to Notion blocks...');
      const converter = new MarkdownToNotion();
      const blocks = converter.convert(markdownContent);
      
      console.log(`Generated ${blocks.length} blocks`);
      console.log('Adding blocks to Notion page...');
      await this.addBlocksToPage(options.pageId, blocks);
      
      console.log('✅ Successfully synced markdown to Notion with proper formatting!');
      
    } catch (error) {
      console.error('❌ Error syncing to Notion:', error);
      throw error;
    }
  }
}

// Main export function for easy use
export async function syncMarkdownToNotion(options: SyncOptions): Promise<void> {
  const sync = new NotionSync(options.notionToken);
  await sync.syncMarkdownToNotion(options);
}
