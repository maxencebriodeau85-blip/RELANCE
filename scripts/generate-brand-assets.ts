import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { brandSvg } from '../lib/brand/artwork'

async function main() {
  const icon = brandSvg({ wordmark: false, tile: true })
  const appleIcon = brandSvg({ wordmark: false, light: true, tile: true })
  await Promise.all([
    writeFile('public/brand/encair-logo.svg', brandSvg()),
    writeFile('public/brand/encair-logo-blanc.svg', brandSvg({ light: true })),
    writeFile('public/brand/encair-symbole.svg', brandSvg({ wordmark: false })),
    writeFile('app/icon.svg', icon),
    writeFile('app/apple-icon.svg', appleIcon),
    sharp(Buffer.from(appleIcon)).resize(180, 180).png().toFile('app/apple-icon.png'),
  ])
  // ICO directory with three PNG representations for browser compatibility.
  const dimensions = [16, 32, 48]
  const images = await Promise.all(dimensions.map(size => sharp(Buffer.from(icon)).resize(size, size).png().toBuffer()))
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  for (let i = 0; i < images.length; i++) {
    const entry = 6 + i * 16
    header[entry] = dimensions[i]
    header[entry + 1] = dimensions[i]
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(images[i].length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += images[i].length
  }
  await writeFile('app/favicon.ico', Buffer.concat([header, ...images]))
}

main().catch(error => { console.error(error); process.exitCode = 1 })
