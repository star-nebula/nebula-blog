import { loadRecentUpdates } from './recent-data'

export default {
  async load() {
    return loadRecentUpdates()
  },
}
