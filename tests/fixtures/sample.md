# Test Document

This is a test markdown file for testing the converter.

## Features

- **Bold text** support
- *Italic text* support  
- `Inline code` support
- [External links](https://example.com)

## Code Example

```typescript
interface Config {
  apiKey: string;
  timeout: number;
}

const config: Config = {
  apiKey: 'test-key',
  timeout: 5000
};
```

## Data Table

| Feature | Status | Priority |
|---------|--------|----------|
| Authentication | ✅ Complete | High |
| Validation | 🚧 In Progress | Medium |
| Testing | ❌ Pending | High |

## Important Notes

> Always test your integration before deploying to production.

> **Security Note**: Never commit API keys to version control.

---

## Filtered Content Tests

These should be filtered out:
- ![Image](./image.png)
- [Relative link](./docs/guide.md)
- [Anchor link](#section)
- [![Badge](badge.svg)](https://link.com)

But this [external link](https://github.com) should work.

## Final Section

Thanks for testing!