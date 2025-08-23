const fs = require('fs');

// Icon sizes needed for iOS
const iconSizes = [
    'AppIcon-20@1x.png',
    'AppIcon-20@2x.png',
    'AppIcon-20@3x.png',
    'AppIcon-29@1x.png',
    'AppIcon-29@2x.png',
    'AppIcon-29@3x.png',
    'AppIcon-40@1x.png',
    'AppIcon-40@2x.png',
    'AppIcon-40@3x.png',
    'AppIcon-60@2x.png',
    'AppIcon-60@3x.png',
    'AppIcon-76@1x.png',
    'AppIcon-76@2x.png',
    'AppIcon-83.5@2x.png',
    'AppIcon-1024@1x.png'
];

function generateIOSIcons() {
    console.log('Generating iOS app icons...');
    
    const sourceIcon = './public/icon-512.png';
    const outputDir = './ios/App/App/Assets.xcassets/AppIcon.appiconset/';
    
    for (const iconName of iconSizes) {
        try {
            fs.copyFileSync(sourceIcon, `${outputDir}${iconName}`);
            console.log(`✓ Generated ${iconName}`);
        } catch (copyError) {
            console.log(`⚠️  Could not copy ${iconName}: ${copyError.message}`);
        }
    }
    
    console.log('📱 iOS icons ready for App Store submission!');
}

generateIOSIcons();