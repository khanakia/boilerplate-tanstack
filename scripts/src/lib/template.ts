import fs from 'node:fs'
import path from 'node:path'
import { WORKFLOWS_DIR } from './constants.js'

interface TemplateData {
  Name: string
  NameUpper: string
  Branch: string
  EnvVarName: string
}

function getBranch(env: string): string {
  return env === 'prod' ? 'main' : env
}

export function createGithubDeployYaml(envs: string[]): void {
  const templatePath = path.join(WORKFLOWS_DIR, 'deploy.yml.tmpl')

  if (!fs.existsSync(templatePath)) {
    console.warn(`Warning: template not found at ${templatePath}, skipping workflow generation`)
    return
  }

  const template = fs.readFileSync(templatePath, 'utf-8')

  for (const env of envs) {
    const data: TemplateData = {
      Name: env,
      NameUpper: env.toUpperCase(),
      Branch: getBranch(env),
      EnvVarName: 'ENV_B64',
    }

    let output = template
    output = output.replace(/\[\[ \.Name \]\]/g, data.Name)
    output = output.replace(/\[\[ \.NameUpper \]\]/g, data.NameUpper)
    output = output.replace(/\[\[ \.Branch \]\]/g, data.Branch)
    output = output.replace(/\[\[ \.EnvVarName \]\]/g, data.EnvVarName)

    const outputPath = path.join(WORKFLOWS_DIR, `deploy.${env}.yml`)
    fs.writeFileSync(outputPath, output)
    console.log(`Generated: ${outputPath}`)
  }
}
