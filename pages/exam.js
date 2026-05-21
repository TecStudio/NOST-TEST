import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { questions, totalPoints } from '../lib/questions'
import Head from 'next/head'

export default function Exam() {
  const router = useRouter()
  const [student, setStudent] = useState(null)
  const [answers, setAnswers] = useState({})
  const [currentQ, setCurrentQ] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFsWarning, setShowFsWarning] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [saveStatus, setSaveStatus] = useState('') // '' | 'saving' | 'saved'
  const [fsViolations, setFsViolations] = useState(0)
  const saveTimer = useRef(null)
  const elapsedTimer = useRef(null)

  // Load student
  useEffect(() => {
    const stored = localStorage.getItem('nost_student')
    if (!stored) { router.push('/'); return }
    const s = JSON.parse(stored)
    setStudent(s)

    // Record start time
    const now = Date.now()
    setStartTime(now)
    supabase.from('students').update({ started_at: new Date().toISOString(), status: 'taking' }).eq('id', s.id)

    // Load existing answers
    loadAnswers(s.id)

    // Start elapsed timer
    elapsedTimer.current = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)

    return () => clearInterval(elapsedTimer.current)
  }, [])

  const loadAnswers = async (studentId) => {
    const { data } = await supabase
      .from('answers')
      .select('*, questions(question_number)')
      .eq('student_id', studentId)

    if (data) {
      const loaded = {}
      data.forEach(a => {
        if (a.questions) loaded[a.questions.question_number] = a.answer_text
      })
      setAnswers(loaded)
    }
  }

  // Fullscreen management
  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.()
      .then(() => setIsFullscreen(true))
      .catch(() => {})
  }

  useEffect(() => {
    const handleFsChange = () => {
      const isFull = !!document.fullscreenElement
      setIsFullscreen(isFull)
      if (!isFull && student) {
        setFsViolations(v => v + 1)
        setShowFsWarning(true)
      }
    }

    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [student])

  // Keyboard trap - Ctrl+Delete exits
  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === 'Delete') {
        setShowExitModal(true)
      }
      // Block other escape attempts
      if (e.key === 'Escape' && !showExitModal) {
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showExitModal])

  // Auto-save every 2 minutes IF there are changes
  const pendingSave = useRef({})

  const saveAnswer = useCallback(async (qNum, answerText) => {
    if (!student) return
    setSaveStatus('saving')

    // Get question id
    const { data: qData } = await supabase
      .from('questions')
      .select('id, correct_answer, question_type')
      .eq('question_number', qNum)
      .single()

    if (!qData) { setSaveStatus(''); return }

    const isCorrect = qData.question_type === 'multiple_choice'
      ? answerText?.charAt(0) === qData.correct_answer
      : null

    await supabase.from('answers').upsert({
      student_id: student.id,
      question_id: qData.id,
      answer_text: answerText,
      is_correct: isCorrect,
      saved_at: new Date().toISOString()
    }, { onConflict: 'student_id,question_id' })

    setSaveStatus('saved')
    setTimeout(() => setSaveStatus(''), 2000)
  }, [student])

  const handleAnswer = (qNum, value) => {
    setAnswers(prev => ({ ...prev, [qNum]: value }))
    pendingSave.current[qNum] = value

    // Schedule auto-save after 2 minutes of inactivity
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      Object.entries(pendingSave.current).forEach(([n, v]) => {
        saveAnswer(parseInt(n), v)
      })
      pendingSave.current = {}
    }, 120000) // 2 minutes
  }

  const handleSubmit = async () => {
    if (!student) return

    // Save all pending
    for (const [n, v] of Object.entries(pendingSave.current)) {
      await saveAnswer(parseInt(n), v)
    }

    await supabase.from('students').update({
      status: 'submitted',
      submitted_at: new Date().toISOString()
    }).eq('id', student.id)

    localStorage.removeItem('nost_student')
    setSubmitted(true)
    document.exitFullscreen?.()
  }

  const handleExit = async () => {
    if (!student) return
    // Save current state
    for (const [n, v] of Object.entries(pendingSave.current)) {
      await saveAnswer(parseInt(n), v)
    }
    await supabase.from('students').update({ status: 'disqualified' }).eq('id', student.id)
    localStorage.removeItem('nost_student')
    document.exitFullscreen?.()
    router.push('/?exited=1')
  }

  const q = questions[currentQ]
  const answeredCount = Object.keys(answers).filter(k => answers[k]).length

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        padding: '40px'
      }}>
        <div style={{ fontSize: '48px' }}>✅</div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent)' }}>
          Examination Submitted
        </h1>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>
          Your responses have been recorded. Your tutor will review and finalize your score.
        </p>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          marginTop: '8px'
        }}>
          NOST-2026-M6 · {answeredCount}/{questions.length} questions answered
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>NOST MATH TEST — In Progress</title>
      </Head>

      {/* Fullscreen warning overlay */}
      {showFsWarning && (
        <div className="fullscreen-warning">
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px' }}>
            FULLSCREEN VIOLATION DETECTED
          </h2>
          <p style={{ maxWidth: '400px', fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>
            Exiting fullscreen during a NOST examination is a testing violation. This event has been recorded.
          </p>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: '12px',
            background: 'rgba(255,255,255,0.15)',
            padding: '8px 16px',
            marginBottom: '24px'
          }}>
            VIOLATION COUNT: {fsViolations}
          </div>
          <button
            className="btn-primary"
            style={{ background: 'white', color: 'var(--danger)', padding: '12px 32px', fontSize: '15px' }}
            onClick={() => {
              setShowFsWarning(false)
              enterFullscreen()
            }}
          >
            Return to Examination
          </button>
          <p style={{ fontSize: '11px', opacity: 0.7, marginTop: '12px' }}>
            Press Ctrl+Delete to exit and terminate your session
          </p>
        </div>
      )}

      {/* Exit confirmation modal */}
      {showExitModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            padding: '32px',
            maxWidth: '400px',
            width: '100%'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--danger)', marginBottom: '12px' }}>
              Exit Examination?
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Exiting will <strong>permanently terminate</strong> your examination session. Your current answers will be saved, but you will not be able to re-enter.
            </p>
            <div style={{
              background: 'var(--danger-light)',
              border: '1px solid var(--danger)',
              padding: '10px 14px',
              fontSize: '12px',
              color: 'var(--danger)',
              marginBottom: '24px',
              fontFamily: 'var(--mono)'
            }}>
              WARNING: THIS ACTION CANNOT BE UNDONE
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowExitModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                style={{ flex: 1 }}
                onClick={handleExit}
              >
                Exit & Terminate
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        overflow: 'hidden'
      }} className="no-select">

        {/* Top bar */}
        {!isFullscreen && (
          <div style={{
            background: 'var(--warning)',
            color: 'white',
            padding: '10px 24px',
            fontSize: '13px',
            fontFamily: 'var(--mono)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>⚠ FULLSCREEN REQUIRED FOR EXAMINATION</span>
            <button
              style={{ background: 'white', color: 'var(--warning)', padding: '6px 16px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer' }}
              onClick={enterFullscreen}
            >
              ENTER FULLSCREEN
            </button>
          </div>
        )}

        {/* Header */}
        <div style={{
          background: 'var(--accent)',
          color: 'white',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.15em', opacity: 0.7 }}>
              NOST-2026-M6 · FORM A
            </div>
            <div style={{ fontWeight: '700', fontSize: '16px', letterSpacing: '-0.01em' }}>
              NOST MATH TEST
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}>
              <div style={{ opacity: 0.7, fontSize: '10px' }}>STUDENT</div>
              <div>{student?.first_name} · {student?.student_code}</div>
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: '12px' }}>
              <div style={{ opacity: 0.7, fontSize: '10px' }}>PROGRESS</div>
              <div>{answeredCount}/{questions.length}</div>
            </div>
            {saveStatus && (
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: '10px',
                opacity: 0.8,
                background: 'rgba(255,255,255,0.1)',
                padding: '4px 8px'
              }}>
                {saveStatus === 'saving' ? '💾 SAVING...' : '✓ SAVED'}
              </div>
            )}
          </div>
        </div>

        {/* Main exam area */}
        <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden'
        }}>

          {/* Sidebar - question navigator */}
          <div style={{
            width: '200px',
            background: 'var(--surface)',
            borderRight: '1px solid var(--border)',
            padding: '16px',
            overflowY: 'auto',
            flexShrink: 0
          }}>
            <div style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}>Questions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              {questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  style={{
                    padding: '6px 4px',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    fontWeight: '600',
                    background: currentQ === i ? 'var(--accent)' : answers[q.number] ? '#e8f0e8' : 'var(--bg)',
                    color: currentQ === i ? 'white' : answers[q.number] ? 'var(--success)' : 'var(--text-secondary)',
                    border: currentQ === i ? '1px solid var(--accent)' : '1px solid var(--border)',
                    cursor: 'pointer'
                  }}
                >
                  {q.number}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '20px', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>LEGEND</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                <span style={{ color: 'var(--success)' }}>■ Answered</span>
                <span style={{ color: 'var(--text-muted)' }}>■ Unanswered</span>
                <span style={{ color: 'white', background: 'var(--accent)', padding: '0 4px' }}>■ Current</span>
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                style={{ width: '100%', fontSize: '12px', padding: '10px' }}
              >
                Submit Exam
              </button>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center', fontFamily: 'var(--mono)' }}>
                Ctrl+Delete to exit
              </p>
            </div>
          </div>

          {/* Question area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '40px',
            maxWidth: '800px'
          }}>
            {/* Question header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '8px'
            }}>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Question {q.number} of {questions.length}
              </div>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                color: 'white',
                background: q.type === 'extended' ? 'var(--danger)' : q.type === 'short_answer' ? 'var(--accent)' : 'var(--text-secondary)',
                padding: '2px 8px'
              }}>
                {q.type === 'multiple_choice' ? 'MULTIPLE CHOICE' : q.type === 'short_answer' ? 'SHORT ANSWER' : 'EXTENDED RESPONSE'}
              </div>
              <div style={{
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginLeft: 'auto'
              }}>
                {q.points} {q.points === 1 ? 'point' : 'points'}
              </div>
            </div>

            {/* Question text */}
            <div style={{
              fontSize: '16px',
              lineHeight: '1.7',
              marginBottom: '32px',
              color: 'var(--text)',
              fontWeight: '400',
              whiteSpace: 'pre-line'
            }}>
              {q.text}
            </div>

            {/* Answer input */}
            {q.type === 'multiple_choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {q.options.map((opt, i) => {
                  const letter = opt.charAt(0)
                  const isSelected = answers[q.number] === letter
                  return (
                    <label
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        padding: '14px 18px',
                        background: isSelected ? 'var(--accent-light)' : 'var(--surface)',
                        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.1s'
                      }}
                    >
                      <input
                        type="radio"
                        name={`q${q.number}`}
                        value={letter}
                        checked={isSelected}
                        onChange={() => handleAnswer(q.number, letter)}
                        style={{ width: 'auto', marginTop: '2px' }}
                      />
                      <span style={{
                        fontFamily: 'var(--mono)',
                        fontWeight: '700',
                        color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                        minWidth: '20px'
                      }}>{letter}</span>
                      <span style={{ fontSize: '15px' }}>{opt.slice(3)}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {q.type === 'short_answer' && (
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px'
                }}>Your Answer</label>
                <input
                  type="text"
                  value={answers[q.number] || ''}
                  onChange={e => handleAnswer(q.number, e.target.value)}
                  placeholder="Enter your answer here"
                  style={{ maxWidth: '400px' }}
                />
              </div>
            )}

            {q.type === 'extended' && (
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px'
                }}>Extended Response — Show All Work</label>
                <textarea
                  value={answers[q.number] || ''}
                  onChange={e => handleAnswer(q.number, e.target.value)}
                  placeholder="Write your complete response here. Show all calculations and reasoning."
                  rows={12}
                  style={{ resize: 'vertical', lineHeight: '1.6' }}
                />
              </div>
            )}

            {/* Navigation */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '40px',
              paddingTop: '24px',
              borderTop: '1px solid var(--border)'
            }}>
              <button
                className="btn-secondary"
                onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                disabled={currentQ === 0}
                style={{ opacity: currentQ === 0 ? 0.4 : 1 }}
              >
                ← Previous
              </button>
              <button
                className="btn-primary"
                onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}
                disabled={currentQ === questions.length - 1}
                style={{ opacity: currentQ === questions.length - 1 ? 0.4 : 1 }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
