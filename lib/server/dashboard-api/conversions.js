import { listConversionEvents, listConversionSources } from '../../dashboard/mock-sync'

export function getConversionsSnapshot() {
  return {
    conversion_sources: listConversionSources(),
    conversion_events: listConversionEvents(),
  }
}
