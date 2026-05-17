import { useState, useEffect } from 'react'
import { Sidebar }    from './components/layout/Sidebar'
import { FamilyTreePage } from './pages/FamilyTreePage'
import { GraphPage }  from './pages/GraphPage'
import { PeoplePage } from './pages/PeoplePage'
import { TimelinePage } from './pages/TimelinePage'
import { treesApi }   from './api/trees'
import './styles/global.css'

// Tabler icons CDN — add to index.html instead
// We'll inject it here for simplicity
const TABLER_CDN = 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css'

export default function App() {
  const [activeView,   setActiveView]   = useState('family-tree')
  const [activeTreeId, setActiveTreeId] = useState<string | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

  // Load the Tabler icon font
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'; link.href = TABLER_CDN
    document.head.appendChild(link)
  }, [])

  // Auto-select the first tree on load
  useEffect(() => {
    treesApi.list().then(trees => {
      if (trees.length > 0 && !activeTreeId) {
        setActiveTreeId(trees[0].id)
      }
    })
  }, [])

  const handleSelectPerson = (id: string) => {
    setSelectedPersonId(id)
    setActiveView('family-tree')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        activeTreeId={activeTreeId}
        onSelectTree={setActiveTreeId}
        activeView={activeView}
        onSelectView={setActiveView}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Privacy banner */}
        <div style={{
          background: '#1a1714', color: '#c8c0b4',
          fontSize: 11.5, textAlign: 'center',
          padding: '6px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          flexShrink: 0,
        }}>
          <i className="ti ti-shield-lock" style={{ color: '#f2d08a', fontSize: 13 }} />
          All data is private and stored locally. Every field is optional.
        </div>

        {/* Page content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          {activeView === 'family-tree' && (
            <FamilyTreePage
              activeTreeId={activeTreeId}
              selectedPersonId={selectedPersonId}
              onSelectPerson={setSelectedPersonId}
            />
          )}
          {activeView === 'graph' && (
            <GraphPage
              activeTreeId={activeTreeId}
              selectedPersonId={selectedPersonId}
              onSelectPerson={setSelectedPersonId}
            />
          )}
          {activeView === 'people' && (
            <PeoplePage activeTreeId={activeTreeId} onSelectPerson={handleSelectPerson} />
          )}
          {activeView === 'timeline' && (
            <TimelinePage activeTreeId={activeTreeId} onSelectPerson={handleSelectPerson} />
          )}
        </div>
      </main>
    </div>
  )
}


/*
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
*/
