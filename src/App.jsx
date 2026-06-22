import React, { useState, useEffect } from 'react';
import { LogOut, User, Users, BookOpen, Shield, Award, Sparkles, CheckCircle, HelpCircle } from 'lucide-react';
import { CaregiverPortal } from './components/CaregiverPortal';
import { ChildPortal } from './components/ChildPortal';
import { TeacherPortal } from './components/TeacherPortal';
import { AnalyticsPortal } from './components/AnalyticsPortal';
import { AuthService } from './services/AuthService';
import { supabase } from './services/supabaseClient';

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // Authentication UI State
  const [selectedRole, setSelectedRole] = useState(null); // 'parent', 'child', 'teacher'
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [authError, setAuthError] = useState('');

  // Parent Link Setup State
  const [teacherIdInput, setTeacherIdInput] = useState('');
  const [childUsernameInput, setChildUsernameInput] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  // Navigation View State for Parent
  const [view, setView] = useState('caregiver');

  useEffect(() => {
    checkSession();

    // Listen for auth state changes (e.g. session refresh, signouts)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // Fetch profile
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (!profErr && prof) {
          setUser(session.user);
          setProfile(prof);
          // Set parent's default view
          if (prof.role === 'parent') {
            setView('caregiver');
          }
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    setLoading(true);
    try {
      const session = await AuthService.getCurrentUser();
      if (session) {
        setUser(session.user);
        setProfile(session.profile);
        if (session.profile?.role === 'parent') {
          setView('caregiver');
        }
      }
    } catch (err) {
      console.error("Session check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (authMode === 'signup') {
      if (!username.trim() || !password.trim()) {
        setAuthError("Username and password are required.");
        return;
      }
      if (selectedRole !== 'child' && !email.trim()) {
        setAuthError("Email is required.");
        return;
      }
      if (selectedRole === 'parent' && !phoneNumber.trim()) {
        setAuthError("Phone number is required for SMS notification triggers.");
        return;
      }

      try {
        setLoading(true);
        if (selectedRole === 'parent') {
          await AuthService.signUpParent(username.trim(), email.trim(), password, phoneNumber.trim());
        } else if (selectedRole === 'teacher') {
          await AuthService.signUpTeacher(username.trim(), email.trim(), password);
        } else if (selectedRole === 'child') {
          await AuthService.signUpChild(username.trim(), password);
        }
        
        // Log in automatically after signup
        const loginVal = selectedRole === 'child' ? username.trim() : email.trim();
        const loginData = await AuthService.login(loginVal, password);
        setUser(loginData.user);
        setProfile(loginData.profile);
      } catch (err) {
        setAuthError(err.message || "Sign up failed.");
        setLoading(false);
      }
    } else {
      // Login
      const identifier = selectedRole === 'child' ? username.trim() : email.trim();
      if (!identifier || !password) {
        setAuthError(`Please enter your ${selectedRole === 'child' ? 'username' : 'email'} and password.`);
        return;
      }

      try {
        setLoading(true);
        const loginData = await AuthService.login(identifier, password);
        
        // If login role doesn't match selected role, warn them but log in anyway
        if (loginData.profile.role !== selectedRole) {
          console.warn(`User role '${loginData.profile.role}' does not match selected login screen role '${selectedRole}'. Redirecting to correct portal.`);
        }

        setUser(loginData.user);
        setProfile(loginData.profile);
      } catch (err) {
        setAuthError(err.message || "Invalid credentials.");
        setLoading(false);
      }
    }
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    setLinkError('');
    setLinkSuccess('');

    if (!teacherIdInput.trim() || !childUsernameInput.trim()) {
      setLinkError("Both Teacher ID and Child Username are required.");
      return;
    }

    try {
      setLoading(true);
      const { childId } = await AuthService.linkParentToTeacherAndChild(
        profile.id,
        teacherIdInput.trim().toUpperCase(),
        childUsernameInput.trim()
      );
      setLinkSuccess(`Successfully linked to Child (${childUsernameInput}) and Teacher classroom!`);
      
      // Reload profile
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single();
      
      setProfile(updatedProfile);
    } catch (err) {
      setLinkError(err.message || "Linking failed. Please check the codes.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await AuthService.signOut();
      setUser(null);
      setProfile(null);
      setSelectedRole(null);
      setAuthMode('login');
      setUsername('');
      setEmail('');
      setPassword('');
      setPhoneNumber('');
      setAuthError('');
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Loading Screen
  if (loading && !user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 10%, #e0f2fe 0%, #f0f7ff 80%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-light)',
        gap: '16px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(56, 189, 248, 0.2)',
          borderTop: '4px solid var(--neon-blue)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ fontFamily: "'Nunito', sans-serif", fontSize: '1.2rem', letterSpacing: '0.05em', color: 'var(--neon-blue)' }}>Loading cosmic settings...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // --- UNAUTHENTICATED FLOW ---
  if (!user || !profile) {
    // 1. Role Selection landing page
    if (!selectedRole) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          width: '100%'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ fontSize: '3rem', textShadow: '0 0 15px var(--neon-blue)' }}>✨</span>
              <h1 className="slanted-heading" style={{ fontSize: '3.5rem', margin: 0 }}>AURA</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
              A Gamified ADHD Executive Functioning Companion & Classroom Sync Console.
            </p>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', fontWeight: '800', letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--text-light)' }}>
            Choose Your Portal
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            maxWidth: '1000px',
            width: '100%'
          }}>
            {/* Child Card */}
            <div 
              className="game-panel animate-slide-up"
              onClick={() => { setSelectedRole('child'); setAuthMode('login'); }}
              style={{
                cursor: 'pointer',
                textAlign: 'center',
                padding: '32px 24px',
                border: '2px solid rgba(56, 189, 248, 0.2)',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--neon-blue)';
                e.currentTarget.style.boxShadow = 'var(--shadow-blue)';
                e.currentTarget.style.transform = 'translateY(-5px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.2)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                background: 'rgba(56, 189, 248, 0.15)',
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                border: '1px solid var(--neon-blue)'
              }}>
                <Award size={36} color="var(--neon-blue)" />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--text-light)' }}>Kid Portal</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Complete your quests, earn cosmic Aura Dust, and watch your 3D pet companion respond in real-time!
              </p>
            </div>

            {/* Parent Card */}
            <div 
              className="game-panel animate-slide-up"
              onClick={() => { setSelectedRole('parent'); setAuthMode('login'); }}
              style={{
                cursor: 'pointer',
                textAlign: 'center',
                padding: '32px 24px',
                border: '2px solid rgba(217, 70, 239, 0.2)',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--neon-pink)';
                e.currentTarget.style.boxShadow = 'var(--shadow-pink)';
                e.currentTarget.style.transform = 'translateY(-5px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(217, 70, 239, 0.2)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                background: 'rgba(217, 70, 239, 0.15)',
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                border: '1px solid var(--neon-pink)'
              }}>
                <Shield size={36} color="var(--neon-pink)" />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--text-light)' }}>Caregiver Desk</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Manage daily quests, approve completions, configure Brevo SMS notifications, and review homework.
              </p>
            </div>

            {/* Teacher Card */}
            <div 
              className="game-panel animate-slide-up"
              onClick={() => { setSelectedRole('teacher'); setAuthMode('login'); }}
              style={{
                cursor: 'pointer',
                textAlign: 'center',
                padding: '32px 24px',
                border: '2px solid rgba(16, 185, 129, 0.2)',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--neon-green)';
                e.currentTarget.style.boxShadow = 'var(--shadow-green)';
                e.currentTarget.style.transform = 'translateY(-5px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                border: '1px solid var(--neon-green)'
              }}>
                <BookOpen size={36} color="var(--neon-green)" />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '12px', color: 'var(--text-light)' }}>Teacher Desk</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Assign homework, track student progress, and post behavior feedback that syncs instantly to parents.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // 2. Authentication forms (Login / Register) for the chosen role
    const getRoleColor = () => {
      if (selectedRole === 'child') return 'var(--neon-blue)';
      if (selectedRole === 'teacher') return 'var(--neon-green)';
      return 'var(--neon-pink)';
    };

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        width: '100%'
      }}>
        <div className="game-panel animate-slide-up" style={{
          maxWidth: '480px',
          width: '100%',
          padding: '32px',
          border: `2px solid ${getRoleColor()}`,
          boxShadow: selectedRole === 'child' ? 'var(--shadow-blue)' : selectedRole === 'teacher' ? 'var(--shadow-green)' : 'var(--shadow-pink)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button 
              className="secondary" 
              onClick={() => { setSelectedRole(null); setAuthError(''); }}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              ← Back
            </button>
            <h3 style={{
              margin: 0,
              fontSize: '1.2rem',
              fontWeight: '900',
              color: getRoleColor(),
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {selectedRole} Portal
            </h3>
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '20px', textAlign: 'center', color: 'var(--text-light)' }}>
            {authMode === 'login' ? 'Welcome Back!' : 'Create Cosmic Account'}
          </h2>

          {/* Toggle tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-deep)',
            borderRadius: '99px',
            padding: '4px',
            marginBottom: '24px',
            border: '1px solid rgba(0,0,0,0.05)'
          }}>
            <button
              onClick={() => { setAuthMode('login'); setAuthError(''); }}
              style={{
                flex: 1,
                borderRadius: '99px',
                padding: '8px 16px',
                border: 'none',
                background: authMode === 'login' ? getRoleColor() : 'transparent',
                color: authMode === 'login' ? 'black' : 'var(--text-muted)',
                fontWeight: '800',
                fontSize: '0.9rem',
                boxShadow: 'none'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('signup'); setAuthError(''); }}
              style={{
                flex: 1,
                borderRadius: '99px',
                padding: '8px 16px',
                border: 'none',
                background: authMode === 'signup' ? getRoleColor() : 'transparent',
                color: authMode === 'signup' ? 'black' : 'var(--text-muted)',
                fontWeight: '800',
                fontSize: '0.9rem',
                boxShadow: 'none'
              }}
            >
              Register
            </button>
          </div>

          {/* Error Alert */}
          {authError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '0.9rem',
              lineHeight: '1.4'
            }}>
              ⚠️ {authError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Username - Required for all signups, and Child login */}
            {(authMode === 'signup' || selectedRole === 'child') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. superhero123"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '2px solid rgba(0,0,0,0.1)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: 'var(--text-light)',
                    fontSize: '0.95rem'
                  }}
                  required
                />
              </div>
            )}

            {/* Email - Required for Parent/Teacher Login & Signup */}
            {selectedRole !== 'child' && (authMode === 'signup' || authMode === 'login') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. name@email.com"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '2px solid rgba(0,0,0,0.1)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: 'var(--text-light)',
                    fontSize: '0.95rem'
                  }}
                  required
                />
              </div>
            )}

            {/* Phone Number - Required for Parent Signup only */}
            {selectedRole === 'parent' && authMode === 'signup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone Number</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neon-blue)', fontWeight: 'bold' }}>For Brevo SMS triggers</span>
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +21650402494"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '2px solid rgba(0,0,0,0.1)',
                    background: 'rgba(255, 255, 255, 0.9)',
                    color: 'var(--text-light)',
                    fontSize: '0.95rem'
                  }}
                  required
                />
              </div>
            )}

            {/* Password - Required for all */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(0,0,0,0.1)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: 'var(--text-light)',
                  fontSize: '0.95rem'
                }}
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              style={{
                marginTop: '12px',
                padding: '14px',
                borderRadius: '99px',
                border: 'none',
                background: getRoleColor(),
                color: 'black',
                fontWeight: '900',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'none'
              }}
            >
              <Sparkles size={18} />
              {authMode === 'login' ? 'Confirm Sign In' : 'Register Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED FLOWS ---

  // 1. Parent linking screen setup wizard
  if (profile.role === 'parent' && (!profile.child_id || !profile.teacher_id)) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        width: '100%'
      }}>
        <div className="game-panel animate-slide-up" style={{
          maxWidth: '540px',
          width: '100%',
          padding: '36px',
          border: '2px solid var(--neon-pink)',
          boxShadow: 'var(--shadow-pink)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, color: 'var(--neon-pink)', fontWeight: '900', letterSpacing: '0.05em' }}>
              COSMIC SETUP WIZARD
            </h3>
            <button 
              onClick={handleLogout} 
              style={{
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px'
              }}
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-light)', marginBottom: '12px' }}>
            🔗 Link Your Caregiver Console
          </h2>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>
            To enable quests, homework syncing, and progress tracking, please link your account with your child's username and their teacher's classroom code.
          </p>

          {/* Success/Error messages */}
          {linkError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '0.9rem'
            }}>
              ⚠️ {linkError}
            </div>
          )}

          {linkSuccess && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid var(--neon-green)',
              color: '#d1fae5',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '20px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle size={18} color="var(--neon-green)" /> {linkSuccess}
            </div>
          )}

          <form onSubmit={handleLinkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Child's Username</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Child must register account first</span>
              </div>
              <input
                type="text"
                value={childUsernameInput}
                onChange={(e) => setChildUsernameInput(e.target.value)}
                placeholder="e.g. childusername"
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(0,0,0,0.1)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: 'var(--text-light)',
                  fontSize: '0.95rem'
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Teacher classroom ID</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Get this code from the teacher (e.g. TCH-XXXXXX)</span>
              </div>
              <input
                type="text"
                value={teacherIdInput}
                onChange={(e) => setTeacherIdInput(e.target.value)}
                placeholder="e.g. TCH-A1B2C3"
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(0,0,0,0.1)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: 'var(--text-light)',
                  fontSize: '0.95rem'
                }}
                required
              />
            </div>

            <button
              type="submit"
              style={{
                marginTop: '12px',
                padding: '14px',
                borderRadius: '99px',
                border: 'none',
                background: 'var(--neon-pink)',
                color: 'black',
                fontWeight: '900',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'none'
              }}
            >
              <Sparkles size={18} /> Complete Link Configuration
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Dashboards (Teacher / Child / Parent)
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%' }}>
      
      {/* Global Navigation HUD Bar */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderBottom: '3px solid var(--neon-blue)',
        padding: '16px 24px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          width: '100%'
        }}>
          {/* Logo / Mascot Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.8rem', textShadow: '0 0 10px var(--neon-blue)' }}>✨</span>
            <h1 className="slanted-heading" style={{ margin: 0, fontSize: '1.8rem' }}>AURA</h1>
            <span style={{
              marginLeft: '8px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              background: profile.role === 'child' ? 'rgba(56, 189, 248, 0.15)' : profile.role === 'teacher' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(217, 70, 239, 0.15)',
              color: profile.role === 'child' ? 'var(--neon-blue)' : profile.role === 'teacher' ? 'var(--neon-green)' : 'var(--neon-pink)',
              textTransform: 'uppercase',
              border: `1px solid ${profile.role === 'child' ? 'var(--neon-blue)' : profile.role === 'teacher' ? 'var(--neon-green)' : 'var(--neon-pink)'}`
            }}>
              {profile.role}
            </span>
          </div>

          {/* Navigation Links - ONLY Parent sees these */}
          {profile.role === 'parent' && (
            <nav style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                className={view === 'caregiver' ? '' : 'secondary'}
                onClick={() => setView('caregiver')}
                style={{ padding: '10px 20px', fontSize: '1.1rem' }}
              >
                Caregiver Desk
              </button>
              <button 
                className={view === 'child' ? '' : 'secondary'}
                onClick={() => setView('child')}
                style={{ padding: '10px 20px', fontSize: '1.1rem' }}
              >
                Quest Board Preview
              </button>
              <button 
                className={view === 'analytics' ? '' : 'secondary'}
                onClick={() => setView('analytics')}
                style={{ padding: '10px 20px', fontSize: '1.1rem' }}
              >
                Parent Insights
              </button>
            </nav>
          )}

          {/* User Session Info / Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={16} color="var(--text-muted)" />
              <span style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{profile.username}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="secondary"
              style={{
                padding: '8px 16px',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        padding: '24px 16px 80px 16px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Child Portal */}
        {profile.role === 'child' && (
          <ChildPortal user={user} profile={profile} onSwitch={handleLogout} />
        )}

        {/* Teacher Portal */}
        {profile.role === 'teacher' && (
          <TeacherPortal user={user} profile={profile} />
        )}

        {/* Parent / Caregiver Portal Views */}
        {profile.role === 'parent' && (
          <>
            {view === 'caregiver' && <CaregiverPortal user={user} profile={profile} />}
            {view === 'child' && <ChildPortal user={user} profile={profile} onSwitch={() => setView('caregiver')} />}
            {view === 'analytics' && <AnalyticsPortal user={user} profile={profile} />}
          </>
        )}
      </main>

    </div>
  );
}

export default App;
