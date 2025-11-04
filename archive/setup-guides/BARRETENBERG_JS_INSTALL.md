# Barretenberg Installation via npm (Easiest Method)

## Problem
GitHub releases for prebuilt Barretenberg binaries are getting 404 errors.

## Solution: Use @aztec/bb.js

This is a JavaScript/WebAssembly version of Barretenberg that works without manual binary installation.

## Installation

```bash
cd /Users/0xblockbird/Cursor/Bermuda/baanx/demo/mock-backend
npm install @aztec/bb.js
```

## Next Steps

The integration code in `zkProver.ts` needs minor updates to use the JS library instead of CLI commands.

Want me to update the code to use `@aztec/bb.js`?



