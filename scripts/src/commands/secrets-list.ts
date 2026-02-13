import type { Command } from 'commander'
import { discoverEnvironments } from '../lib/secrets.js'

export function registerSecretsList(program: Command) {
  program
    .command('gh:secrets:list')
    .description('List available environments')
    .action(() => {
      const envs = discoverEnvironments()

      if (envs.length === 0) {
        console.log('No .env.{env} files found')
        return
      }

      console.log('Available environments:')
      for (const env of envs) {
        console.log(`  - ${env} (.env.${env})`)
      }
    })
}
