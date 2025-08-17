#!/bin/bash

echo "🚀 Building Cointeligencia Android APK..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Export the app bundle
echo "📱 Exporting app bundle..."
npx expo export --platform android

# Check if export was successful
if [ ! -d "dist" ]; then
    echo "❌ Error: Export failed. dist directory not found."
    exit 1
fi

echo "✅ Export completed successfully!"
echo "📁 Exported files are in the 'dist' directory"
echo ""
echo "📋 Next steps:"
echo "1. Install Android Studio and Android SDK"
echo "2. Set ANDROID_HOME environment variable"
echo "3. Run: npx expo run:android"
echo ""
echo "🌐 Or use Expo's cloud build service:"
echo "1. Create Expo account: https://expo.dev/signup"
echo "2. Login: eas login"
echo "3. Build: eas build --platform android --profile preview"
echo ""
echo "📱 For testing, you can also use Expo Go app:"
echo "1. Install Expo Go from Play Store"
echo "2. Run: npx expo start"
echo "3. Scan QR code with Expo Go app"

# Create a simple APK info file
cat > dist/build-info.txt << EOF
Cointeligencia Android App
Build Date: $(date)
Version: 1.0.0
Platform: Android
Export Status: Success

To build APK:
1. Install Android Studio
2. Set ANDROID_HOME
3. Run: npx expo run:android

Or use cloud build:
1. eas login
2. eas build --platform android --profile preview
EOF

echo "📄 Build info saved to dist/build-info.txt"
