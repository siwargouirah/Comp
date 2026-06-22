import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Sparkles, BookOpen, Link, Check, RefreshCw } from 'lucide-react';
import { StorageService } from '../services/StorageService';

export function CaregiverPortal({ user, profile }) {
  const [tasks, setTasks] = useState([]);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [localProfile, setLocalProfile] = useState({ theme: 'Space', dust: 0 });
  const [themeInput, setThemeInput] = useState('');

  const childId = profile?.child_id;

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!childId) return;

    const loadedProfile = StorageService.getProfile();
    const loadedTasks = await StorageService.getTasks(childId);
    setTasks(loadedTasks);
    setLocalProfile(loadedProfile);
    setThemeInput(loadedProfile.theme);
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskInput.trim() || !childId) return;
    await StorageService.addTask(newTaskInput.trim(), childId);
    setNewTaskInput('');
    loadData();
  };

  const handleDeleteTask = async (id) => {
    await StorageService.deleteTask(id);
    loadData();
  };

  const handleSaveTheme = () => {
    if (!themeInput.trim()) return;
    StorageService.updateProfile({ theme: themeInput.trim() });
    loadData();
  };

  const handleApproveTask = async (id) => {
    await StorageService.approveTask(id);
    loadData();
  };

  const handleRejectTask = async (id) => {
    await StorageService.rejectTask(id);
    loadData();
  };

  const handleCopyN8NWorkflow = () => {
    const workflowJson = {
      "name": "Aura ADHD Automation Workflow",
      "nodes": [
        {
          "parameters": {
            "httpMethod": "POST",
            "path": "aura-trigger",
            "options": {}
          },
          "id": "webhook-node-id",
          "name": "Aura Webhook Listener",
          "type": "n8n-nodes-base.webhook",
          "typeVersion": 1,
          "position": [
            100,
            200
          ]
        },
        {
          "parameters": {
            "dataType": "string",
            "value1": "={{$json.body.event}}",
            "rules": {
              "rules": [
                {
                  "value2": "all_tasks_completed"
                },
                {
                  "value2": "quest_approved",
                  "output": 1
                }
              ]
            }
          },
          "id": "switch-node-id",
          "name": "Check Event Type",
          "type": "n8n-nodes-base.switch",
          "typeVersion": 1,
          "position": [
            300,
            200
          ]
        },
        {
          "parameters": {
            "method": "POST",
            "url": "https://api.brevo.com/v3/transactionalSMS/send",
            "sendHeaders": true,
            "headerParameters": {
              "parameters": [
                {
                  "name": "api-key",
                  "value": "={{ $node['Aura Webhook Listener'].json.body.brevoApiKey || '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' }}"
                },
                {
                  "name": "accept",
                  "value": "application/json"
                }
              ]
            },
            "sendBody": true,
            "contentType": "json",
            "specifyBody": "json",
            "jsonBody": "{\n  \"sender\": \"{{ $node['Aura Webhook Listener'].json.body.sender || 'AURA' }}\",\n  \"recipient\": \"{{ $node['Aura Webhook Listener'].json.body.recipient || '+21650402494' }}\",\n  \"content\": \"🔔 Aura Alert: Leo has completed ALL assigned tasks for today! Please review them in the Caregiver Desk.\"\n}"
          },
          "id": "sms-complete-id",
          "name": "Brevo SMS: All Tasks Done",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4.1,
          "position": [
            550,
            100
          ]
        },
        {
          "parameters": {
            "method": "POST",
            "url": "https://api.brevo.com/v3/transactionalSMS/send",
            "sendHeaders": true,
            "headerParameters": {
              "parameters": [
                {
                  "name": "api-key",
                  "value": "={{ $node['Aura Webhook Listener'].json.body.brevoApiKey || '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' }}"
                },
                {
                  "name": "accept",
                  "value": "application/json"
                }
              ]
            },
            "sendBody": true,
            "contentType": "json",
            "specifyBody": "json",
            "jsonBody": "{\n  \"sender\": \"{{ $node['Aura Webhook Listener'].json.body.sender || 'AURA' }}\",\n  \"recipient\": \"{{ $node['Aura Webhook Listener'].json.body.recipient || '+21650402494' }}\",\n  \"content\": \"🌟 Aura Update: Leo's quest '{{ $node['Aura Webhook Listener'].json.body.taskText || $json.body.taskText }}' was verified & approved! 100 Dust added! ✨\"\n}"
          },
          "id": "sms-approved-id",
          "name": "Brevo SMS: Quest Approved",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4.1,
          "position": [
            550,
            300
          ]
        },
        {
          "parameters": {
            "rule": {
              "interval": [
                {
                  "field": "hours",
                  "timeAt": "20:00"
                }
              ]
            }
          },
          "id": "schedule-trigger-id",
          "name": "Medication Reminder (8 PM)",
          "type": "n8n-nodes-base.scheduleTrigger",
          "typeVersion": 1.1,
          "position": [
            100,
            480
          ]
        },
        {
          "parameters": {
            "method": "POST",
            "url": "https://api.brevo.com/v3/transactionalSMS/send",
            "sendHeaders": true,
            "headerParameters": {
              "parameters": [
                {
                  "name": "api-key",
                  "value": "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"
                },
                {
                  "name": "accept",
                  "value": "application/json"
                }
              ]
            },
            "sendBody": true,
            "contentType": "json",
            "specifyBody": "json",
            "jsonBody": "{\n  \"sender\": \"AURA\",\n  \"recipient\": \"+21650402494\",\n  \"content\": \"💊 Aura Medication Alert: It is 8:00 PM. Please remember to administer Leo's daily medication!\"\n}"
          },
          "id": "sms-meds-id",
          "name": "Brevo SMS: Meds Reminder",
          "type": "n8n-nodes-base.httpRequest",
          "typeVersion": 4.1,
          "position": [
            350,
            480
          ]
        }
      ],
      "connections": {
        "Aura Webhook Listener": {
          "main": [
            [
              {
                "node": "Check Event Type",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Check Event Type": {
          "main": [
            [
              {
                "node": "Brevo SMS: All Tasks Done",
                "type": "main",
                "index": 0
              }
            ],
            [
              {
                "node": "Brevo SMS: Quest Approved",
                "type": "main",
                "index": 0
              }
            ]
          ]
        },
        "Medication Reminder (8 PM)": {
          "main": [
            [
              {
                "node": "Brevo SMS: Meds Reminder",
                "type": "main",
                "index": 0
              }
            ]
          ]
        }
      },
      "active": true
    };
    
    navigator.clipboard.writeText(JSON.stringify(workflowJson, null, 2))
      .then(() => alert("Brevo SMS n8n Workflow JSON template copied to clipboard! Import it directly in your n8n workspace by hitting Ctrl+V."));
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '12px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="slanted-heading" style={{ color: 'var(--neon-blue)' }}>⚙️ Caregiver Setup Console</h2>
        <Settings size={26} color="var(--neon-blue)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '24px' }}>
        
        {/* Left Column: Theme Settings & Routine Builder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Theme Settings */}
          <div className="game-panel" style={{ borderLeft: '4px solid var(--neon-blue)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Sparkles size={20} color="var(--neon-blue)" />
              <h3 style={{ margin: 0 }}>Quest Universe Theme</h3>
            </div>
            <p style={{ marginBottom: '16px', opacity: 0.8, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Type any theme. Aura will dynamically rebuild daily routines into epic adventures based on this world.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text"
                value={themeInput} 
                onChange={(e) => setThemeInput(e.target.value)}
                placeholder="e.g. Minecraft, Dinosaurs, Ninjas, Space..."
                style={{ 
                  flex: 1,
                  padding: '10px 16px', 
                  borderRadius: '99px', 
                  fontSize: '1rem'
                }}
              />
              <button onClick={handleSaveTheme}>Save</button>
            </div>
          </div>

          {/* Routine Builder */}
          <div className="game-panel" style={{ borderLeft: '4px solid var(--neon-pink)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Plus size={20} color="var(--neon-pink)" />
              <h3 style={{ margin: 0 }}>Daily Routine Builder</h3>
            </div>
            
            <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input 
                type="text" 
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                placeholder="e.g. Brush teeth, Do math homework"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '99px',
                  fontSize: '1rem'
                }}
              />
              <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                Add
              </button>
            </form>

            {tasks.length === 0 ? (
              <p style={{ opacity: 0.6, textAlign: 'center', fontSize: '0.95rem' }}>No quests assigned yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                {tasks.map(task => (
                  <div key={task.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '14px 16px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '16px',
                    border: '1px solid rgba(56, 189, 248, 0.15)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        width: '10px', 
                        height: '10px', 
                        borderRadius: '50%', 
                        flexShrink: 0,
                        background: task.completed ? 'var(--neon-green)' : task.completedByChild ? 'var(--neon-pink)' : 'var(--neon-blue)' 
                      }} />
                      
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <span style={{ 
                          fontSize: '1rem', 
                          textDecoration: task.completed ? 'line-through' : 'none', 
                          opacity: task.completed ? 0.4 : 1,
                          color: '#f8fafc',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap'
                        }}>
                          {task.text}
                        </span>
                        
                        {task.completedByChild && !task.completed && (
                          <span style={{ color: 'var(--neon-pink)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            Waiting for verification
                          </span>
                        )}
                        {task.isHomework && (
                          <span style={{ color: 'var(--neon-pink)', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                            <BookOpen size={10} /> Sync'd from Teacher
                          </span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      style={{ background: 'transparent', color: 'var(--neon-orange)', padding: '6px', border: 'none', boxShadow: 'none' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Quest Verification Desk & SMS Automation Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Verification Desk Card */}
          <div className="game-panel" style={{ borderLeft: '4px solid var(--neon-green)', height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--neon-green)' }} />
              <h3 style={{ margin: 0 }}>Quest Verification Desk</h3>
            </div>
            
            <p style={{ marginBottom: '16px', opacity: 0.8, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Review completed quests. Approve to finalize rewards, or reject if they require more work.
            </p>
            
            {tasks.filter(t => t.completedByChild && !t.completed).length === 0 ? (
              <p style={{ opacity: 0.6, textAlign: 'center', fontSize: '0.95rem', padding: '16px' }}>
                No pending verifications from your child yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tasks.filter(t => t.completedByChild && !t.completed).map(task => (
                  <div key={task.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderRadius: '16px',
                    border: '1px solid var(--neon-green)',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '0.95rem', color: '#f8fafc', flex: '1', minWidth: '150px' }}>
                      {task.questText || task.text}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="success" 
                        onClick={() => handleApproveTask(task.id)}
                        style={{ padding: '6px 12px', fontSize: '0.85rem', boxShadow: '0 3px 0 #059669' }}
                      >
                        Approve
                      </button>
                      <button 
                        className="danger" 
                        onClick={() => handleRejectTask(task.id)}
                        style={{ padding: '6px 12px', fontSize: '0.85rem', boxShadow: '0 3px 0 #c2410c' }}
                      >
                        Not Yet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SMS Automation Card (Separate, under Verification Desk) */}
          <div className="game-panel" style={{ borderLeft: '4px solid var(--neon-purple)', height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Link size={20} color="var(--neon-purple)" />
              <h3 style={{ margin: 0, textTransform: 'lowercase' }}>check your phone</h3>
            </div>
            
            <p style={{ marginBottom: '16px', opacity: 0.8, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              SMS alerts are automatically sent to your phone (<strong>+21650402494</strong>) when your child completes all daily quests or when you verify and approve them.
            </p>
            
            <button 
              className="secondary" 
              onClick={handleCopyN8NWorkflow}
              style={{ 
                width: '100%', 
                fontSize: '1rem', 
                padding: '10px 16px', 
                borderColor: 'var(--neon-purple)', 
                color: 'var(--neon-purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'none',
                fontWeight: 'bold',
                textTransform: 'lowercase'
              }}
            >
              brevo sms
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
