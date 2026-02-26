import sharp from 'sharp';
import { CONFIG } from '../config';

const COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b',
];

export async function generateFakePhoto(agentName: string, index: number): Promise<Buffer> {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const timestamp = new Date().toISOString().slice(0, 19);
  const label = `${agentName} #${index + 1}\n${timestamp}`;

  // Create an SVG overlay for the text
  const svg = `
    <svg width="${CONFIG.PHOTO_WIDTH}" height="${CONFIG.PHOTO_HEIGHT}">
      <style>
        .title { fill: white; font-size: 36px; font-family: sans-serif; font-weight: bold; }
        .sub { fill: rgba(255,255,255,0.8); font-size: 24px; font-family: monospace; }
      </style>
      <text x="50%" y="45%" text-anchor="middle" class="title">${agentName}</text>
      <text x="50%" y="55%" text-anchor="middle" class="sub">Photo #${index + 1}</text>
      <text x="50%" y="65%" text-anchor="middle" class="sub">${timestamp}</text>
    </svg>
  `;

  return sharp({
    create: {
      width: CONFIG.PHOTO_WIDTH,
      height: CONFIG.PHOTO_HEIGHT,
      channels: 3,
      background: color,
    },
  })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 70 })
    .toBuffer();
}
