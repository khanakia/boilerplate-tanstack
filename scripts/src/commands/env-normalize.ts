import type { Command } from 'commander'

export function registerEnvNormalize(program: Command) {
  program
    .command('gh:env:normalize')
    .description('Normalize a branch name to environment name')
    .argument('<branch>', 'Branch name to normalize')
    .action((branch: string) => {
      const normalized = branch
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase()
      console.log(normalized)
    })
}
