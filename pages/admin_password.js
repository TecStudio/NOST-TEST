import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function AdminPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    setTimeout(() => {
      if (password === 'TECLEDYT12') {
        sessionStorage.setItem('nost_admin', '1')
        router.push('/admin_view')
      } else {
        setError('Invalid credentials. Access denied.')
        setLoading(false)
      }
    }, 600)
  }

  return (
    <>
      <Head>
        <title>NOST — Restricted Access</title>
      </Head>
      <div style={{
        minHeight: '100vh',
        background: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            color: '#666',
            letterSpacing: '0.15em',
            textAlign: 'center',
            marginBottom: '8px'
          }}>
            NOST EXAMINATION SYSTEM
          </div>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            color: '#444',
            letterSpacing: '0.15em',
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            RESTRICTED ACCESS — AUTHORIZED PERSONNEL ONLY
          </div>

          <div style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            padding: '32px'
          }}>
            <form onSubmit={handleSubmit}>
              <label style={{
                display: 'block',
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                color: '#888',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}>
                Authorization Code
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter authorization code"
                required
                style={{
                  background: '#111',
                  border: '1px solid #333',
                  color: '#eee',
                  fontFamily: 'var(--mono)',
                  letterSpacing: '0.1em',
                  marginBottom: '16px'
                }}
              />

              {error && (
                <div style={{
                  color: '#c0392b',
                  fontSize: '12px',
                  fontFamily: 'var(--mono)',
                  marginBottom: '16px',
                  padding: '8px',
                  background: '#1f0808',
                  border: '1px solid #3f0808'
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? '#333' : '#1a3a6b',
                  color: loading ? '#666' : 'white',
                  padding: '12px',
                  fontFamily: 'var(--mono)',
                  fontSize: '12px',
                  letterSpacing: '0.1em',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'VERIFYING...' : 'AUTHENTICATE'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
