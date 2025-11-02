# SDK Import Resolution Status

## Issue
SDK build files are ES modules that require dependencies (`ethers`, `poseidon2-compression-ts`, etc.). Next.js webpack needs to resolve these dependencies when importing SDK files.

## Solution Implemented

### 1. Next.js Webpack Configuration (`next.config.js`)
- Added SDK's `node_modules` to module resolution path
- Aliased `poseidon2-compression-ts` to SDK's version
- Aliased other SDK dependencies to merchant-demo's versions
- Created `@sdk` alias for SDK build directory

### 2. Witness Generator (`lib/witnessGenerator.ts`)
- Uses `fileURLToPath` to get current file directory
- Constructs relative path to SDK build directory
- Uses `pathToFileURL` to convert to file:// URLs for ES module imports
- Dynamically imports SDK modules using file:// URLs

### 3. Dependencies Installed
- ✅ `ethers` in merchant-demo
- ✅ `@noble/curves` in merchant-demo
- ✅ `@stablelib/x25519` in merchant-demo
- ✅ `@stablelib/xchacha20poly1305` in merchant-demo

### Remaining Issue
SDK's `node_modules` need to be installed. The SDK has private GitHub dependencies that require authentication:
- `poseidon2-compression-ts` (GitHub: BermudaBay/poseidon2-compression-ts)

## Next Steps
1. Install SDK dependencies: `cd demo/ui/lib/sdk && npm install`
2. This requires GitHub authentication for private repos
3. Once installed, Next.js webpack will resolve dependencies correctly

## Workaround (If SDK install fails)
The system currently uses file:// URLs for direct ES module imports. This works in Node.js but Next.js webpack may still have issues resolving transitive dependencies.

Alternative: Copy SDK build files to merchant-demo with bundled dependencies, or use a monorepo setup.

