import fs from 'node:fs'
import { execSync } from 'node:child_process'
import type { Command } from 'commander'
import { config } from 'dotenv'
import { discoverEnvironments, getSecretsFilePath } from '../lib/secrets.js'

export function registerSecretsPush(program: Command) {
  program
    .command('gh:secrets:push')
    .description('Push secrets to GitHub Environments')
    .option('--env <env>', 'Specific environment (default: all)')
    .action((opts: { env?: string }) => {
      const envs = opts.env ? [opts.env] : discoverEnvironments()

      if (envs.length === 0) {
        console.log('No environments found')
        return
      }

      for (const env of envs) {
        pushSecretsToGithubEnvironment(env)
      }
      console.log('\nDone!')
    })
}

function pushSecretsToGithubEnvironment(env: string): void {
  const secretsFilePath = getSecretsFilePath(env)

  if (!fs.existsSync(secretsFilePath)) {
    console.error(`Error: ${secretsFilePath} not found. Run gh:secrets:update first.`)
    return
  }

  console.log(`\nPushing secrets for environment: ${env}`)

  const parsed = config({ path: secretsFilePath })
  const secrets = parsed.parsed || {}

  let pushed = 0
  let skipped = 0

  for (const [key, value] of Object.entries(secrets)) {
    if (!value) continue

    // Skip GITHUB_* prefixed secrets (reserved by GitHub)
    if (key.startsWith('GITHUB_')) {
      console.log(`  Skipping ${key} (reserved by GitHub, used for act only)`)
      skipped++
      continue
    }

    try {
      execSync(`gh secret set ${key} --env ${env}`, {
        input: value,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      console.log(`  Set ${key}`)
      pushed++
    } catch (error) {
      console.error(`  Failed to set ${key}:`, (error as Error).message)
    }
  }

  console.log(`  Pushed: ${pushed}, Skipped: ${skipped}`)
}
