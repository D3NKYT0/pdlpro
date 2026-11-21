import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

function packagedIcon(directory, filename) {
  const archive = fileURLToPath(new URL(`../assets/${directory}.tar.gz`, import.meta.url))
  return execFileSync('tar', ['-xzOf', archive, `${directory}/${filename}`])
}

it('ships the Eternity item image at the URL used by the catalog', () => {
  const image = packagedIcon('item-icons', '39634.jpg')
  expect(image.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]))
  expect(packagedIcon('item-icons', '17290.jpg').subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]))
})

it('ships the shared Common Craft icon and the exact Mass Lightning Strike variant', () => {
  expect(packagedIcon('skill-icons', '1322.png')).toEqual(packagedIcon('skill-icons', '172.png'))
  expect(packagedIcon('skill-icons', '10094.png').subarray(0, 8))
    .toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
})
