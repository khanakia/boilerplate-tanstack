import { Command } from "commander"
import { registerEnvCreate } from "./commands/env-create.js"
import { registerEnvGenerate } from "./commands/env-generate.js"
import { registerEnvNormalize } from "./commands/env-normalize.js"
import { registerEnvSetup } from "./commands/env-setup.js"
import { registerSecretsClean } from "./commands/secrets-clean.js"
import { registerSecretsList } from "./commands/secrets-list.js"
import { registerSecretsPush } from "./commands/secrets-push.js"
import { registerSecretsRead } from "./commands/secrets-read.js"
import { registerSecretsUpdate } from "./commands/secrets-update.js"

const program = new Command()

program
	.name("scripts")
	.description("DevOps CLI for secrets management and deployment")
	.version("1.0.0")

registerSecretsUpdate(program)
registerSecretsPush(program)
registerSecretsRead(program)
registerSecretsClean(program)
registerSecretsList(program)
registerEnvSetup(program)
registerEnvCreate(program)
registerEnvNormalize(program)
registerEnvGenerate(program)

program.parse()
