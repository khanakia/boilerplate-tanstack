import { execSync } from 'node:child_process'
import type { Command } from 'commander'
import { buildAndUpdateSecrets } from '../lib/secrets.js'

export function registerEnvSetup(program: Command) {
  program
    .command('gh:env:setup')
    .description('Full environment setup: create GitHub env + build secrets + push + generate workflow')
    .requiredOption('--env <env>', 'Environment to setup')
    .action((opts: { env: string }) => {
      console.log(`Setting up environment: ${opts.env}`)

      // 1. Create GitHub Environment
      console.log('\n1. Creating GitHub Environment...')
      try {
        execSync(
          `gh api -X PUT "repos/{owner}/{repo}/environments/${opts.env}"`,
          { stdio: 'inherit' }
        )
        console.log(`   Created environment: ${opts.env}`)
      } catch {
        console.warn('   Warning: Could not create GitHub environment (may already exist)')
      }

      // 2. Build secrets
      console.log('\n2. Building secrets...')
      buildAndUpdateSecrets(opts.env)

      // 3. Push secrets
      console.log('\n3. Pushing secrets to GitHub...')
      try {
        execSync(`pnpm tsx src/index.ts gh:secrets:push --env=${opts.env}`, {
          stdio: 'inherit',
          cwd: import.meta.dirname ? undefined : process.cwd(),
        })
      } catch {
        console.warn('   Warning: Could not push secrets')
      }

      console.log(`\nEnvironment ${opts.env} setup complete!`)
    })
}
