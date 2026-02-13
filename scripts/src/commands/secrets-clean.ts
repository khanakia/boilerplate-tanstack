import fs from 'node:fs'
import { execSync } from 'node:child_process'
import type { Command } from 'commander'
import { config } from 'dotenv'
import { getSecretsFilePath } from '../lib/secrets.js'

export function registerSecretsClean(program: Command) {
  program
    .command('gh:secrets:clean')
    .description('Remove orphan secrets from GitHub Environment')
    .requiredOption('--env <env>', 'Environment to clean')
    .action((opts: { env: string }) => {
      const secretsFilePath = getSecretsFilePath(opts.env)

      // Get current local secrets
      const localSecrets = new Set<string>()
      if (fs.existsSync(secretsFilePath)) {
        const parsed = config({ path: secretsFilePath })
        for (const key of Object.keys(parsed.parsed || {})) {
          if (!key.startsWith('GITHUB_')) {
            localSecrets.add(key)
          }
        }
      }

      // Get remote secrets from GitHub
      let remoteSecrets: string[] = []
      try {
        const output = execSync(
          `gh secret list --env ${opts.env} --json name -q '.[].name'`,
          { encoding: 'utf-8' }
        ).trim()
        remoteSecrets = output ? output.split('\n') : []
      } catch {
        console.error('Failed to list GitHub secrets. Ensure `gh` CLI is authenticated.')
        process.exit(1)
      }

      // Find orphans (in GitHub but not in local secrets)
      const orphans = remoteSecrets.filter((name) => !localSecrets.has(name))

      if (orphans.length === 0) {
        console.log(`No orphan secrets found in ${opts.env}`)
        return
      }

      console.log(`Found ${orphans.length} orphan secret(s) in ${opts.env}:`)
      for (const name of orphans) {
        console.log(`  Removing: ${name}`)
        try {
          execSync(`gh secret delete ${name} --env ${opts.env}`, {
            stdio: ['pipe', 'pipe', 'pipe'],
          })
        } catch (error) {
          console.error(`  Failed to remove ${name}:`, (error as Error).message)
        }
      }
      console.log('Done!')
    })
}
