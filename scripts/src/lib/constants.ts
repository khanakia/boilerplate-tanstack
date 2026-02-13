import path from 'node:path'

export const GITHUB_SECRET_PREFIX = 'GITHUB_SECRET_'
export const GITHUB_SECRET_KEY_FILES = 'GITHUB_SECRET_KEY_FILES'

export const ROOT_DIR = path.resolve(import.meta.dirname, '..', '..', '..')
export const KEYS_DIR = path.join(ROOT_DIR, '_keys')
export const GITHUB_DIR = path.join(ROOT_DIR, '.github')
export const WORKFLOWS_DIR = path.join(GITHUB_DIR, 'workflows')
