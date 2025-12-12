import { useState } from 'react'
import './App.css'

type ApiResult = { ok: boolean; code?: number; message?: string; userId?: number }

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null)
  const [route, setRoute] = useState<'login' | 'welcome'>('login')

  async function post(path: string) {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data: ApiResult = await res.json().catch(() => ({ ok: false, message: 'invalid json' }))
      if (!data.ok) setMsg({ text: `Error ${data.code ?? ''}: ${data.message ?? 'unknown'}`, type: 'error' })
      else setMsg({ text: 'Success', type: 'success' })
      return data
    } catch (err: any) {
      setMsg({ text: err?.message ?? String(err), type: 'error' })
      return { ok: false, message: String(err) }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-root">
      <h1>Login Portal</h1>

      {route === 'login' ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            // determine which button triggered the submit
            const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
            const action = submitter?.dataset.action ?? 'register'
            const data = await post(`/api/${action}`)
            if (data?.ok) setRoute('welcome')
          }}
        >
        <fieldset disabled={loading} style={{ border: 0, padding: 0 }}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

          <div className="actions">
            <button type="submit" data-action="register">
              {loading ? 'Working…' : 'Register'}
            </button>
            <button type="submit" data-action="login">
              {loading ? 'Working…' : 'Login'}
            </button>
          </div>
        </fieldset>
      </form>
      ) : (
        <div className="welcome">
          <h2>Welcome</h2>
          <p>You are signed in.</p>
          <button className="back-button" onClick={() => setRoute('login')}>Back</button>
        </div>
      )}

      {msg && (
        <div className={`message ${msg.type}`} role="status" aria-live="polite">
          {msg.text}
        </div>
      )}
    </div>
  )
}
