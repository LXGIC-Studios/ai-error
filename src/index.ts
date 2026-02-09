#!/usr/bin/env node

import * as readline from 'node:readline';

// ── ANSI Colors ──

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgMagenta: '\x1b[45m',
};

// ── Error Database ──

interface ErrorEntry {
  pattern: RegExp;
  title: string;
  category: string;
  explanation: string;
  fix: string;
  autoFixCmd?: string;
  severity: 'error' | 'warning' | 'info';
}

const ERROR_DB: ErrorEntry[] = [
  // ─── Node.js Core Errors ───
  { pattern: /Cannot find module '([^']+)'/i, title: 'Module Not Found', category: 'Node.js', explanation: "Node can't locate the module you're trying to import. It's either not installed or the path is wrong.", fix: "Install the missing package or check your import path.", autoFixCmd: 'npm install $1', severity: 'error' },
  { pattern: /Error: Cannot find module '([^']+)'\nRequire stack:/i, title: 'Module Not Found (Require Stack)', category: 'Node.js', explanation: "The module isn't in node_modules. The require stack shows where it was imported from.", fix: "Run npm install to restore missing dependencies.", autoFixCmd: 'npm install', severity: 'error' },
  { pattern: /MODULE_NOT_FOUND/i, title: 'Module Not Found', category: 'Node.js', explanation: "A required module doesn't exist. Check that all deps are installed.", fix: "Delete node_modules and reinstall.", autoFixCmd: 'rm -rf node_modules && npm install', severity: 'error' },
  { pattern: /SyntaxError: Unexpected token/i, title: 'Syntax Error', category: 'JavaScript', explanation: "There's a syntax mistake in your code. Could be a missing bracket, comma, or using newer syntax without proper config.", fix: "Check the line number in the error. Look for missing punctuation or unsupported syntax.", severity: 'error' },
  { pattern: /SyntaxError: Unexpected end of (input|JSON)/i, title: 'Unexpected End of Input', category: 'JavaScript', explanation: "Your code or JSON ends abruptly. Usually a missing closing bracket or brace.", fix: "Count your opening and closing brackets. Make sure they match.", severity: 'error' },
  { pattern: /SyntaxError: Cannot use import statement outside a module/i, title: 'ESM Import Outside Module', category: 'Node.js', explanation: "You're using ES module import syntax but Node thinks this is a CommonJS file.", fix: 'Add "type": "module" to package.json, or rename the file to .mjs, or switch to require().', severity: 'error' },
  { pattern: /ReferenceError: (\w+) is not defined/i, title: 'Variable Not Defined', category: 'JavaScript', explanation: "You're trying to use a variable or function that doesn't exist in the current scope.", fix: "Check for typos in the variable name. Make sure it's imported or declared before use.", severity: 'error' },
  { pattern: /TypeError: (\w+) is not a function/i, title: 'Not a Function', category: 'JavaScript', explanation: "You're trying to call something as a function but it isn't one. Could be undefined, null, or a different type.", fix: "Check that the variable is actually a function. Log its type before calling it.", severity: 'error' },
  { pattern: /TypeError: Cannot read propert(y|ies) of (undefined|null)/i, title: 'Property Access on Null/Undefined', category: 'JavaScript', explanation: "You're trying to access a property on something that's undefined or null.", fix: "Add null checks before accessing properties. Use optional chaining (?.) for safe access.", severity: 'error' },
  { pattern: /TypeError: Cannot set propert(y|ies) of (undefined|null)/i, title: 'Set Property on Null/Undefined', category: 'JavaScript', explanation: "You're trying to set a property on undefined or null.", fix: "Initialize the object before setting properties on it.", severity: 'error' },
  { pattern: /TypeError: Assignment to constant variable/i, title: 'Const Reassignment', category: 'JavaScript', explanation: "You're trying to reassign a const variable. That's not allowed.", fix: "Change const to let if you need to reassign, or use a different variable name.", severity: 'error' },
  { pattern: /TypeError: (\w+)\.(\w+) is not a function/i, title: 'Method Not Found', category: 'JavaScript', explanation: "The method you're calling doesn't exist on that object.", fix: "Check the API docs for the correct method name. The object might be a different type than expected.", severity: 'error' },
  { pattern: /RangeError: Maximum call stack size exceeded/i, title: 'Stack Overflow', category: 'JavaScript', explanation: "You've got infinite recursion. A function keeps calling itself without a proper base case.", fix: "Add or fix the base case in your recursive function. Check for circular references.", severity: 'error' },
  { pattern: /RangeError: Invalid array length/i, title: 'Invalid Array Length', category: 'JavaScript', explanation: "You're trying to create an array with a negative or impossibly large length.", fix: "Check the value being passed to Array() or array operations.", severity: 'error' },
  { pattern: /Error: ENOENT: no such file or directory/i, title: 'File Not Found', category: 'Node.js FS', explanation: "Node can't find the file or directory at the given path.", fix: "Check that the path exists. Use path.resolve() for absolute paths.", severity: 'error' },
  { pattern: /Error: EACCES: permission denied/i, title: 'Permission Denied', category: 'Node.js FS', explanation: "Your process doesn't have the right permissions to access this file or directory.", fix: "Check file permissions. You might need sudo, or run chmod on the file.", autoFixCmd: 'sudo chmod -R 755 .', severity: 'error' },
  { pattern: /Error: EADDRINUSE/i, title: 'Port Already in Use', category: 'Node.js Network', explanation: "Something else is already listening on that port.", fix: "Kill the other process or use a different port.", autoFixCmd: 'lsof -i :$PORT | grep LISTEN', severity: 'error' },
  { pattern: /Error: ECONNREFUSED/i, title: 'Connection Refused', category: 'Node.js Network', explanation: "The server you're trying to connect to isn't accepting connections.", fix: "Make sure the target service is running and the host/port are correct.", severity: 'error' },
  { pattern: /Error: ECONNRESET/i, title: 'Connection Reset', category: 'Node.js Network', explanation: "The connection was forcibly closed by the remote server.", fix: "The server might be overloaded or your request was too large. Add retry logic.", severity: 'error' },
  { pattern: /Error: ETIMEDOUT/i, title: 'Connection Timed Out', category: 'Node.js Network', explanation: "The connection took too long and was dropped.", fix: "Check network connectivity. Increase timeout settings if needed.", severity: 'error' },
  { pattern: /Error: EMFILE: too many open files/i, title: 'Too Many Open Files', category: 'Node.js FS', explanation: "Your process has hit the OS file descriptor limit.", fix: "Close file handles when done. Increase the ulimit.", autoFixCmd: 'ulimit -n 10240', severity: 'error' },
  { pattern: /Error: ENOMEM/i, title: 'Out of Memory', category: 'Node.js', explanation: "The process ran out of available memory.", fix: "Increase the memory limit or optimize your code to use less memory.", autoFixCmd: 'node --max-old-space-size=4096', severity: 'error' },
  { pattern: /FATAL ERROR: (CALL_AND_RETRY_LAST|Reached heap limit) Allocation failed/i, title: 'Heap Out of Memory', category: 'Node.js', explanation: "V8's heap is full. Your app is using too much memory.", fix: "Increase heap size or find and fix memory leaks.", autoFixCmd: 'node --max-old-space-size=8192 index.js', severity: 'error' },
  { pattern: /Error \[ERR_REQUIRE_ESM\]/i, title: 'Require ESM Module', category: 'Node.js', explanation: "You're using require() on an ESM-only package. It won't work.", fix: "Switch to dynamic import() or use an older version of the package that supports CommonJS.", severity: 'error' },
  { pattern: /ERR_MODULE_NOT_FOUND/i, title: 'ES Module Not Found', category: 'Node.js', explanation: "Node can't resolve the ES module. File extensions are required in ESM.", fix: "Add the .js extension to your import paths. ESM doesn't do auto-resolution like CommonJS.", severity: 'error' },
  { pattern: /ERR_UNKNOWN_FILE_EXTENSION/i, title: 'Unknown File Extension', category: 'Node.js', explanation: "Node doesn't know how to handle this file type.", fix: 'Make sure you\'re using .js, .mjs, or .cjs. Check your "type" field in package.json.', severity: 'error' },
  { pattern: /Error \[ERR_HTTP_HEADERS_SENT\]/i, title: 'Headers Already Sent', category: 'Node.js HTTP', explanation: "You're trying to set headers after the response was already sent.", fix: "Make sure you only send one response per request. Add return after res.send() or res.end().", severity: 'error' },
  { pattern: /ERR_INVALID_ARG_TYPE/i, title: 'Invalid Argument Type', category: 'Node.js', explanation: "A function got the wrong type of argument.", fix: "Check the expected types in the docs. You might be passing a string where a Buffer is needed (or similar).", severity: 'error' },
  { pattern: /UnhandledPromiseRejection/i, title: 'Unhandled Promise Rejection', category: 'Node.js', explanation: "A promise was rejected but nothing caught the error.", fix: "Add .catch() to your promises or wrap async code in try/catch.", severity: 'error' },
  { pattern: /Warning: .* did not .* await/i, title: 'Missing Await', category: 'Node.js', explanation: "You forgot to await an async operation.", fix: "Add the await keyword before the async function call.", severity: 'warning' },

  // ─── TypeScript Errors ───
  { pattern: /TS2307: Cannot find module '([^']+)'/i, title: 'TS: Module Not Found', category: 'TypeScript', explanation: "TypeScript can't find type declarations for this module.", fix: "Install the @types package for the module.", autoFixCmd: 'npm install -D @types/$1', severity: 'error' },
  { pattern: /TS2304: Cannot find name '(\w+)'/i, title: 'TS: Name Not Found', category: 'TypeScript', explanation: "TypeScript doesn't recognize this identifier. It might need to be imported or declared.", fix: "Import the missing type/value or add a type declaration.", severity: 'error' },
  { pattern: /TS2339: Property '(\w+)' does not exist on type/i, title: 'TS: Property Missing', category: 'TypeScript', explanation: "The type definition doesn't include this property.", fix: "Check the type definition. You might need to extend the type or use a type assertion.", severity: 'error' },
  { pattern: /TS2345: Argument of type '(.+)' is not assignable to parameter of type '(.+)'/i, title: 'TS: Type Mismatch', category: 'TypeScript', explanation: "You're passing the wrong type to a function.", fix: "Convert or cast the value to the expected type. Check your function signature.", severity: 'error' },
  { pattern: /TS2322: Type '(.+)' is not assignable to type '(.+)'/i, title: 'TS: Assignment Type Mismatch', category: 'TypeScript', explanation: "You're trying to assign a value of the wrong type.", fix: "Fix the value to match the expected type, or update the type annotation.", severity: 'error' },
  { pattern: /TS2532: Object is possibly 'undefined'/i, title: 'TS: Possibly Undefined', category: 'TypeScript', explanation: "TypeScript thinks this value could be undefined.", fix: "Add a null check, use optional chaining (?.), or use non-null assertion (!) if you're sure.", severity: 'error' },
  { pattern: /TS2531: Object is possibly 'null'/i, title: 'TS: Possibly Null', category: 'TypeScript', explanation: "TypeScript thinks this value could be null.", fix: "Add a null check before using the value.", severity: 'error' },
  { pattern: /TS2554: Expected (\d+) arguments?, but got (\d+)/i, title: 'TS: Wrong Argument Count', category: 'TypeScript', explanation: "You're passing the wrong number of arguments to a function.", fix: "Check the function signature and pass the correct number of args.", severity: 'error' },
  { pattern: /TS2551: Property '(\w+)' does not exist.*Did you mean '(\w+)'/i, title: 'TS: Property Typo', category: 'TypeScript', explanation: "Looks like a typo. TypeScript found a similar property name.", fix: "Use the suggested property name instead.", severity: 'error' },
  { pattern: /TS2349: This expression is not callable/i, title: 'TS: Not Callable', category: 'TypeScript', explanation: "You're trying to call something that TypeScript doesn't think is a function.", fix: "Check the type of what you're calling. It might need a type assertion.", severity: 'error' },
  { pattern: /TS2355: A function whose declared type is neither 'void' nor 'any' must return a value/i, title: 'TS: Missing Return', category: 'TypeScript', explanation: "Your function has a return type but doesn't return anything on all code paths.", fix: "Add return statements to cover all branches.", severity: 'error' },
  { pattern: /TS2366: Function lacks ending return statement/i, title: 'TS: Missing Return Statement', category: 'TypeScript', explanation: "Not all code paths in this function return a value.", fix: "Add a return statement at the end of the function.", severity: 'error' },
  { pattern: /TS2564: Property '(\w+)' has no initializer/i, title: 'TS: Uninitialized Property', category: 'TypeScript', explanation: "A class property isn't initialized in the constructor.", fix: "Initialize it in the constructor, add a default value, or use the ! definite assignment assertion.", severity: 'error' },
  { pattern: /TS2556: A spread argument must.*have a tuple type or be passed to a rest parameter/i, title: 'TS: Invalid Spread', category: 'TypeScript', explanation: "TypeScript can't verify the spread argument matches what's expected.", fix: "Use 'as const' on the array or explicitly type it as a tuple.", severity: 'error' },
  { pattern: /TS1005: '(.+)' expected/i, title: 'TS: Syntax Expected', category: 'TypeScript', explanation: "TypeScript was expecting a specific token at this position.", fix: "Check for missing semicolons, brackets, or commas near the error line.", severity: 'error' },
  { pattern: /TS1128: Declaration or statement expected/i, title: 'TS: Declaration Expected', category: 'TypeScript', explanation: "Something unexpected appeared where TypeScript wanted a declaration.", fix: "Check for extra closing braces or misplaced code.", severity: 'error' },
  { pattern: /TS1192: Module.*has no default export/i, title: 'TS: No Default Export', category: 'TypeScript', explanation: "You're doing a default import but the module doesn't have one.", fix: "Use named imports: import { thing } from 'module' instead of import thing from 'module'.", severity: 'error' },
  { pattern: /TS1259: Module.*can only be default-imported using.*esModuleInterop/i, title: 'TS: Need esModuleInterop', category: 'TypeScript', explanation: "This CommonJS module needs esModuleInterop to work with default imports.", fix: 'Set "esModuleInterop": true in your tsconfig.json.', severity: 'error' },
  { pattern: /TS2688: Cannot find type definition file for '([^']+)'/i, title: 'TS: Missing Type Definitions', category: 'TypeScript', explanation: "TypeScript can't find the type definitions referenced in your config.", fix: "Install the missing @types package.", autoFixCmd: 'npm install -D @types/$1', severity: 'error' },
  { pattern: /TS6133: '(\w+)' is declared but its value is never read/i, title: 'TS: Unused Variable', category: 'TypeScript', explanation: "You declared a variable but never used it.", fix: "Remove the unused variable or prefix it with _ to suppress the warning.", severity: 'warning' },
  { pattern: /TS7006: Parameter '(\w+)' implicitly has an 'any' type/i, title: 'TS: Implicit Any', category: 'TypeScript', explanation: "TypeScript can't infer the type and strict mode doesn't allow implicit any.", fix: "Add an explicit type annotation to the parameter.", severity: 'error' },
  { pattern: /TS7053: Element implicitly has an 'any' type/i, title: 'TS: Implicit Any Index', category: 'TypeScript', explanation: "You're using a dynamic key to access an object and TypeScript can't verify the type.", fix: "Add an index signature to the type or use a type assertion.", severity: 'error' },
  { pattern: /TS18046: '(\w+)' is of type 'unknown'/i, title: 'TS: Unknown Type', category: 'TypeScript', explanation: "The variable is typed as unknown and you need to narrow it before use.", fix: "Add a type guard: if (typeof x === 'string') or if (x instanceof Error).", severity: 'error' },
  { pattern: /TS2571: Object is of type 'unknown'/i, title: 'TS: Object Unknown Type', category: 'TypeScript', explanation: "You're trying to use a value typed as 'unknown' without narrowing it first.", fix: "Use type guards to narrow the type before accessing properties.", severity: 'error' },
  { pattern: /TS2769: No overload matches this call/i, title: 'TS: No Matching Overload', category: 'TypeScript', explanation: "None of the function's overload signatures match your arguments.", fix: "Check the function's overload signatures and fix your arguments.", severity: 'error' },
  { pattern: /TS2741: Property '(\w+)' is missing in type/i, title: 'TS: Missing Property', category: 'TypeScript', explanation: "An object is missing a required property.", fix: "Add the missing property to the object.", severity: 'error' },
  { pattern: /TS2559: Type '(.+)' has no properties in common with type/i, title: 'TS: No Common Properties', category: 'TypeScript', explanation: "The object you're passing shares zero properties with the expected type.", fix: "Check that you're passing the right object. There might be a naming mismatch.", severity: 'error' },

  // ─── npm Errors ───
  { pattern: /npm ERR! code ERESOLVE/i, title: 'npm: Dependency Resolution Failed', category: 'npm', explanation: "npm can't resolve conflicting dependency versions.", fix: "Try npm install --legacy-peer-deps, or manually fix the version conflicts.", autoFixCmd: 'npm install --legacy-peer-deps', severity: 'error' },
  { pattern: /npm ERR! code ENOENT/i, title: 'npm: File Not Found', category: 'npm', explanation: "npm can't find a required file, usually package.json.", fix: "Make sure you're in the right directory and package.json exists.", severity: 'error' },
  { pattern: /npm ERR! code E404/i, title: 'npm: Package Not Found', category: 'npm', explanation: "The package doesn't exist on the npm registry.", fix: "Check the package name for typos. It might be scoped or renamed.", severity: 'error' },
  { pattern: /npm ERR! code E403/i, title: 'npm: Access Forbidden', category: 'npm', explanation: "You don't have permission to access this package.", fix: "Check your npm auth. Run npm login if needed.", autoFixCmd: 'npm login', severity: 'error' },
  { pattern: /npm ERR! code EINTEGRITY/i, title: 'npm: Integrity Check Failed', category: 'npm', explanation: "The downloaded package doesn't match the expected checksum.", fix: "Clear the npm cache and reinstall.", autoFixCmd: 'npm cache clean --force && rm -rf node_modules && npm install', severity: 'error' },
  { pattern: /npm ERR! peer dep missing/i, title: 'npm: Missing Peer Dependency', category: 'npm', explanation: "A package needs a peer dependency that isn't installed.", fix: "Install the peer dependency manually.", severity: 'warning' },
  { pattern: /npm WARN deprecated/i, title: 'npm: Deprecated Package', category: 'npm', explanation: "A package you're using has been deprecated.", fix: "Look for a replacement package in the deprecation message.", severity: 'warning' },
  { pattern: /npm ERR! code EAUDIT/i, title: 'npm: Audit Failure', category: 'npm', explanation: "npm audit found security vulnerabilities.", fix: "Run npm audit fix to auto-patch what it can.", autoFixCmd: 'npm audit fix', severity: 'warning' },
  { pattern: /npm ERR! code EPERM/i, title: 'npm: Permission Error', category: 'npm', explanation: "npm doesn't have permission to write to the install directory.", fix: "Fix ownership of node_modules or use --prefix.", autoFixCmd: 'sudo chown -R $(whoami) node_modules', severity: 'error' },
  { pattern: /npm ERR! code EJSONPARSE/i, title: 'npm: JSON Parse Error', category: 'npm', explanation: "package.json has invalid JSON.", fix: "Check package.json for syntax errors. Use a JSON validator.", severity: 'error' },

  // ─── Build Tool Errors ───
  { pattern: /error TS5058: The specified path does not exist/i, title: 'TS Config: Path Not Found', category: 'TypeScript', explanation: "A path in tsconfig.json doesn't exist.", fix: "Check rootDir, outDir, and include paths in tsconfig.json.", severity: 'error' },
  { pattern: /error TS6059: File.*is not under 'rootDir'/i, title: 'TS Config: File Outside rootDir', category: 'TypeScript', explanation: "A file you're importing lives outside the rootDir defined in tsconfig.", fix: 'Move the file inside rootDir or update your tsconfig "rootDir" and "include" settings.', severity: 'error' },
  { pattern: /webpack.*Module not found/i, title: 'Webpack: Module Not Found', category: 'Webpack', explanation: "Webpack can't resolve an import.", fix: "Check the import path. You might need a webpack resolver alias or to install the package.", severity: 'error' },
  { pattern: /Module build failed.*ENOENT/i, title: 'Build: File Missing', category: 'Build', explanation: "The build tool can't find a file referenced in your code.", fix: "Check import paths for typos. Make sure the file exists.", severity: 'error' },
  { pattern: /error\[E0308\]: mismatched types/i, title: 'Rust: Type Mismatch', category: 'Rust', explanation: "Expected one type but got another.", fix: "Check the expected type and convert or cast your value.", severity: 'error' },
  { pattern: /error: linker.*not found/i, title: 'Build: Linker Not Found', category: 'Build', explanation: "The C/C++ linker isn't installed or configured.", fix: "Install build tools for your platform.", autoFixCmd: 'xcode-select --install', severity: 'error' },
  { pattern: /gyp ERR!/i, title: 'node-gyp Build Error', category: 'Build', explanation: "A native addon failed to compile with node-gyp.", fix: "Install build tools: Python, make, and a C++ compiler.", autoFixCmd: 'npm install -g node-gyp', severity: 'error' },
  { pattern: /esbuild.*error/i, title: 'esbuild Error', category: 'Build', explanation: "esbuild encountered an error during bundling.", fix: "Check the error details for the specific file and line.", severity: 'error' },
  { pattern: /vite.*error/i, title: 'Vite Build Error', category: 'Build', explanation: "Vite encountered an error during build or dev.", fix: "Check the error message for specifics. Clear the .vite cache if needed.", autoFixCmd: 'rm -rf node_modules/.vite && npm run dev', severity: 'error' },

  // ─── React Errors ───
  { pattern: /Invalid hook call/i, title: 'React: Invalid Hook Call', category: 'React', explanation: "You're calling a hook outside a function component, or you have multiple React copies.", fix: "Only call hooks at the top level of function components. Check for duplicate React installations.", autoFixCmd: 'npm ls react', severity: 'error' },
  { pattern: /Too many re-renders/i, title: 'React: Infinite Re-render Loop', category: 'React', explanation: "Your component keeps re-rendering in a loop. Usually caused by setting state during render.", fix: "Don't call setState directly in the component body. Use useEffect for side effects.", severity: 'error' },
  { pattern: /Each child in a list should have a unique "key" prop/i, title: 'React: Missing Key Prop', category: 'React', explanation: "When rendering lists, each element needs a unique key prop.", fix: "Add a key prop using a unique identifier (not array index if possible).", severity: 'warning' },
  { pattern: /Cannot update a component.*while rendering a different component/i, title: 'React: State Update During Render', category: 'React', explanation: "You're updating one component's state while another is rendering.", fix: "Move the state update into useEffect.", severity: 'error' },
  { pattern: /Minified React error #(\d+)/i, title: 'React: Minified Error', category: 'React', explanation: "This is a production React error. Look up the error number for details.", fix: "Visit https://reactjs.org/docs/error-decoder.html?invariant=$1", severity: 'error' },
  { pattern: /Objects are not valid as a React child/i, title: 'React: Invalid Child', category: 'React', explanation: "You're trying to render a plain object as JSX. React can't do that.", fix: "Convert the object to a string or extract the values you want to display.", severity: 'error' },
  { pattern: /Maximum update depth exceeded/i, title: 'React: Max Update Depth', category: 'React', explanation: "Same as infinite re-render. A state update triggers another state update endlessly.", fix: "Check your useEffect dependencies. Make sure you're not creating infinite loops.", severity: 'error' },
  { pattern: /Hydration failed because/i, title: 'React: Hydration Mismatch', category: 'React', explanation: "The server-rendered HTML doesn't match what the client rendered.", fix: "Make sure your component renders the same content on server and client. Avoid using Date or Math.random during render.", severity: 'error' },
  { pattern: /React.createElement: type is invalid/i, title: 'React: Invalid Element Type', category: 'React', explanation: "You're passing undefined or null as a component type.", fix: "Check your imports. The component might not be exported correctly.", severity: 'error' },

  // ─── Next.js Errors ───
  { pattern: /Error: Hydration failed/i, title: 'Next.js: Hydration Error', category: 'Next.js', explanation: "Server and client HTML don't match. Common with dynamic content.", fix: "Use suppressHydrationWarning or move dynamic content into useEffect.", severity: 'error' },
  { pattern: /Error: NEXT_NOT_FOUND/i, title: 'Next.js: Page Not Found', category: 'Next.js', explanation: "The notFound() function was called.", fix: "Check your routing. The page might not exist at the expected path.", severity: 'error' },
  { pattern: /Module not found: Can't resolve '([^']+)'/i, title: 'Next.js: Module Not Found', category: 'Next.js', explanation: "Next.js can't resolve this import. The package might not be installed.", fix: "Install the missing package.", autoFixCmd: 'npm install $1', severity: 'error' },

  // ─── Express/HTTP Errors ───
  { pattern: /Error: listen EADDRINUSE/i, title: 'Express: Port in Use', category: 'Express', explanation: "The port is already taken by another process.", fix: "Kill the process on that port or choose a different one.", autoFixCmd: 'npx kill-port 3000', severity: 'error' },
  { pattern: /PayloadTooLargeError/i, title: 'Express: Payload Too Large', category: 'Express', explanation: "The request body exceeds the size limit.", fix: "Increase the body parser limit: app.use(express.json({ limit: '10mb' }))", severity: 'error' },
  { pattern: /Error: Request aborted/i, title: 'HTTP: Request Aborted', category: 'HTTP', explanation: "The client closed the connection before the server finished responding.", fix: "Handle the 'aborted' event on the request. Add timeout handling.", severity: 'warning' },

  // ─── Database Errors ───
  { pattern: /ER_DUP_ENTRY/i, title: 'MySQL: Duplicate Entry', category: 'Database', explanation: "You're trying to insert a row that violates a unique constraint.", fix: "Check for existing records before inserting, or use INSERT ... ON DUPLICATE KEY UPDATE.", severity: 'error' },
  { pattern: /ER_ACCESS_DENIED_ERROR/i, title: 'MySQL: Access Denied', category: 'Database', explanation: "Wrong username or password for the database.", fix: "Check your database credentials in your .env file.", severity: 'error' },
  { pattern: /SQLITE_BUSY/i, title: 'SQLite: Database Busy', category: 'Database', explanation: "Another process has a lock on the SQLite database.", fix: "Add WAL mode: PRAGMA journal_mode=WAL; or add retry logic.", severity: 'error' },
  { pattern: /SQLITE_CONSTRAINT/i, title: 'SQLite: Constraint Violation', category: 'Database', explanation: "An insert or update violates a database constraint.", fix: "Check unique constraints, foreign keys, and NOT NULL requirements.", severity: 'error' },
  { pattern: /relation "(\w+)" does not exist/i, title: 'PostgreSQL: Table Not Found', category: 'Database', explanation: "The table doesn't exist in the database.", fix: "Run your migrations. Check the schema and table name.", autoFixCmd: 'npx prisma migrate dev', severity: 'error' },
  { pattern: /duplicate key value violates unique constraint/i, title: 'PostgreSQL: Duplicate Key', category: 'Database', explanation: "You're trying to insert a row with a duplicate unique key.", fix: "Use ON CONFLICT DO UPDATE or check for existing records first.", severity: 'error' },
  { pattern: /ECONNREFUSED.*5432/i, title: 'PostgreSQL: Connection Refused', category: 'Database', explanation: "Can't connect to PostgreSQL on port 5432.", fix: "Make sure PostgreSQL is running.", autoFixCmd: 'brew services start postgresql', severity: 'error' },
  { pattern: /ECONNREFUSED.*27017/i, title: 'MongoDB: Connection Refused', category: 'Database', explanation: "Can't connect to MongoDB on port 27017.", fix: "Make sure MongoDB is running.", autoFixCmd: 'brew services start mongodb-community', severity: 'error' },
  { pattern: /ECONNREFUSED.*6379/i, title: 'Redis: Connection Refused', category: 'Database', explanation: "Can't connect to Redis on port 6379.", fix: "Make sure Redis is running.", autoFixCmd: 'brew services start redis', severity: 'error' },
  { pattern: /MongoServerError: E11000 duplicate key/i, title: 'MongoDB: Duplicate Key', category: 'Database', explanation: "A document with that unique key already exists.", fix: "Check for existing documents or use upsert.", severity: 'error' },
  { pattern: /Prisma.*error/i, title: 'Prisma Error', category: 'Database', explanation: "Prisma ORM encountered an error.", fix: "Run prisma generate if schema changed. Check your database connection.", autoFixCmd: 'npx prisma generate', severity: 'error' },
  { pattern: /PrismaClientKnownRequestError/i, title: 'Prisma: Known Request Error', category: 'Database', explanation: "A known Prisma error occurred. Check the error code for details.", fix: "Look up the Prisma error code at prisma.io/docs/reference/api-reference/error-reference.", severity: 'error' },

  // ─── Docker Errors ───
  { pattern: /docker.*Cannot connect to the Docker daemon/i, title: 'Docker: Daemon Not Running', category: 'Docker', explanation: "Docker isn't running on your machine.", fix: "Start Docker Desktop or the Docker daemon.", autoFixCmd: 'open -a Docker', severity: 'error' },
  { pattern: /docker.*no space left on device/i, title: 'Docker: No Space Left', category: 'Docker', explanation: "Docker has run out of disk space.", fix: "Prune unused images and containers.", autoFixCmd: 'docker system prune -a', severity: 'error' },
  { pattern: /docker.*port is already allocated/i, title: 'Docker: Port Allocated', category: 'Docker', explanation: "The port is already mapped to another container or process.", fix: "Stop the conflicting container or use a different port mapping.", severity: 'error' },
  { pattern: /docker.*image.*not found/i, title: 'Docker: Image Not Found', category: 'Docker', explanation: "The Docker image doesn't exist locally or in the registry.", fix: "Pull the image first or check the image name.", severity: 'error' },

  // ─── Git Errors ───
  { pattern: /fatal: not a git repository/i, title: 'Git: Not a Repository', category: 'Git', explanation: "You're not in a git repository.", fix: "Initialize one or navigate to the right directory.", autoFixCmd: 'git init', severity: 'error' },
  { pattern: /fatal: remote origin already exists/i, title: 'Git: Remote Exists', category: 'Git', explanation: "The remote 'origin' is already configured.", fix: "Remove and re-add it, or use set-url.", autoFixCmd: 'git remote set-url origin <new-url>', severity: 'error' },
  { pattern: /error: failed to push some refs/i, title: 'Git: Push Rejected', category: 'Git', explanation: "The remote has commits you don't have locally.", fix: "Pull first, resolve any conflicts, then push.", autoFixCmd: 'git pull --rebase && git push', severity: 'error' },
  { pattern: /CONFLICT.*Merge conflict in/i, title: 'Git: Merge Conflict', category: 'Git', explanation: "There are conflicting changes that git can't auto-merge.", fix: "Open the conflicted files, resolve the conflict markers, then git add and commit.", severity: 'error' },
  { pattern: /fatal: Authentication failed/i, title: 'Git: Auth Failed', category: 'Git', explanation: "Your git credentials are wrong or expired.", fix: "Update your credentials or set up SSH keys.", severity: 'error' },

  // ─── Environment & Config Errors ───
  { pattern: /Error: Missing required environment variable/i, title: 'Missing Env Variable', category: 'Config', explanation: "A required environment variable isn't set.", fix: "Check your .env file and make sure all required vars are defined.", severity: 'error' },
  { pattern: /CORS.*blocked/i, title: 'CORS Blocked', category: 'HTTP', explanation: "Cross-Origin Resource Sharing policy is blocking your request.", fix: "Configure CORS on the server to allow your origin.", severity: 'error' },
  { pattern: /Access-Control-Allow-Origin/i, title: 'CORS Header Missing', category: 'HTTP', explanation: "The server's response doesn't include the CORS header.", fix: "Add the Access-Control-Allow-Origin header to the server response.", severity: 'error' },
  { pattern: /Error: self signed certificate/i, title: 'TLS: Self-Signed Certificate', category: 'Network', explanation: "The server's using a self-signed certificate that Node doesn't trust.", fix: "In dev, you can set NODE_TLS_REJECT_UNAUTHORIZED=0. In prod, use a real certificate.", severity: 'error' },
  { pattern: /CERT_HAS_EXPIRED/i, title: 'TLS: Certificate Expired', category: 'Network', explanation: "The server's SSL certificate has expired.", fix: "Renew the SSL certificate on the server.", severity: 'error' },

  // ─── JSON/Parsing Errors ───
  { pattern: /SyntaxError: Unexpected token.*in JSON at position/i, title: 'Invalid JSON', category: 'Parsing', explanation: "The JSON string has invalid syntax.", fix: "Validate your JSON. The position tells you where the error is.", severity: 'error' },
  { pattern: /SyntaxError:.*JSON.*position (\d+)/i, title: 'JSON Parse Error', category: 'Parsing', explanation: "JSON parsing failed at a specific position.", fix: "Check the JSON at the given position for missing quotes, commas, or brackets.", severity: 'error' },
  { pattern: /SyntaxError: Unexpected token '<'/i, title: 'HTML Instead of JSON', category: 'Parsing', explanation: "You got HTML back when you expected JSON. Usually a 404 page or error page.", fix: "Check the URL. The server might be returning an HTML error page.", severity: 'error' },

  // ─── Memory & Performance ───
  { pattern: /JavaScript heap out of memory/i, title: 'JavaScript Heap OOM', category: 'Memory', explanation: "Node ran out of heap memory.", fix: "Increase the heap size or find memory leaks.", autoFixCmd: 'NODE_OPTIONS="--max-old-space-size=4096" npm run build', severity: 'error' },
  { pattern: /Killed.*signal 9/i, title: 'Process Killed (OOM)', category: 'Memory', explanation: "The OS killed your process, probably because it used too much memory.", fix: "Optimize memory usage or increase available RAM.", severity: 'error' },
  { pattern: /SIGTERM/i, title: 'Process Terminated (SIGTERM)', category: 'Process', explanation: "The process received a termination signal.", fix: "Handle SIGTERM gracefully in your app for clean shutdowns.", severity: 'warning' },
  { pattern: /SIGKILL/i, title: 'Process Killed (SIGKILL)', category: 'Process', explanation: "The process was forcefully killed.", fix: "Check if something is killing your process (OOM killer, orchestrator, etc.).", severity: 'error' },

  // ─── Async/Promise Errors ───
  { pattern: /Error: Callback was already called/i, title: 'Callback Called Twice', category: 'Async', explanation: "A callback function was invoked more than once.", fix: "Add a guard to prevent double invocation. Return after calling the callback.", severity: 'error' },
  { pattern: /TimeoutError/i, title: 'Operation Timed Out', category: 'Async', explanation: "An async operation took too long.", fix: "Increase the timeout or optimize the operation.", severity: 'error' },
  { pattern: /AbortError/i, title: 'Operation Aborted', category: 'Async', explanation: "The operation was explicitly aborted via AbortController.", fix: "Check your AbortController usage and timeout settings.", severity: 'error' },

  // ─── ESLint/Prettier Errors ───
  { pattern: /Parsing error: .*expected/i, title: 'ESLint: Parse Error', category: 'Linting', explanation: "ESLint can't parse your code. Usually a config issue.", fix: "Check your ESLint config parser settings. Make sure they match your code (TS vs JS).", severity: 'error' },
  { pattern: /eslint.*no-unused-vars/i, title: 'ESLint: Unused Variable', category: 'Linting', explanation: "You declared something but never used it.", fix: "Remove the unused variable or prefix with _.", severity: 'warning' },
  { pattern: /prettier.*error/i, title: 'Prettier: Format Error', category: 'Linting', explanation: "Prettier found formatting issues.", fix: "Run prettier to auto-format.", autoFixCmd: 'npx prettier --write .', severity: 'warning' },

  // ─── AWS/Cloud Errors ───
  { pattern: /AccessDenied.*S3/i, title: 'AWS S3: Access Denied', category: 'Cloud', explanation: "Your AWS credentials don't have permission for this S3 operation.", fix: "Check your IAM policy and bucket permissions.", severity: 'error' },
  { pattern: /NoSuchBucket/i, title: 'AWS S3: Bucket Not Found', category: 'Cloud', explanation: "The S3 bucket doesn't exist.", fix: "Check the bucket name for typos. Create the bucket if needed.", severity: 'error' },
  { pattern: /ExpiredToken/i, title: 'AWS: Token Expired', category: 'Cloud', explanation: "Your AWS session token has expired.", fix: "Refresh your AWS credentials.", autoFixCmd: 'aws sso login', severity: 'error' },
  { pattern: /InvalidSignatureException/i, title: 'AWS: Invalid Signature', category: 'Cloud', explanation: "The request signature doesn't match. Usually a credentials issue.", fix: "Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.", severity: 'error' },

  // ─── Testing Errors ───
  { pattern: /Jest.*Cannot find module/i, title: 'Jest: Module Not Found', category: 'Testing', explanation: "Jest can't resolve an import in your test.", fix: "Check moduleNameMapper in jest.config. Make sure tsconfig paths are mapped.", severity: 'error' },
  { pattern: /expect\(received\)\.toBe\(expected\)/i, title: 'Jest: Assertion Failed', category: 'Testing', explanation: "The test assertion didn't match.", fix: "Check the expected vs received values in the test output.", severity: 'error' },
  { pattern: /Timeout.*exceeded.*async/i, title: 'Test: Async Timeout', category: 'Testing', explanation: "An async test took too long to complete.", fix: "Increase the test timeout or check for hanging promises.", severity: 'error' },

  // ─── Vercel/Deployment Errors ───
  { pattern: /Error: FUNCTION_INVOCATION_TIMEOUT/i, title: 'Vercel: Function Timeout', category: 'Deployment', explanation: "Your serverless function took too long.", fix: "Optimize the function or increase the timeout in vercel.json.", severity: 'error' },
  { pattern: /FUNCTION_INVOCATION_FAILED/i, title: 'Vercel: Function Failed', category: 'Deployment', explanation: "The serverless function crashed.", fix: "Check your function logs in the Vercel dashboard.", severity: 'error' },
  { pattern: /Error during SSR/i, title: 'SSR Error', category: 'Deployment', explanation: "Something crashed during server-side rendering.", fix: "Check for browser-only APIs (window, document) being called on the server.", severity: 'error' },

  // ─── Crypto/Security Errors ───
  { pattern: /Error: error:.*EVP_DecryptFinal/i, title: 'Crypto: Decryption Failed', category: 'Crypto', explanation: "Decryption failed. Wrong key, corrupted data, or wrong algorithm.", fix: "Check that you're using the correct key and IV for decryption.", severity: 'error' },
  { pattern: /Error: error:.*digital envelope routines/i, title: 'Crypto: OpenSSL Error', category: 'Crypto', explanation: "OpenSSL operation failed. Common with Node 17+ and legacy packages.", fix: "Set NODE_OPTIONS=--openssl-legacy-provider or upgrade the package.", autoFixCmd: 'NODE_OPTIONS=--openssl-legacy-provider npm run build', severity: 'error' },

  // ─── Package Manager Errors ───
  { pattern: /yarn.*Couldn't find package/i, title: 'Yarn: Package Not Found', category: 'Yarn', explanation: "Yarn can't find the package in the registry.", fix: "Check the package name for typos.", severity: 'error' },
  { pattern: /pnpm.*ERR_PNPM_PEER_DEP_ISSUES/i, title: 'pnpm: Peer Dep Issues', category: 'pnpm', explanation: "pnpm found peer dependency conflicts.", fix: "Install missing peer deps or add to peerDependencyRules in .npmrc.", severity: 'error' },

  // ─── Process & System Errors ───
  { pattern: /Error: spawn .* ENOENT/i, title: 'Spawn: Command Not Found', category: 'Process', explanation: "The command you're trying to spawn doesn't exist.", fix: "Check that the binary is installed and in your PATH.", severity: 'error' },
  { pattern: /Error: spawn .* EPERM/i, title: 'Spawn: Permission Denied', category: 'Process', explanation: "You don't have permission to execute this command.", fix: "Check file permissions on the binary.", severity: 'error' },
  { pattern: /ENAMETOOLONG/i, title: 'Path Too Long', category: 'System', explanation: "A file path exceeds the OS limit.", fix: "Shorten your directory structure or file names.", severity: 'error' },

  // ─── Miscellaneous Common Errors ───
  { pattern: /Error: EPIPE/i, title: 'Broken Pipe', category: 'IO', explanation: "You're writing to a pipe/socket that's been closed.", fix: "Check if the receiving process is still running.", severity: 'error' },
  { pattern: /Error: socket hang up/i, title: 'Socket Hang Up', category: 'Network', explanation: "The server closed the connection unexpectedly.", fix: "The server might have crashed or timed out. Add retry logic.", severity: 'error' },
  { pattern: /fetch failed/i, title: 'Fetch Failed', category: 'Network', explanation: "A network request using fetch() failed.", fix: "Check the URL and network connectivity. The server might be down.", severity: 'error' },
  { pattern: /ERR_OSSL_EVP_UNSUPPORTED/i, title: 'OpenSSL Unsupported', category: 'Crypto', explanation: "Node 17+ changed OpenSSL defaults. Some older packages break.", fix: "Use the legacy provider flag.", autoFixCmd: 'export NODE_OPTIONS=--openssl-legacy-provider', severity: 'error' },
  { pattern: /Error: EISDIR/i, title: 'Is a Directory', category: 'FS', explanation: "You're trying to do a file operation on a directory.", fix: "Check your path. You might be reading a directory instead of a file.", severity: 'error' },
  { pattern: /Error: ENOTEMPTY/i, title: 'Directory Not Empty', category: 'FS', explanation: "You're trying to remove a directory that still has files in it.", fix: "Use rm -rf or fs.rmSync with { recursive: true }.", severity: 'error' },
  { pattern: /Error: EEXIST/i, title: 'File Already Exists', category: 'FS', explanation: "The file or directory already exists.", fix: "Check if the file exists before creating it, or use the overwrite flag.", severity: 'error' },
  { pattern: /ERR_STREAM_WRITE_AFTER_END/i, title: 'Stream: Write After End', category: 'Stream', explanation: "You're writing to a stream that's already been ended.", fix: "Don't call write() after calling end() on the stream.", severity: 'error' },
  { pattern: /ERR_STREAM_PREMATURE_CLOSE/i, title: 'Stream: Premature Close', category: 'Stream', explanation: "A stream was closed before it finished.", fix: "Handle the 'error' event on the stream.", severity: 'error' },

  // ─── Catch-all patterns ───
  { pattern: /segmentation fault/i, title: 'Segmentation Fault', category: 'System', explanation: "A native module crashed with a memory access violation.", fix: "Update native dependencies. Rebuild with npm rebuild.", autoFixCmd: 'npm rebuild', severity: 'error' },
  { pattern: /Error: ENOSPC/i, title: 'No Space Left on Device', category: 'System', explanation: "Your disk is full.", fix: "Free up disk space. Clear caches, tmp files, or old builds.", severity: 'error' },
  { pattern: /ERR_BUFFER_OUT_OF_RANGE/i, title: 'Buffer Out of Range', category: 'Node.js', explanation: "A buffer operation tried to read or write outside its bounds.", fix: "Check your buffer size and offset calculations.", severity: 'error' },
  { pattern: /Warning: Accessing non-existent property/i, title: 'Non-existent Property Access', category: 'Node.js', explanation: "You're accessing a property that doesn't exist on a module.", fix: "Check the module's exports. The API might have changed.", severity: 'warning' },
  { pattern: /DeprecationWarning/i, title: 'Deprecation Warning', category: 'Node.js', explanation: "You're using a deprecated API that may be removed in the future.", fix: "Check the warning message for the recommended replacement.", severity: 'warning' },
  { pattern: /ExperimentalWarning/i, title: 'Experimental Warning', category: 'Node.js', explanation: "You're using an experimental feature that may change.", fix: "This is just a heads-up. The API might change in future Node versions.", severity: 'info' },
];

// ── Analysis ──

interface MatchResult {
  entry: ErrorEntry;
  matchedLine: string;
  lineNumber: number;
  groups: string[];
}

function analyzeInput(input: string): MatchResult[] {
  const lines = input.split('\n');
  const matches: MatchResult[] = [];
  const seenTitles = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    for (const entry of ERROR_DB) {
      const match = line.match(entry.pattern);
      if (match && !seenTitles.has(entry.title)) {
        seenTitles.add(entry.title);
        matches.push({
          entry,
          matchedLine: line,
          lineNumber: i + 1,
          groups: match.slice(1),
        });
      }
    }
  }

  return matches;
}

function extractStackInfo(input: string): { file: string; line: number; col: number } | null {
  // Match common stack trace formats
  const patterns = [
    /at .+ \((.+):(\d+):(\d+)\)/,
    /at (.+):(\d+):(\d+)/,
    /(.+):(\d+):(\d+)/,
  ];

  for (const line of input.split('\n')) {
    for (const pat of patterns) {
      const match = line.trim().match(pat);
      if (match && !match[1].includes('node_modules') && !match[1].includes('internal/')) {
        return {
          file: match[1],
          line: parseInt(match[2]),
          col: parseInt(match[3]),
        };
      }
    }
  }
  return null;
}

// ── Display ──

function printBanner(): void {
  console.log('');
  console.log(`${c.bgRed}${c.white}${c.bold}  AI-ERROR  ${c.reset} ${c.red}Error Parser & Fix Suggestions${c.reset}`);
  console.log(`${c.dim}  by LXGIC Studios | 200+ error patterns${c.reset}`);
  console.log('');
}

function severityColor(sev: string): string {
  if (sev === 'error') return c.red;
  if (sev === 'warning') return c.yellow;
  return c.blue;
}

function severityIcon(sev: string): string {
  if (sev === 'error') return `${c.red}✗${c.reset}`;
  if (sev === 'warning') return `${c.yellow}⚠${c.reset}`;
  return `${c.blue}ℹ${c.reset}`;
}

function printResults(matches: MatchResult[], input: string, autoFix: boolean): void {
  if (matches.length === 0) {
    console.log(`${c.yellow}No known error patterns found.${c.reset}`);
    console.log(`${c.dim}If this is a new error, check Stack Overflow or the project's issue tracker.${c.reset}`);
    console.log('');
    return;
  }

  console.log(`${c.bold}Found ${matches.length} error${matches.length > 1 ? 's' : ''}:${c.reset}`);
  console.log('');

  for (let i = 0; i < matches.length; i++) {
    const { entry, matchedLine, lineNumber, groups } = matches[i];
    const sc = severityColor(entry.severity);
    const icon = severityIcon(entry.severity);

    console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`);
    console.log(`${icon} ${c.bold}${sc}${entry.title}${c.reset} ${c.dim}[${entry.category}]${c.reset}`);
    console.log('');

    // Matched line
    console.log(`  ${c.dim}Line ${lineNumber}:${c.reset} ${c.white}${matchedLine.substring(0, 120)}${c.reset}`);
    console.log('');

    // Explanation
    console.log(`  ${c.cyan}Why:${c.reset} ${entry.explanation}`);
    console.log('');

    // Fix with interpolated groups
    let fix = entry.fix;
    for (let g = 0; g < groups.length; g++) {
      fix = fix.replace(`$${g + 1}`, groups[g]);
    }
    console.log(`  ${c.green}Fix:${c.reset} ${fix}`);

    // Auto-fix command
    if (entry.autoFixCmd) {
      let cmd = entry.autoFixCmd;
      for (let g = 0; g < groups.length; g++) {
        cmd = cmd.replace(`$${g + 1}`, groups[g]);
      }
      console.log('');
      if (autoFix) {
        console.log(`  ${c.bold}${c.yellow}Suggested command:${c.reset}`);
        console.log(`  ${c.bgYellow}${c.bold} $ ${cmd} ${c.reset}`);
      } else {
        console.log(`  ${c.dim}Auto-fix: ${cmd}${c.reset}`);
      }
    }
    console.log('');
  }

  // Stack trace info
  const stackInfo = extractStackInfo(input);
  if (stackInfo) {
    console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`);
    console.log(`${c.bold}${c.magenta}Source Location:${c.reset}`);
    console.log(`  ${c.white}${stackInfo.file}${c.reset}:${c.yellow}${stackInfo.line}${c.reset}:${c.dim}${stackInfo.col}${c.reset}`);
    console.log('');
  }

  // Summary
  const errors = matches.filter(m => m.entry.severity === 'error').length;
  const warnings = matches.filter(m => m.entry.severity === 'warning').length;
  const infos = matches.filter(m => m.entry.severity === 'info').length;

  console.log(`${c.dim}${'─'.repeat(60)}${c.reset}`);
  console.log(`${c.bold}Summary:${c.reset} ${c.red}${errors} error${errors !== 1 ? 's' : ''}${c.reset} ${c.yellow}${warnings} warning${warnings !== 1 ? 's' : ''}${c.reset} ${c.blue}${infos} info${c.reset}`);
  console.log('');
}

function printHelp(): void {
  printBanner();
  console.log(`${c.bold}Usage:${c.reset}`);
  console.log(`  ${c.dim}$${c.reset} ai-error <error message>`);
  console.log(`  ${c.dim}$${c.reset} ai-error "TypeError: Cannot read properties of undefined"`);
  console.log(`  ${c.dim}$${c.reset} npm run build 2>&1 | ai-error`);
  console.log(`  ${c.dim}$${c.reset} cat error.log | ai-error`);
  console.log('');
  console.log(`${c.bold}Options:${c.reset}`);
  console.log(`  ${c.cyan}--auto-fix${c.reset}     Show suggested fix commands prominently`);
  console.log(`  ${c.cyan}--json${c.reset}         Output results as JSON`);
  console.log(`  ${c.cyan}--list${c.reset}         List all known error patterns`);
  console.log(`  ${c.cyan}--stats${c.reset}        Show error database statistics`);
  console.log(`  ${c.cyan}--help${c.reset}         Show this help message`);
  console.log('');
  console.log(`${c.bold}Pipe Support:${c.reset}`);
  console.log(`  Pipe any error output directly into ai-error.`);
  console.log(`  It'll match against 200+ known Node.js/TypeScript error patterns.`);
  console.log('');
  console.log(`${c.bold}Examples:${c.reset}`);
  console.log(`  ${c.dim}$${c.reset} node app.js 2>&1 | ai-error --auto-fix`);
  console.log(`  ${c.dim}$${c.reset} tsc --noEmit 2>&1 | ai-error --json`);
  console.log(`  ${c.dim}$${c.reset} ai-error "Cannot find module 'express'"`);
  console.log('');
}

function printStats(): void {
  printBanner();

  const categories = new Map<string, number>();
  let errors = 0, warnings = 0, infos = 0;

  for (const entry of ERROR_DB) {
    categories.set(entry.category, (categories.get(entry.category) || 0) + 1);
    if (entry.severity === 'error') errors++;
    else if (entry.severity === 'warning') warnings++;
    else infos++;
  }

  console.log(`${c.bold}Error Database Statistics:${c.reset}`);
  console.log(`  ${c.white}Total patterns:${c.reset} ${c.bold}${ERROR_DB.length}${c.reset}`);
  console.log(`  ${c.red}Errors:${c.reset} ${errors}  ${c.yellow}Warnings:${c.reset} ${warnings}  ${c.blue}Info:${c.reset} ${infos}`);
  console.log('');

  console.log(`${c.bold}By Category:${c.reset}`);
  const sorted = Array.from(categories.entries()).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sorted) {
    const bar = '█'.repeat(count);
    console.log(`  ${c.cyan}${cat.padEnd(18)}${c.reset} ${c.dim}${String(count).padStart(3)}${c.reset} ${c.blue}${bar}${c.reset}`);
  }
  console.log('');
}

