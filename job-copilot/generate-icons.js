// Run this with: node generate-icons.js
// Generates simple PNG icons for the Chrome extension

const { createCanvas } = require('canvas');
const fs = require('fs');

// If canvas is not available, create simple SVG-based icons
const sizes = [16, 48, 128];

sizes.forEach((size) => {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#0f1117"/>
  <g transform="translate(${size / 2}, ${size / 2})">
    <polygon points="0,${-size * 0.3} ${-size * 0.3},${-size * 0.05} 0,${size * 0.2} ${size * 0.3},${-size * 0.05}" fill="#36d6b5" opacity="0.9"/>
    <line x1="${-size * 0.3}" y1="${size * 0.15}" x2="0" y2="${size * 0.35}" stroke="#36d6b5" stroke-width="${size * 0.06}" stroke-linecap="round" opacity="0.6"/>
    <line x1="0" y1="${size * 0.35}" x2="${size * 0.3}" y2="${size * 0.15}" stroke="#36d6b5" stroke-width="${size * 0.06}" stroke-linecap="round" opacity="0.6"/>
  </g>
</svg>`;
  fs.writeFileSync(`public/icons/icon${size}.svg`, svg);
});

console.log('Icons generated!');
