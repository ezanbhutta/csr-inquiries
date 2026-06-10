import { useState } from 'react'
import { DASH_PASSWORD } from '../lib/config.js'

const GATE_KEY = 'csr-inquiries:gate'

export function isUnlocked() {
  try {
    return localStorage.getItem(GATE_KEY) === DASH_PASSWORD
  } catch {
    return false
  }
}

export default function Gate({ onUnlock }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (pw === DASH_PASSWORD) {
      try {
        localStorage.setItem(GATE_KEY, pw)
      } catch {
        /* ignore */
      }
      onUnlock()
    } else {
      setErr(true)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <form onSubmit={submit} className="card w-full max-w-sm">
        <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent-soft">
          CSR Inquiries
        </div>
        <h1 className="text-xl font-bold">Daily inquiry &amp; conversion dashboard</h1>
        <p className="mt-1 text-sm text-white/50">Enter the access password to continue.</p>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => {
            setPw(e.target.value)
            setErr(false)
          }}
          placeholder="Password"
          className="mt-4 w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-2.5 text-sm outline-none focus:border-accent/50"
        />
        {err && <div className="mt-2 text-xs text-loss">Incorrect password.</div>}
        <button type="submit" className="btn btn-accent mt-4 w-full justify-center">
          Unlock
        </button>
      </form>
    </div>
  )
}
