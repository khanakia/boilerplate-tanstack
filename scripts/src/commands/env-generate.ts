import fs from 'node:fs'
import path from 'node:path'
import type { Command } from 'commander'
import { ROOT_DIR } from '../lib/constants.js'

export function registerEnvGenerate(program: Command) {
  program
    .command('env:generate')
    .description('Generate .env.{env} from .env.example')
    .requiredOption('--env <env>', 'Environment name')
    .action((opts: { env: string }) => {
      const examplePath = path.join(ROOT_DIR, '.env.example')
      const targetPath = path.join(ROOT_DIR, `.env.${opts.env}`)

      if (!fs.existsSync(examplePath)) {
        console.error('Error: .env.example not found')
        process.exit(1)
      }

      if (fs.existsSync(targetPath)) {
        console.log(`File already exists: ${targetPath}`)
        console.log('Skipping to avoid overwriting existing configuration.')
        return
      }

      fs.copyFileSync(examplePath, targetPath)
      console.log(`Created: ${targetPath}`)
      console.log('Edit this file with your environment-specific values.')
    })
}
