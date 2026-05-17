import { api } from './client'
import type { Memory } from '../types'

export const memoriesApi = {
  list: (personId: string): Promise<Memory[]> =>
    api.get('/memories', { params: { personId } }).then(r => r.data),

  create: (data: {
    personId: string
    content: string
    isUncertain?: boolean
    attribution?: string
  }): Promise<Memory> =>
    api.post('/memories', data).then(r => r.data),

  delete: (id: string): Promise<{ ok: boolean }> =>
    api.delete(`/memories/${id}`).then(r => r.data),
}