#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import path from 'path';
import { syncMarkdownToNotion } from './index';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('md-notion-sync')
  .description('Sync markdown files to Notion pages with proper formatting')
  .version('1.0.0');

program
  .command('sync')
  .description('Sync a markdown file to a Notion page')
  .requiredOption('-f, --file <path>', 'Path to markdown file')
  .requiredOption('-p, --page-id <id>', 'Notion page ID')
  .option('-t, --token <token>', 'Notion API token (or use NOTION_TOKEN env var)')
  .option('--no-clear', 'Do not clear existing content before syncing')
  .action(async (options) => {
    try {
      const token = options.token || process.env.NOTION_TOKEN;
      
      if (!token) {
        console.error('❌ Notion token is required. Provide it via --token flag or NOTION_TOKEN environment variable.');
        process.exit(1);
      }

      const filePath = path.resolve(options.file);
      
      await syncMarkdownToNotion({
        notionToken: token,
        pageId: options.pageId,
        filePath: filePath,
        clearExisting: options.clear
      });

    } catch (error) {
      console.error('❌ Sync failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Create a sample configuration file')
  .action(() => {
    const configContent = `# Notion API Configuration
NOTION_TOKEN=your_notion_token_here

# Example usage:
# md-notion-sync sync -f README.md -p your_page_id_here
`;

    const fs = require('fs');
    fs.writeFileSync('.env', configContent);
    console.log('✅ Created .env configuration file');
    console.log('📝 Please edit .env and add your Notion token');
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
