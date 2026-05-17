import { Router } from 'express'
import { db } from '../db.js'

export const memoriesRouter = Router()

// GET /api/memories?personId=xxx
memoriesRouter.get('/', async (req, res) => {
  try {
    const { personId } = req.query
    const memories = await db.memory.findMany({
      where: personId ? { personId: String(personId) } : {},
      orderBy: { createdAt: 'desc' },
      include: { replies: true },
    })
    res.json(memories)
  } catch {
    res.status(500).json({ error: 'Failed to fetch memories' })
  }
})

// POST /api/memories
memoriesRouter.post('/', async (req, res) => {
  try {
    const { personId, content, isUncertain, attribution, visibility, parentId } = req.body
    if (!personId || !content) {
      return res.status(400).json({ error: 'personId and content are required' })
    }
    const memory = await db.memory.create({
      data: { personId, content, isUncertain: isUncertain || false, attribution, visibility: visibility || 'PRIVATE', parentId },
    })
    res.status(201).json(memory)
  } catch {
    res.status(500).json({ error: 'Failed to create memory' })
  }
})

// PATCH /api/memories/:id
memoriesRouter.patch('/:id', async (req, res) => {
  try {
    const memory = await db.memory.update({ where: { id: req.params.id }, data: req.body })
    res.json(memory)
  } catch {
    res.status(500).json({ error: 'Failed to update memory' })
  }
})

// DELETE /api/memories/:id
memoriesRouter.delete('/:id', async (req, res) => {
  try {
    await db.memory.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Failed to delete memory' })
  }
})
