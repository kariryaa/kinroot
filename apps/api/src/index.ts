import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import 'dotenv/config'

import { personsRouter } from './routes/persons.js'
import { relationshipsRouter } from './routes/relationships.js'
import { memoriesRouter } from './routes/memories.js'
import { treesRouter } from './routes/trees.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(cors({ origin: 'http://localhost:5173' }))  // Vite dev port
app.use(express.json())

// Routes
app.use('/api/persons', personsRouter)
app.use('/api/relationships', relationshipsRouter)
app.use('/api/memories', memoriesRouter)
app.use('/api/trees', treesRouter)

// Health check
app.get('/health', (_, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})
