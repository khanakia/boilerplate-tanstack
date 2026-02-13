import { execSync } from 'node:child_process'
import type { Command } from 'commander'

export function registerEnvCreate(program: Command) {
  program
    .command('gh:env:create')
    .description('Create a GitHub Environment')
    .requiredOption('--env <env>', 'Environment name to create')
    .action((opts: { env: string }) => {
      console.log(`Creating GitHub Environment: ${opts.env}`)
      try {
        execSync(
          `gh api -X PUT "repos/{owner}/{repo}/environments/${opts.env}"`,
          { stdio: 'inherit' }
        )
        console.log(`Created environment: ${opts.env}`)
      } catch (error) {
        console.error('Failed to create environment:', (error as Error).message)
        process.exit(1)
      }
    })
}
