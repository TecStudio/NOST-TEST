import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'

export default function Home() {
  const router = useRouter()
  const [step, setStep] = useState('login') // login | confirm | waiting
  const [studentCode, setStudentCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [studentData, setStudentData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('student_code', studentCode.trim())
      .eq('first_name', firstName.trim())
      .single()

    setLoading(false)

    if (error || !data) {
      setError('Student code or name not found. Please verify your information.')
      return
    }

    if (data.status === 'submitted') {
      setError('This examination has already been submitted.')
      return
    }

    if (data.status === 'disqualified') {
      setError('This student session has been disqualified. Contact your tutor.')
      return
    }

    setStudentData(data)
    setStep('confirm')
  }

  const handleConfirm = async () => {
    setLoading(true)

    // Update status to waiting if not already approved
    if (studentData.status === 'waiting') {
      await supabase
        .from('students')
        .update({ status: 'waiting' })
        .eq('id', studentData.id)
    }

    // Store student session
    localStorage.setItem('nost_student', JSON.stringify(studentData))

    if (studentData.status === 'approved') {
      // Go straight to exam
      router.push('/exam')
    } else {
      setStep('waiting')
      // Poll for approval
      pollForApproval(studentData.id)
    }
    setLoading(false)
  }

  const pollForApproval = (id) => {
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('students')
        .select('status')
        .eq('id', id)
        .single()

      if (data?.status === 'approved') {
        clearInterval(interval)
        router.push('/exam')
      }
    }, 3000)
  }

  return (
    <>
      <Head>
        <title>NOST MATH TEST — Student Portal</title>
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top bar */}
        <div style={{
          background: 'var(--accent)',
          color: 'white',
          padding: '10px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          letterSpacing: '0.1em'
        }}>
          <span>NOST EXAMINATION PORTAL v2.4</span>
          <span>AUTHORIZED ACCESS ONLY</span>
        </div>

        {/* Main content */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px'
        }}>
          <div style={{ width: '100%', maxWidth: '480px' }}>

            {/* Header seal */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{
                width: '72px',
                height: '72px',
                border: '3px solid var(--accent)',
                borderRadius: '50%',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px'
              }}>
                📋
              </div>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                letterSpacing: '0.2em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '6px'
              }}>Non-Official Estatal Test</div>
              <h1 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: 'var(--accent)',
                letterSpacing: '-0.02em'
              }}>NOST MATH TEST</h1>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginTop: '4px'
              }}>NOST-2026-M6 · FORM A</div>
            </div>

            {/* Card */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '32px'
            }}>

              {step === 'login' && (
                <>
                  <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>
                    Student Identification
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    Enter your assigned student code and first name to access your examination.
                  </p>

                  <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        letterSpacing: '0.08em',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        marginBottom: '6px',
                        fontFamily: 'var(--mono)'
                      }}>Student Code</label>
                      <input
                        type="text"
                        value={studentCode}
                        onChange={e => setStudentCode(e.target.value)}
                        placeholder="Enter your student code"
                        required
                        style={{ fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        letterSpacing: '0.08em',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        marginBottom: '6px',
                        fontFamily: 'var(--mono)'
                      }}>First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="Enter your first name"
                        required
                      />
                    </div>

                    {error && (
                      <div style={{
                        background: 'var(--danger-light)',
                        border: '1px solid var(--danger)',
                        color: 'var(--danger)',
                        padding: '10px 14px',
                        fontSize: '13px',
                        marginBottom: '16px'
                      }}>
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={loading}
                      style={{ width: '100%' }}
                    >
                      {loading ? 'Verifying...' : 'Continue'}
                    </button>
                  </form>
                </>
              )}

              {step === 'confirm' && studentData && (
                <>
                  <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px' }}>
                    Confirm Your Information
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    Please verify that the following information is correct before proceeding.
                  </p>

                  <div style={{
                    background: 'var(--accent-light)',
                    border: '1px solid var(--accent)',
                    padding: '20px',
                    marginBottom: '24px'
                  }}>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {[
                        ['Student Code', studentData.student_code],
                        ['First Name', studentData.first_name],
                        ['Last Name', 'Garcia'],
                        ['Grade Level', '6th Grade'],
                        ['School', 'Placeholder Middle School'],
                        ['Exam', 'NOST MATH TEST — FORM A'],
                        ['Date', 'May 25, 2026'],
                        ['Time Limit', `${studentData.time_limit_minutes} minutes`],
                        ['Weight', '60% of final year grade'],
                      ].map(([label, value]) => (
                        <div key={label} style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
                          <span style={{
                            fontSize: '11px',
                            fontFamily: 'var(--mono)',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            minWidth: '120px'
                          }}>{label}</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent)' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    background: 'var(--warning-light)',
                    border: '1px solid #d4a017',
                    padding: '12px 14px',
                    fontSize: '12px',
                    color: 'var(--warning)',
                    marginBottom: '24px',
                    fontFamily: 'var(--mono)'
                  }}>
                    ⚠ This examination will enter fullscreen mode. Exiting fullscreen will terminate your session.
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setStep('login')}
                      style={{ flex: 1 }}
                    >
                      Back
                    </button>
                    <button
                      className="btn-primary"
                      onClick={handleConfirm}
                      disabled={loading}
                      style={{ flex: 2 }}
                    >
                      {loading ? 'Processing...' : 'This information is correct →'}
                    </button>
                  </div>
                </>
              )}

              {step === 'waiting' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    border: '3px solid var(--border)',
                    borderTopColor: 'var(--accent)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 24px'
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                    Waiting for Tutor Approval
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    Your session has been submitted for review. Please wait while your tutor approves your access to the examination.
                  </p>
                  <div style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    padding: '12px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)'
                  }}>
                    STATUS: PENDING APPROVAL<span className="loading-dots" />
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px' }}>
                    Do not close this window. This page will automatically redirect when approved.
                  </p>
                </div>
              )}

            </div>

            {/* Footer */}
            <div style={{
              textAlign: 'center',
              marginTop: '20px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--mono)'
            }}>
              NOST EXAMINATION SYSTEM · FORM A · 2026<br />
              Unauthorized access is prohibited
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
