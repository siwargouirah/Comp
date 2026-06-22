import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, CheckCircle2, MessageSquare, Users, Copy, Check } from 'lucide-react';
import { StorageService } from '../services/StorageService';
import { supabase } from '../services/supabaseClient';

export function TeacherPortal({ user, profile }) {
  const [homeworkList, setHomeworkList] = useState([]);
  const [newHomework, setNewHomework] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [profile]);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentFeedback();
    }
  }, [selectedStudentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students linked to teacher code
      if (profile?.teacher_id) {
        const { data: parents, error: pError } = await supabase
          .from('profiles')
          .select('child_id')
          .eq('teacher_id', profile.teacher_id)
          .eq('role', 'parent');
        
        if (!pError && parents && parents.length > 0) {
          const childIds = parents.map(p => p.child_id).filter(Boolean);
          if (childIds.length > 0) {
            const { data: children, error: cError } = await supabase
              .from('profiles')
              .select('id, username')
              .in('id', childIds);

            if (!cError && children) {
              setStudents(children);
              if (children.length > 0) {
                setSelectedStudentId(prev => prev || children[0].id);
              }
            }
          } else {
            setStudents([]);
          }
        } else {
          setStudents([]);
        }
      }

      // 2. Fetch Assigned Homework List
      const list = await StorageService.getHomework(profile.id);
      setHomeworkList(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentFeedback = async () => {
    if (!selectedStudentId) return;
    const txt = await StorageService.getTeacherFeedback(selectedStudentId);
    setFeedback(txt === "No feedback submitted yet for today." ? "" : txt);
  };

  const handleCopyCode = () => {
    if (!profile?.teacher_id) return;
    navigator.clipboard.writeText(profile.teacher_id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddHomework = async (e) => {
    e.preventDefault();
    if (!newHomework.trim()) return;

    if (students.length === 0) {
      alert("No students are linked to your classroom yet. Share your classroom ID with parents first!");
      return;
    }

    try {
      const childIds = students.map(s => s.id);
      await StorageService.addHomework(newHomework.trim(), profile.id, childIds);
      setNewHomework('');
      
      const list = await StorageService.getHomework(profile.id);
      setHomeworkList(list);
      alert("Homework successfully assigned to all students!");
    } catch (err) {
      alert("Error adding homework: " + err.message);
    }
  };

  const handleDeleteHomework = async (text) => {
    try {
      await StorageService.deleteHomework(text, profile.id);
      const list = await StorageService.getHomework(profile.id);
      setHomeworkList(list);
    } catch (err) {
      alert("Error deleting homework: " + err.message);
    }
  };

  const handleSaveFeedback = async () => {
    if (!selectedStudentId) {
      alert("Please select a student first!");
      return;
    }
    
    try {
      await StorageService.saveTeacherFeedback(feedback.trim(), selectedStudentId, profile.id);
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
    } catch (err) {
      alert("Error saving feedback: " + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%', padding: '12px' }}>
      
      {/* Header with Classroom code */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h2 className="slanted-heading" style={{ color: 'var(--neon-blue)', marginBottom: '8px' }}>🎒 Teacher Desk</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            Assign homework and provide daily feedback. Tasks sync instantly to students' devices!
          </p>
        </div>

        {/* Classroom Code Card */}
        <div className="game-panel" style={{
          padding: '12px 20px',
          border: '2px dashed var(--neon-blue)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(7, 11, 25, 0.6)'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', fontWeight: 'bold' }}>
              Classroom Link Code
            </span>
            <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white', letterSpacing: '0.05em' }}>
              {profile?.teacher_id || 'N/A'}
            </span>
          </div>
          <button 
            className="secondary" 
            onClick={handleCopyCode}
            style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none' }}
          >
            {copiedCode ? <Check size={16} color="var(--neon-green)" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--neon-blue)' }}>Loading classroom metrics...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          
          {/* Left: Homework Assignment */}
          <div className="game-panel" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <BookOpen size={22} color="var(--neon-blue)" />
              <h3 style={{ margin: 0 }}>Assign Homework</h3>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px', lineHeight: '1.4' }}>
              Adds a synced daily quest for all linked students in your classroom.
            </p>

            <form onSubmit={handleAddHomework} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input 
                type="text" 
                value={newHomework}
                onChange={(e) => setNewHomework(e.target.value)}
                placeholder="e.g. Read French Chapter 5"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '99px',
                  fontSize: '0.95rem'
                }}
              />
              <button type="submit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 16px' }}>
                <Plus size={18} />
              </button>
            </form>

            {homeworkList.length === 0 ? (
              <p style={{ opacity: 0.6, fontSize: '0.95rem', textAlign: 'center', padding: '16px' }}>
                No homework assigned for today.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {homeworkList.map(item => (
                  <div key={item.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '12px',
                    border: '1px solid rgba(56, 189, 248, 0.15)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neon-pink)' }} />
                      <span style={{ fontSize: '1rem', color: '#f1f5f9' }}>{item.text}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteHomework(item.text)}
                      style={{ background: 'transparent', color: 'var(--neon-orange)', padding: '6px', border: 'none', boxShadow: 'none' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Daily Behavior Conduct Feedback */}
          <div className="game-panel" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <MessageSquare size={22} color="var(--neon-pink)" />
              <h3 style={{ margin: 0 }}>Behavior Feedback Desk</h3>
            </div>

            {students.length === 0 ? (
              <p style={{ opacity: 0.6, fontSize: '0.95rem', textAlign: 'center', padding: '32px 16px' }}>
                No students linked to your classroom yet. Invite parents to enter your code <strong>{profile?.teacher_id}</strong> on signup.
              </p>
            ) : (
              <>
                {/* Student Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                    Select Student
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} color="var(--text-muted)" />
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '99px',
                        border: '2px solid rgba(56, 189, 248, 0.2)',
                        background: 'rgba(7, 11, 25, 0.8)',
                        color: 'white',
                        fontFamily: 'inherit',
                        fontSize: '0.95rem',
                        outline: 'none'
                      }}
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.username}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px', lineHeight: '1.4' }}>
                  Submit focus, listening, and class participation reviews for the parent's dashboard.
                </p>

                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  placeholder={`Type daily review (e.g. Completed reading worksheets on time, highly focused today!)`}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    border: '2px solid rgba(56, 189, 248, 0.2)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: 'white',
                    fontFamily: 'inherit',
                    fontSize: '0.95rem',
                    outline: 'none',
                    resize: 'vertical',
                    marginBottom: '16px'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={handleSaveFeedback} className="success" style={{ width: '100%' }}>
                    Submit Student Feedback
                  </button>
                </div>

                {showSavedToast && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '10px', 
                    borderRadius: '8px', 
                    background: 'rgba(16, 185, 129, 0.2)', 
                    border: '1px solid var(--neon-green)',
                    color: '#d1fae5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.9rem'
                  }}>
                    <CheckCircle2 size={16} color="var(--neon-green)" /> Feedback saved and sync'd to parents!
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
