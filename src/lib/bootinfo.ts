interface ServiceStatus {
  status: 'ok' | 'error' | 'not_configured'
  error?: string
  message?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

type BootInfo = Record<string, ServiceStatus>

const globalBootInfo: BootInfo = {}

export function setServiceStatus(
  serviceName: string,
  status: Omit<ServiceStatus, 'timestamp'>
) {
  globalBootInfo[serviceName] = {
    ...status,
    timestamp: new Date().toISOString(),
  }
}

export function getBootInfo(): BootInfo {
  return globalBootInfo
}
