import { useState } from 'react'
import { DASH_PASSWORD } from '../lib/config.js'
import { Logo } from './ui.jsx'

const GATE_KEY = 'csr-inquiries:gate'
const UNLOCKED = 'unlocked'

export function isUnlocked() {
  try {
    return localStorage.getItem(GATE_KEY) === UNLOCKED
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
        localStorage.setItem(GATE_KEY, UNLOCKED)
      } catch {
        /* ignore */
      }
      onUnlock()
    } else {
      setErr(true)
    }
  }

  return (
    <div
      className="grid min-h-screen place-items-center p-6"
      style={{ background: 'radial-gradient(circle at 30% 20%, #F1EBFF, #FAFAFE 60%)' }}
    >
      <form
        onSubmit={submit}
        className={`w-full max-w-sm rounded-2xl border border-line bg-card p-7 text-center ${err ? 'shake' : ''}`}
        style={{ boxShadow: '0 10px 40px rgba(114,41,255,0.08)' }}
      >
        <div className="mb-4 flex justify-center">
          <Logo size={64} />
        </div>
        <h1 className="disp text-xl font-bold text-ink">CSR Inquiries</h1>
        <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-brand">
          HaseebMadeIt
        </div>
        <label className="mt-6 block text-left text-[10px] font-semibold uppercase tracking-wider text-dim">
          Access password
        </label>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => {
            setPw(e.target.value)
            setErr(false)
          }}
          placeholder="••••••••"
          className={`mt-1.5 w-full rounded-lg border bg-raised px-4 py-2.5 text-sm text-ink outline-none ${
            err ? 'border-coral' : 'border-line'
          }`}
        />
        {err && <div className="mt-2 text-left text-xs text-coral">Incorrect password.</div>}
        <button type="submit" className="btn-accent mt-5 w-full justify-center rounded-lg py-3 font-semibold">
          Sign in
        </button>
        <p className="mt-5 text-[11px] text-dim">Internal · Confidential · For authorized staff only.</p>
      </form>
    </div>
  )
}
