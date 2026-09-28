import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw Image Data (with filter byte 0 at start of each scanline)
  const rowLength = width * 4 + 1;
  const rawData = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowLength;
    rawData[rowStart] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 4;
      // Draw rounded disc
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      const radius = width * 0.45;

      if (dist <= radius) {
        // Draw tactile cyan/zinc disc with inner mic dot
        if (dist <= radius * 0.4) {
          rawData[pixelStart] = 6;     // Cyan accent
          rawData[pixelStart + 1] = 182;
          rawData[pixelStart + 2] = 212;
          rawData[pixelStart + 3] = 255;
        } else {
          rawData[pixelStart] = 24;    // Zinc dark base
          rawData[pixelStart + 1] = 24;
          rawData[pixelStart + 2] = 27;
          rawData[pixelStart + 3] = 255;
        }
      } else {
        // Transparent border
        rawData[pixelStart] = 0;
        rawData[pixelStart + 1] = 0;
        rawData[pixelStart + 2] = 0;
        rawData[pixelStart + 3] = 0;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const buffer = Buffer.alloc(8 + length + 4);
  buffer.writeUInt32BE(length, 0);
  buffer.write(type, 4, 4, 'ascii');
  data.copy(buffer, 8);

  const crc = crc32(buffer.subarray(4, 8 + length));
  buffer.writeInt32BE(crc, 8 + length);
  return buffer;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return crc ^ -1;
}

const iconsDir = path.resolve(process.cwd(), 'public/icons');
fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, 'icon-16.png'), createPNG(16, 16, 6, 182, 212));
fs.writeFileSync(path.join(iconsDir, 'icon-48.png'), createPNG(48, 48, 6, 182, 212));
fs.writeFileSync(path.join(iconsDir, 'icon-128.png'), createPNG(128, 128, 6, 182, 212));

console.log('Icons generated successfully!');
