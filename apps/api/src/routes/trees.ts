import { Router } from 'express'
import { db } from '../db.js'

export const treesRouter = Router()

// GET /api/trees
treesRouter.get('/', async (req, res) => {
  try {
    const trees = await db.tree.findMany({
      include: { _count: { select: { persons: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(trees)
  } catch {
    res.status(500).json({ error: 'Failed to fetch trees' })
  }
})

// GET /api/trees/:id
treesRouter.get('/:id', async (req, res) => {
  try {
    const tree = await db.tree.findUnique({
      where: { id: req.params.id },
      include: {
        persons: { include: { person: true } },
        _count: { select: { persons: true } },
      },
    })
    if (!tree) return res.status(404).json({ error: 'Tree not found' })
    res.json(tree)
  } catch {
    res.status(500).json({ error: 'Failed to fetch tree' })
  }
})

// POST /api/trees
treesRouter.post('/', async (req, res) => {
  try {
    const { name, description, color, ownerId } = req.body
    if (!name || !ownerId) return res.status(400).json({ error: 'name and ownerId are required' })
    const tree = await db.tree.create({ data: { name, description, color, ownerId } })
    res.status(201).json(tree)
  } catch {
    res.status(500).json({ error: 'Failed to create tree' })
  }
})

// PATCH /api/trees/:id
treesRouter.patch('/:id', async (req, res) => {
  try {
    const tree = await db.tree.update({ where: { id: req.params.id }, data: req.body })
    res.json(tree)
  } catch {
    res.status(500).json({ error: 'Failed to update tree' })
  }
})

// DELETE /api/trees/:id
treesRouter.delete('/:id', async (req, res) => {
  try {
    await db.tree.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete tree' })
  }
})

// GET /api/trees/:id/export  — full JSON export
treesRouter.get('/:id/export', async (req, res) => {
  try {
    const persons = await db.person.findMany({
      where: { trees: { some: { treeId: req.params.id } } },
      include: { relationshipsA: true, relationshipsB: true, memories: true, media: true },
    })
    res.setHeader('Content-Disposition', `attachment; filename="kinroot-${req.params.id}.json"`)
    res.json({ exportedAt: new Date(), treeId: req.params.id, persons })
  } catch {
    res.status(500).json({ error: 'Failed to export tree' })
  }
})
