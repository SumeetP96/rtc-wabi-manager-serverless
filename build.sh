#!/bin/bash
set -e

# Clean and create build directory
rm -rf .build
mkdir -p .build

# Install Linux ARM64 dependencies
export npm_config_platform="linux"
export npm_config_arch="arm64"
npm ci --omit=dev
npm install @libsql/linux-arm64-gnu

# Install esbuild if needed
if ! command -v esbuild &> /dev/null; then
  npm install -g esbuild
fi

# Build all functions
build_function() {
  FUNCTION_NAME=$1
  SRC_DIR="$FUNCTION_NAME"
  BUILD_DIR=".build/$FUNCTION_NAME"

  echo "Building $FUNCTION_NAME..."

  # Create build directory structure
  mkdir -p "$BUILD_DIR/node_modules/@libsql"
  
  # Bundle with esbuild
  esbuild "$SRC_DIR/handler.ts" \
    --bundle \
    --platform=node \
    --target=node22 \
    --outfile="$BUILD_DIR/handler.js" \
    --external:aws-lambda

  # Copy EXACT libsql binaries with proper permissions
  cp -R --preserve=mode,timestamps \
    "node_modules/@libsql/linux-arm64-gnu" \
    "$BUILD_DIR/node_modules/@libsql/"

  # Create zip with proper directory structure
  (cd "$BUILD_DIR" && \
   zip -qr "../${FUNCTION_NAME}.zip" ./*)
}

# Build functions
build_function "wabi-webhook-verify"
build_function "wabi-webhook-event-handler"
build_function "wabi-push-template"
build_function "wabi-message-queue-handler"

npm uninstall @libsql/linux-arm64-gnu
npm ci

echo "Build complete! Artifacts in .build/"