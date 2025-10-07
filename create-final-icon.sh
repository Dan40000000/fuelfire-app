#!/bin/bash

# Create a solid 1024x1024 icon using ImageMagick-like approach with sips
sips -s format png \
     -z 1024 1024 \
     --setProperty format jpeg \
     --setProperty format png \
     /Users/danperry/CascadeProjects/fuelfire-app/public/icon-192.png \
     --out /tmp/temp-icon.png

# Create solid background version
python3 -c "
from PIL import Image
import os

# Create new 1024x1024 image with solid background
img = Image.new('RGB', (1024, 1024), '#4B9CD3')

# Save without alpha
img.save('/Users/danperry/CascadeProjects/fuelfire-app/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024@1x.png', 'PNG')
print('Created solid 1024x1024 icon')
"