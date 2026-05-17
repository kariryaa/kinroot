import { api } from './client'
import type { Tree } from '../types'

export const treesApi = {
  list: (): Promise<Tree[]> =>
    api.get('/trees').then(r => r.data),

  get: (id: string): Promise<Tree> =>
    api.get(`/trees/${id}`).then(r => r.data),

  create: (data: { name: string; description?: string; color?: string; ownerId: string }): Promise<Tree> =>
    api.post('/trees', data).then(r => r.data),
}