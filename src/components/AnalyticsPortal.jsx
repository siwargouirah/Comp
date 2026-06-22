import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, AlertCircle, MessageSquare, Award } from 'lucide-react';
import { StorageService } from '../services/StorageService';
import { AgentService } from '../services/AgentService';

export function AnalyticsPortal({ user, profile }) {
  const [logs, setLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teacherFeedback, setTeacherFeedback] = useState('');
  const [aiInsights, setAiInsights] = useState([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [loading, setLoading] = useState(true);

  const childId = profile?.child_id;

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!childId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const loadedLogs = StorageService.getLogs();
      const loadedTasks = await StorageService.getTasks(childId);
      setLogs(loadedLogs);
      setTasks(loadedTasks);
      
      const feedbackText = await StorageService.getTeacherFeedback(childId);
      setTeacherFeedback(feedbackText);

      setIsLoadingInsights(true);
      const insights = await AgentService.generateInsights();
      setAiInsights(insights);
      setIsLoadingInsights(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- Calculations for Quest Completion Rate (Last 7 Days) ---
  const getWeeklyCompletionData = () => {
    // Generate dates for the last 7 days
    const data = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Seed data with default values if no real logs exist yet for demonstration
    const seedRates = [80, 60, 100, 75, 90, 85, 100]; 
    const seedTaskCounts = [[4, 5], [3, 5], [5, 5], [3, 4], [9, 10], [11, 13], [0, 0]]; // [completed, total]

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString();
      const dayLabel = daysOfWeek[d.getDay()];

      // Filter tasks assigned on this day or logs on this day
      const dayCompletions = logs.filter(l => {
        const logDate = new Date(l.time).toLocaleDateString();
        return logDate === dateStr && l.action === 'complete';
      });

      const dayStarts = logs.filter(l => {
        const logDate = new Date(l.time).toLocaleDateString();
        return logDate === dateStr && l.action === 'start';
      });

      let completed = dayCompletions.length;
      let total = Math.max(dayStarts.length, completed);

      // If it's today and we have active tasks, let's use the actual data
      if (i === 0 && tasks.length > 0) {
        total = tasks.length;
        completed = tasks.filter(t => t.completed).length;
      }

      // Fallback to seed data for past days to ensure a rich chart display during the pitch
      if (i > 0 && total === 0) {
        const seedIndex = d.getDay();
        total = seedTaskCounts[seedIndex][1];
        completed = seedTaskCounts[seedIndex][0];
      }

      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      data.push({
        label: dayLabel,
        date: dateStr,
        rate,
        completed,
        total
      });
    }
    return data;
  };

  // --- Calculations for Repeated Task Focus Times ---
  const getRepeatedTaskData = () => {
    // We group completions by task text to find repeated tasks
    const taskDurationMap = {};

    // First trace: find all completions in logs that have duration
    const completions = logs.filter(l => l.action === 'complete' && l.duration);

    // Also populate with mock entries for demonstration if logs are low
    const demoTasks = [
      { text: "Brush Teeth 🦷", durations: [180000, 150000, 120000] }, // 3m, 2.5m, 2m (focus speed improving!)
      { text: "Do Homework 🎒", durations: [2700000, 2100000, 1800000] }, // 45m, 35m, 30m
      { text: "Clean Bed 🛏️", durations: [600000, 480000, 300000] } // 10m, 8m, 5m
    ];

    completions.forEach(log => {
      const task = tasks.find(t => t.id === log.taskId);
      if (task) {
        const text = task.text;
        if (!taskDurationMap[text]) {
          taskDurationMap[text] = [];
        }
        taskDurationMap[text].push(log.duration);
      }
    });

    // Merge demo tasks if local entries are low
    demoTasks.forEach(demo => {
      if (!taskDurationMap[demo.text]) {
        taskDurationMap[demo.text] = demo.durations;
      } else if (taskDurationMap[demo.text].length < 2) {
        taskDurationMap[demo.text] = [...demo.durations, ...taskDurationMap[demo.text]];
      }
    });

    return Object.keys(taskDurationMap).map(taskText => ({
      taskText,
      attempts: taskDurationMap[taskText].map((dur, index) => ({
        attemptNum: index + 1,
        minutes: (dur / 60000).toFixed(1),
        durationMs: dur
      }))
    }));
  };

  if (!childId) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '24px', textAlign: 'center' }}>
        <h2 className="slanted-heading" style={{ color: 'var(--neon-pink)', marginBottom: '8px' }}>📊 Parent Insights Portal</h2>
        <p style={{ color: 'var(--text-muted)' }}>Please configure your caregiver link setup first.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '40px', textAlign: 'center', color: 'var(--neon-pink)' }}>
        Loading student analytics...
      </div>
    );
  }

  const weeklyData = getWeeklyCompletionData();
  const repeatedTasks = getRepeatedTaskData();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '12px' }}>
      
      <div style={{ marginBottom: '24px' }}>
        <h2 className="slanted-heading" style={{ color: 'var(--neon-pink)', marginBottom: '8px' }}>📊 Parent Insights Portal</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Monitor daily achievements, review classroom feedback, and analyze focus metrics and local AI suggestions.
        </p>
      </div>

      {/* Row 1: Teacher Report */}
      <div style={{ marginBottom: '24px' }}>
        <div className="game-panel" style={{ borderLeft: '4px solid var(--neon-pink)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <MessageSquare size={22} color="var(--neon-pink)" />
            <h3 style={{ margin: 0 }}>Today's Teacher Report</h3>
          </div>

          <div style={{ 
            background: 'rgba(15, 23, 42, 0.4)', 
            padding: '20px', 
            borderRadius: '16px',
            border: '1px solid rgba(217, 70, 239, 0.15)',
            position: 'relative'
          }}>
            <p style={{ fontSize: '1.05rem', fontStyle: 'italic', lineHeight: '1.5', color: '#f1f5f9' }}>
              "{teacherFeedback || "No feedback submitted yet for today."}"
            </p>
            <div style={{ marginTop: '14px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              — Submitted by School Instructor
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Charts and Graphs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        
        {/* Left: Quest Completion Rate (Last 7 Days) */}
        <div className="game-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <TrendingUp size={22} color="var(--neon-cyan)" />
            <h3 style={{ margin: 0 }}>Quest Completion Rate (Last 7 Days)</h3>
          </div>

          {/* Bar Chart Container */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-end', 
            height: '220px', 
            padding: '0 16px',
            marginTop: '20px',
            borderBottom: '2px solid rgba(255, 255, 255, 0.15)',
            position: 'relative'
          }}>
            {/* Grid background lines */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: '25%', borderTop: '1px dashed rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: '75%', borderTop: '1px dashed rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

            {weeklyData.map((day, idx) => (
              <div key={idx} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                width: '12%', 
                height: '100%', 
                justifyContent: 'flex-end' 
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--neon-cyan)', marginBottom: '6px' }}>
                  {day.rate}%
                </span>
                
                {/* Bar */}
                <div style={{ 
                  width: '100%', 
                  height: `${day.rate * 0.75}%`, // scale it to leave room for text
                  background: day.rate === 100 
                    ? 'linear-gradient(180deg, var(--neon-green) 0%, #34d399 100%)' 
                    : 'linear-gradient(180deg, var(--neon-cyan) 0%, var(--neon-blue) 100%)',
                  borderRadius: '6px 6px 0 0',
                  boxShadow: day.rate === 100 ? 'var(--shadow-green)' : 'var(--shadow-blue)',
                  transition: 'all 0.5s ease',
                  cursor: 'pointer'
                }} 
                title={`${day.completed}/${day.total} tasks done`}
                />
                
                <span style={{ fontSize: '0.85rem', fontWeight: '800', marginTop: '8px', color: '#94a3b8' }}>
                  {day.label}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '16px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: 'var(--neon-cyan)', borderRadius: '3px' }} />
              <span>Quests completed (partial)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: 'var(--neon-green)', borderRadius: '3px' }} />
              <span>Perfect Day! (100% completed)</span>
            </div>
          </div>
        </div>

        {/* Right: Task Efficiency / Speed Tracker */}
        <div className="game-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Clock size={22} color="var(--neon-orange)" />
            <h3 style={{ margin: 0 }}>Quest Focus Speeds</h3>
          </div>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Tracks focus metrics for repetitive quests. Shorter durations show focus improvements!
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '250px', overflowY: 'auto' }}>
            {repeatedTasks.map((item, idx) => (
              <div key={idx} style={{ 
                background: 'rgba(15, 23, 42, 0.3)', 
                padding: '12px', 
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '8px' }}>
                  {item.taskText}
                </div>
                
                {/* Horizontal attempts bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {item.attempts.map((attempt, attemptIdx) => {
                    // Normalize width against a max duration of 45 minutes
                    const maxVal = 45;
                    const valPercent = Math.min((attempt.minutes / maxVal) * 100, 100);
                    
                    // Color goes from green (fast) to orange (slow)
                    let barColor = 'var(--neon-green)';
                    if (attempt.minutes > 20) barColor = 'var(--neon-orange)';
                    else if (attempt.minutes > 10) barColor = '#eab308'; // yellow
                    
                    return (
                      <div key={attemptIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                        <span style={{ width: '60px', opacity: 0.6 }}>Run #{attempt.attemptNum}</span>
                        
                        {/* Bar track */}
                        <div style={{ flex: 1, height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${valPercent}%`, 
                            height: '100%', 
                            background: barColor, 
                            borderRadius: '99px' 
                          }} />
                        </div>
                        
                        <span style={{ width: '45px', fontWeight: 'bold', textAlign: 'right', color: barColor }}>
                          {attempt.minutes}m
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
