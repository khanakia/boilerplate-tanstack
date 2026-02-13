import type { Command } from 'commander'
import { buildAndUpdateSecrets, discoverEnvironments } from '../lib/secrets.js'

export function registerSecretsUpdate(program: Command) {
  program
    .command('gh:secrets:update')
    .description('Build secrets and generate deploy.yml from .env.{env} files')
    .option('--env <env>', 'Specific environment (default: all)')
    .action((opts: { env?: string }) => {
      const envs = opts.env ? [opts.env] : discoverEnvironments()

      if (envs.length === 0) {
        console.log('No .env.{env} files found')
        return
      }

      console.log(`Environments: ${envs.join(', ')}`)
      for (const env of envs) {
        buildAndUpdateSecrets(env)
      }
      console.log('\nDone!')
    })
}
