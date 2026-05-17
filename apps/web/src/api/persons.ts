import { api } from './client'
import type { Person, GraphData } from '../types'

export const personsApi = {
  list: (params?: { treeId?: string; search?: string }): Promise<Person[]> =>
    api.get('/persons', { params }).then(r => r.data),

  get: (id: string): Promise<Person> =>
    api.get(`/persons/${id}`).then(r => r.data),

  getGraph: (id: string): Promise<GraphData> =>
    api.get(`/persons/${id}/graph`).then(r => r.data),

  create: (data: Partial<Person> & { treeId?: string }): Promise<Person> =>
    api.post('/persons', data).then(r => r.data),

  update: (id: string, data: Partial<Person>): Promise<Person> =>
    api.patch(`/persons/${id}`, data).then(r => r.data),

  delete: (id: string): Promise<{ ok: boolean }> =>
    api.delete(`/persons/${id}`).then(r => r.data),
}