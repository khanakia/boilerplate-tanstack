import fs from 'node:fs'
import type { Command } from 'commander'
import { config } from 'dotenv'
import { getSecretsFilePath } from '../lib/secrets.js'

export function registerSecretsRead(program: Command) {
  program
    .command('gh:secrets:read')
    .description('Display secret keys (values hidden)')
    .requiredOption('--env <env>', 'Environment to read')
    .action((opts: { env: string }) => {
      const secretsFilePath = getSecretsFilePath(opts.env)

      if (!fs.existsSync(secretsFilePath)) {
        console.error(`Error: ${secretsFilePath} not found. Run gh:secrets:update first.`)
        process.exit(1)
      }

      const parsed = config({ path: secretsFilePath })
      const secrets = parsed.parsed || {}

      console.log(`\nSecrets for environment: ${opts.env}`)
      console.log(`File: ${secretsFilePath}\n`)

      for (const [key, value] of Object.entries(secrets)) {
        if (!value) continue
        const preview =
          value.length > 20
            ? `${value.slice(0, 10)}...${value.slice(-5)} (${value.length} chars)`
            : '***'
        console.log(`  ${key} = ${preview}`)
      }
    })
}
