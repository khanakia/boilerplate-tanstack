import fs from 'node:fs'
import path from 'node:path'
import { KEYS_DIR } from './constants.js'

export interface Secret {
  key: string
  value: string
}

function fileNameToSecretKey(filename: string): string {
  // Remove last extension, uppercase, replace -/. with _
  const withoutExt = filename.replace(/\.[^.]+$/, '')
  return withoutExt.toUpperCase().replace(/[-.\s]/g, '_') + '_KEY_B64'
}

export function processKeyFiles(keyFilesJSON: string): Secret[] {
  const filenames: string[] = JSON.parse(keyFilesJSON)
  const secrets: Secret[] = []

  for (const filename of filenames) {
    const filePath = path.join(KEYS_DIR, filename)
    if (!fs.existsSync(filePath)) {
      console.warn(`Warning: key file not found: ${filePath}`)
      continue
    }

    const content = fs.readFileSync(filePath)
    const encoded = content.toString('base64')
    const key = fileNameToSecretKey(filename)

    secrets.push({ key, value: encoded })
  }

  return secrets
}