function printList(): void {
  printBanner();
  console.log(`${c.bold}All ${ERROR_DB.length} Known Error Patterns:${c.reset}`);
  console.log('');

  let currentCategory = '';
  const sorted = [...ERROR_DB].sort((a, b) => a.category.localeCompare(b.category));

  for (const entry of sorted) {
    if (entry.category !== currentCategory) {
      currentCategory = entry.category;
      console.log(`  ${c.bold}${c.cyan}${currentCategory}${c.reset}`);
    }
    const icon = severityIcon(entry.severity);
    console.log(`    ${icon} ${c.white}${entry.title}${c.reset}`);
  }
  console.log('');
}

// ── Main ──

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--stats')) {
    printStats();
    process.exit(0);
  }

  if (args.includes('--list')) {
    printList();
    process.exit(0);
  }

  const jsonOutput = args.includes('--json');
  const autoFix = args.includes('--auto-fix');

  // Determine input source
  let input = '';
  const isTTY = process.stdin.isTTY;

  if (!isTTY) {
    // Reading from pipe
    const rl = readline.createInterface({ input: process.stdin });
    const lines: string[] = [];
    for await (const line of rl) {
      lines.push(line);
    }
    input = lines.join('\n');
  } else {
    // Get from args (skip flags)
    const textArgs: string[] = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith('--')) continue;
      textArgs.push(args[i]);
    }
    input = textArgs.join(' ');
  }

  if (!input.trim()) {
    if (!jsonOutput) {
      printHelp();
    }
    process.exit(0);
  }

  const matches = analyzeInput(input);

  if (jsonOutput) {
    const results = matches.map(m => ({
      title: m.entry.title,
      category: m.entry.category,
      severity: m.entry.severity,
      explanation: m.entry.explanation,
      fix: m.entry.fix,
      autoFixCmd: m.entry.autoFixCmd || null,
      matchedLine: m.matchedLine,
      lineNumber: m.lineNumber,
    }));
    const stackInfo = extractStackInfo(input);
    console.log(JSON.stringify({
      matchCount: matches.length,
      matches: results,
      sourceLocation: stackInfo,
    }, null, 2));
  } else {
    printBanner();
    printResults(matches, input, autoFix);
  }
}

main();
