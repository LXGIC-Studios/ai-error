# ai-error

[![npm version](https://img.shields.io/npm/v/@lxgicstudios/ai-error.svg)](https://www.npmjs.com/package/@lxgicstudios/ai-error)
[![npm downloads](https://img.shields.io/npm/dm/@lxgicstudios/ai-error.svg)](https://www.npmjs.com/package/@lxgicstudios/ai-error)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Parse error messages and stack traces, get context and fix suggestions. Built-in database of 200+ common Node.js and TypeScript errors.

## Why use it

You get an error. You google it. You read 5 Stack Overflow posts. You try random fixes. 20 minutes gone.

This tool skips all that. Paste the error, get the fix.

## Install

```bash
npx @lxgicstudios/ai-error
```

Or install globally:

```bash
npm install -g @lxgicstudios/ai-error
```

## Usage

```bash
# Pipe an error directly
npm run build 2>&1 | npx @lxgicstudios/ai-error

# From clipboard (macOS)
pbpaste | npx @lxgicstudios/ai-error

# From a log file
cat error.log | npx @lxgicstudios/ai-error

# Interactive mode
npx @lxgicstudios/ai-error --interactive
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--interactive` | Paste error manually | false |
| `--json` | Output as JSON | false |
| `--verbose` | Show full stack trace analysis | false |
| `--context` | Include surrounding code context | false |

## Example

**Input:**
```
TypeError: Cannot read properties of undefined (reading 'map')
    at UserList (/app/components/UserList.tsx:12:18)
    at renderWithHooks (/app/node_modules/react-dom/...
```

**Output:**
```
Error: Cannot read properties of undefined (reading 'map')

Cause: Calling .map() on a variable that is undefined.

Fix:
1. Add a null check before mapping:
   users?.map(user => ...) or users && users.map(...)

2. Initialize with empty array:
   const [users, setUsers] = useState([])

3. Add loading state to prevent render before data loads

Location: UserList.tsx:12
```

## Built-in Error Database

200+ common errors with solutions:

- **Node.js**: MODULE_NOT_FOUND, ENOENT, EADDRINUSE, ENOMEM
- **TypeScript**: TS2304, TS2339, TS2345, TS7006
- **React**: Invalid hook call, Cannot update unmounted component
- **Next.js**: Hydration mismatch, Dynamic server usage
- **npm/yarn**: ERESOLVE, peer dependency conflicts
- **Database**: Connection refused, constraint violations

## Programmatic API

```typescript
import { parseError, getSuggestions } from '@lxgicstudios/ai-error';

const result = parseError(errorString);
console.log(result.type);      // 'TypeError'
console.log(result.message);   // 'Cannot read properties...'
console.log(result.location);  // { file: 'UserList.tsx', line: 12 }
console.log(result.suggestions); // ['Add null check...', ...]
```

## FAQ

**Does it need an API key?**
No. The error database is built-in. No external calls, works offline.

**Can I add custom error patterns?**
Not yet, but planned for v2. For now, open an issue with the error pattern you'd like added.

**Does it work with Python/Go/Rust errors?**
Currently optimized for Node.js/TypeScript/JavaScript. Other languages coming soon.

## Contributing

Found an error that isn't in the database? Open an issue with:
1. The full error message
2. What caused it
3. How you fixed it

We'll add it to the database.

## License

MIT
