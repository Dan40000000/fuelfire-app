const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function generateIcon() {
    try {
        // Create 512x512 canvas
        const canvas = createCanvas(512, 512);
        const ctx = canvas.getContext('2d');
        
        // Load flame image
        const flameImg = await loadImage('./flame-source.webp');
        
        // Rounded rect function
        function roundedRect(ctx, x, y, width, height, radius) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }
        
        // Hexagon function
        function drawHexagon(ctx, centerX, centerY, size, filled = true) {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                const x = centerX + size * Math.cos(angle);
                const y = centerY + size * Math.sin(angle);
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            
            if (filled) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
        }
        
        // Carolina Blue gradient background
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#4B9CD3');
        gradient.addColorStop(1, '#13294B');
        roundedRect(ctx, 0, 0, 512, 512, 90);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // White hexagon outline
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 8;
        drawHexagon(ctx, 256, 256, 120, false);
        
        // Clip to hexagon
        ctx.save();
        drawHexagon(ctx, 256, 256, 112);
        ctx.clip();
        
        // Large flame backdrop
        ctx.drawImage(flameImg, 176, 160, 160, 180);
        
        // WF at base of flame
        ctx.strokeStyle = '#13294B';
        ctx.lineWidth = 6;
        ctx.font = 'bold 85px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText('WF', 256, 310);
        
        ctx.fillStyle = 'white';
        ctx.fillText('WF', 256, 310);
        
        ctx.restore();
        
        // Text below hexagon
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('NUTRITION', 256, 410);
        ctx.fillText('&', 256, 435);
        ctx.fillText('FITNESS', 256, 460);
        
        // Save as PNG
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync('./public/icon-512.png', buffer);
        
        // Create 192x192 version
        const smallCanvas = createCanvas(192, 192);
        const smallCtx = smallCanvas.getContext('2d');
        smallCtx.drawImage(canvas, 0, 0, 512, 512, 0, 0, 192, 192);
        
        const smallBuffer = smallCanvas.toBuffer('image/png');
        fs.writeFileSync('./public/icon-192.png', buffer);
        
        console.log('Icons generated successfully!');
        
    } catch (error) {
        console.error('Error generating icon:', error);
        // Fallback - just copy the flame as a basic icon
        try {
            fs.copyFileSync('./flame-source.webp', './public/icon-512.png');
            console.log('Used fallback icon');
        } catch (fallbackError) {
            console.error('Fallback failed too:', fallbackError);
        }
    }
}

// Only run if canvas is available, otherwise use fallback
try {
    generateIcon();
} catch (error) {
    console.log('Canvas not available, using fallback...');
    const fs = require('fs');
    try {
        fs.copyFileSync('./flame-source.webp', './public/icon-512.png');
        console.log('Fallback icon copied');
    } catch (e) {
        console.log('No canvas, will use web icons');
    }
}