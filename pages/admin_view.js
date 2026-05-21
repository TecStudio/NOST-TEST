import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { questions, totalPoints } from '../lib/questions'
import Head from 'next/head'

export default function AdminView() {
  const router = useRouter()
  const [tab, setTab] = useState('students') // students | tests | add_student
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentAnswers, setStudentAnswers] = useState([])

  // New student form
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newTimeLimit, setNewTimeLimit] = useState(60)
  const [addMsg, setAddMsg] = useState('')

  useEffect(() => {
    if (!sessionStorage.getItem('nost_admin')) {
      router.push('/admin_password')
      return
    }
    fetchStudents()

    // Poll every 5s
    const interval = setInterval(fetchStudents, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setStudents(data)
    setLoading(false)
  }

  const approveStudent = async (id) => {
    await supabase.from('students').update({
      status: 'approved',
      approved_at: new Date().toISOString()
    }).eq('id', id)
    fetchStudents()
  }

  const disqualifyStudent = async (id) => {
    if (!confirm('Disqualify this student? This cannot be undone.')) return
    await supabase.from('students').update({ status: 'disqualified' }).eq('id', id)
    fetchStudents()
  }

  const resetStudent = async (id) => {
    if (!confirm('Reset this student to waiting status?')) return
    await supabase.from('students').update({
      status: 'waiting',
      approved_at: null,
      started_at: null,
      submitted_at: null
    }).eq('id', id)
    await supabase.from('answers').delete().eq('student_id', id)
    fetchStudents()
  }

  const viewStudentDetail = async (student) => {
    setSelectedStudent(student)
    const { data } = await supabase
      .from('answers')
      .select('*, questions(question_number, question_text, question_type, correct_answer, points)')
      .eq('student_id', student.id)
      .order('questions(question_number)')
    setStudentAnswers(data || [])
  }

  const addStudent = async (e) => {
    e.preventDefault()
    setAddMsg('')
    const { error } = await supabase.from('students').insert({
      student_code: newCode.trim(),
      first_name: newName.trim(),
      time_limit_minutes: parseInt(newTimeLimit)
    })
    if (error) {
      setAddMsg('Error: ' + (error.message.includes('unique') ? 'Student code already exists.' : error.message))
    } else {
      setAddMsg('Student added successfully.')
      setNewCode('')
      setNewName('')
      setNewTimeLimit(60)
      fetchStudents()
    }
  }

  const getElapsed = (student) => {
    if (!student.started_at) return null
    const end = student.submitted_at ? new Date(student.submitted_at) : new Date()
    const start = new Date(student.started_at)
    const mins = Math.floor((end - start) / 60000)
    const secs = Math.floor(((end - start) % 60000) / 1000)
    return `${mins}m ${secs}s`
  }

  const getScore = (student, answers) => {
    if (!answers.length) return null
    let score = 0
    let max = 0
    answers.forEach(a => {
      if (!a.questions) return
      max += a.questions.points
      if (a.is_correct) score += a.questions.points
    })
    return { score, max, pct: max > 0 ? Math.round((score / totalPoints) * 100) : 0 }
  }

  const statusColor = {
    waiting: '#d4a017',
    approved: '#1a5c2e',
    taking: '#1a3a6b',
    submitted: '#333',
    disqualified: '#8b1a1a'
  }

  const statusBg = {
    waiting: '#fef9e7',
    approved: '#f0fdf4',
    taking: '#e8edf5',
    submitted: '#f5f5f5',
    disqualified: '#fdf0f0'
  }

  return (
    <>
      <Head><title>NOST — Admin Dashboard</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{
          background: 'var(--accent)',
          color: 'white',
          padding: '14px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', opacity: 0.7, letterSpacing: '0.15em' }}>
              NOST EXAMINATION SYSTEM · ADMIN DASHBOARD
            </div>
            <div style={{ fontWeight: '700', fontSize: '18px' }}>NOST MATH TEST — Control Panel</div>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem('nost_admin'); router.push('/admin_password') }}
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '8px 16px', fontSize: '12px', fontFamily: 'var(--mono)', border: 'none', cursor: 'pointer' }}
          >
            LOGOUT
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0 32px',
          display: 'flex',
          gap: '0'
        }}>
          {[['students', 'Students'], ['add_student', 'Add Student']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '14px 20px',
                background: 'none',
                border: 'none',
                borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === key ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: tab === key ? '600' : '400',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: '32px', flex: 1 }}>

          {/* Students tab */}
          {tab === 'students' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
                  Students ({students.length})
                </h2>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Auto-refreshes every 5s
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {['waiting', 'approved', 'taking', 'submitted', 'disqualified'].map(status => (
                  <div key={status} style={{
                    background: statusBg[status],
                    border: `1px solid ${statusColor[status]}`,
                    padding: '12px 16px'
                  }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: statusColor[status], textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>{status}</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: statusColor[status] }}>
                      {students.filter(s => s.status === status).length}
                    </div>
                  </div>
                ))}
              </div>

              {/* Student list */}
              {loading ? (
                <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>Loading...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {students.map(s => (
                    <div key={s.id} style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      {/* Status badge */}
                      <div style={{
                        fontFamily: 'var(--mono)',
                        fontSize: '10px',
                        fontWeight: '700',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: statusColor[s.status],
                        background: statusBg[s.status],
                        border: `1px solid ${statusColor[s.status]}`,
                        padding: '3px 8px',
                        minWidth: '100px',
                        textAlign: 'center'
                      }}>
                        {s.status}
                      </div>

                      {/* Student info */}
                      <div style={{ flex: 1, minWidth: '120px' }}>
                        <div style={{ fontWeight: '600', fontSize: '15px' }}>{s.first_name}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{s.student_code}</div>
                      </div>

                      {/* Time info */}
                      <div style={{ minWidth: '140px' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)' }}>TIME USED / MAX</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600' }}>
                          {getElapsed(s) || '—'} / {s.time_limit_minutes}m
                        </div>
                        {s.started_at && !s.submitted_at && (
                          <div style={{
                            fontSize: '10px',
                            fontFamily: 'var(--mono)',
                            color: 'var(--success)',
                            marginTop: '2px'
                          }}>
                            ● IN PROGRESS
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {s.status === 'waiting' && (
                          <button
                            className="btn-primary"
                            onClick={() => approveStudent(s.id)}
                            style={{ fontSize: '12px', padding: '8px 16px' }}
                          >
                            ✓ Approve
                          </button>
                        )}
                        <button
                          onClick={() => viewStudentDetail(s)}
                          style={{
                            background: 'var(--accent-light)',
                            color: 'var(--accent)',
                            border: '1px solid var(--accent)',
                            padding: '8px 14px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          View Details
                        </button>
                        {s.status !== 'disqualified' && s.status !== 'submitted' && (
                          <button
                            onClick={() => disqualifyStudent(s.id)}
                            style={{
                              background: 'var(--danger-light)',
                              color: 'var(--danger)',
                              border: '1px solid var(--danger)',
                              padding: '8px 14px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Disqualify
                          </button>
                        )}
                        <button
                          onClick={() => resetStudent(s.id)}
                          style={{
                            background: 'var(--bg)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border)',
                            padding: '8px 14px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  ))}

                  {students.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--mono)',
                      fontSize: '13px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)'
                    }}>
                      No students registered yet
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Add student tab */}
          {tab === 'add_student' && (
            <div style={{ maxWidth: '480px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px' }}>Add New Student</h2>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '32px' }}>
                <form onSubmit={addStudent}>
                  {[
                    ['Student Code', 'text', newCode, setNewCode, 'e.g. i11HHaE'],
                    ['First Name', 'text', newName, setNewName, 'e.g. Izakiah'],
                  ].map(([label, type, val, setter, ph]) => (
                    <div key={label} style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontFamily: 'var(--mono)',
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: '6px'
                      }}>{label}</label>
                      <input
                        type={type}
                        value={val}
                        onChange={e => setter(e.target.value)}
                        placeholder={ph}
                        required
                        style={{ fontFamily: type === 'text' && label.includes('Code') ? 'var(--mono)' : 'var(--sans)' }}
                      />
                    </div>
                  ))}
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{
                      display: 'block',
                      fontFamily: 'var(--mono)',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: '6px'
                    }}>Time Limit (minutes)</label>
                    <input
                      type="number"
                      value={newTimeLimit}
                      onChange={e => setNewTimeLimit(e.target.value)}
                      min="10"
                      max="180"
                      required
                    />
                  </div>

                  {addMsg && (
                    <div style={{
                      padding: '10px 14px',
                      fontSize: '13px',
                      marginBottom: '16px',
                      background: addMsg.includes('Error') ? 'var(--danger-light)' : 'var(--success-light)',
                      border: `1px solid ${addMsg.includes('Error') ? 'var(--danger)' : 'var(--success)'}`,
                      color: addMsg.includes('Error') ? 'var(--danger)' : 'var(--success)'
                    }}>
                      {addMsg}
                    </div>
                  )}

                  <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                    Add Student
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Student detail modal */}
        {selectedStudent && (
          <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '40px 20px',
            overflowY: 'auto'
          }}>
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              width: '100%',
              maxWidth: '700px',
              padding: '32px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700' }}>{selectedStudent.first_name}</h2>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {selectedStudent.student_code} · {selectedStudent.status.toUpperCase()}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}
                >✕</button>
              </div>

              {/* Time info */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '24px'
              }}>
                {[
                  ['Time Used', getElapsed(selectedStudent) || '—'],
                  ['Time Limit', `${selectedStudent.time_limit_minutes}m`],
                  ['Answers Saved', `${studentAnswers.length}/${questions.length}`],
                ].map(([label, val]) => (
                  <div key={label} style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    padding: '12px 16px'
                  }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '18px', fontWeight: '700' }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Score */}
              {studentAnswers.length > 0 && (() => {
                const s = getScore(selectedStudent, studentAnswers)
                return s ? (
                  <div style={{
                    background: 'var(--accent-light)',
                    border: '1px solid var(--accent)',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    display: 'flex',
                    gap: '32px',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Current Score</div>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--accent)' }}>
                        {s.score} / {totalPoints}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Percentage</div>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: s.pct >= 60 ? 'var(--success)' : 'var(--danger)' }}>
                        {s.pct}%
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                      * Auto-graded MC only<br />Extended responses need manual review
                    </div>
                  </div>
                ) : null
              })()}

              {/* Answers list */}
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
                  Saved Answers
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                  {studentAnswers.map(a => (
                    <div key={a.id} style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '10px 14px',
                      background: a.is_correct === true ? 'var(--success-light)' : a.is_correct === false ? 'var(--danger-light)' : 'var(--bg)',
                      border: `1px solid ${a.is_correct === true ? 'var(--success)' : a.is_correct === false ? 'var(--danger)' : 'var(--border)'}`,
                      fontSize: '13px'
                    }}>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: '700', minWidth: '30px' }}>Q{a.questions?.question_number}</span>
                      <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{a.answer_text || '—'}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>
                        {a.is_correct === true ? '✓' : a.is_correct === false ? '✗' : '—'}
                      </span>
                    </div>
                  ))}
                  {studentAnswers.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: '12px', padding: '16px' }}>
                      No answers saved yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
