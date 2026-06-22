import React, { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle, Award, ShoppingBag, BookOpen, ToggleLeft, ToggleRight, Loader } from 'lucide-react';
import { StorageService } from '../services/StorageService';
import { AgentService } from '../services/AgentService';
import { AudioService } from '../services/AudioService';
import { Companion3D } from './Companion3D';

export function ChildPortal({ user, profile, onSwitch }) {
  const [tasks, setTasks] = useState([]);
  const [localProfile, setLocalProfile] = useState({ theme: 'Space', dust: 0, level: 1, purchases: [], equipped: [] });
  const [generatingFor, setGeneratingFor] = useState(null);
  const [allCompleted, setAllCompleted] = useState(false);
  const [speechText, setSpeechText] = useState("Hello! I'm Aura. Ready for today's quests?");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAR, setIsAR] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [childName, setChildName] = useState('Your child');

  // Position coordinates for the 3D companion
  const [companionPos, setCompanionPos] = useState({ top: 40, left: 450 });
  const containerRef = useRef(null);
  const taskRefs = useRef({});
  const idleRef = useRef(null);

  const childId = profile.role === 'child' ? profile.id : profile.child_id;

  useEffect(() => {
    loadData();
    // Preload AI model so it runs locally on first click
    AgentService.preloadModel().catch(console.error);
  }, [profile]);

  // Update companion position when tasks list changes
  useEffect(() => {
    const activeTask = tasks.find(t => t.inProgress && !t.completedByChild);
    updateCompanionPosition(activeTask ? activeTask.id : null);
  }, [tasks]);

  // Window resize and scroll listener to update positions dynamically
  useEffect(() => {
    const handleResizeOrScroll = () => {
      const activeTask = tasks.find(t => t.inProgress && !t.completedByChild);
      updateCompanionPosition(activeTask ? activeTask.id : null);
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll);
    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll);
    };
  }, [tasks]);

  const loadData = async () => {
    if (!childId) return;

    // Load child username if parent is previewing
    if (profile.role === 'parent') {
      try {
        const { data: cProfile } = await StorageService.getTasks(childId); // just check supabase
        // Fetch child profile username
        const { data } = await StorageService.getTasks(childId); // actually query profiles
      } catch (e) {}
    } else {
      setChildName(profile.username);
    }

    const loadedTasks = await StorageService.getTasks(childId);
    
    // Load local quest text descriptions & progress from localStorage cache
    const cachedQuestTexts = JSON.parse(localStorage.getItem('aura_cached_quests') || '{}');
    const mappedTasks = loadedTasks.map(t => ({
      ...t,
      questText: cachedQuestTexts[t.id] || null,
      inProgress: !!cachedQuestTexts[t.id]
    }));

    setTasks(mappedTasks);
    
    const loadedProfile = StorageService.getProfile();
    setLocalProfile(loadedProfile);
    
    // Check if all active daily tasks are finished
    const activeQuests = mappedTasks.filter(t => !t.completedByChild && !t.completed);
    if (mappedTasks.length > 0 && activeQuests.length === 0) {
      setAllCompleted(true);
      if (!allCompleted) {
        setSpeechText("All daily quests completed! Waiting for verification!");
        AudioService.speak("All daily quests completed! Waiting for verification!");
      }
    } else {
      setAllCompleted(false);
    }
  };

  const updateCompanionPosition = (activeId) => {
    if (window.innerWidth <= 768) return; // Media queries handle mobile overlay positioning

    setTimeout(() => {
      if (containerRef.current) {
        const parentRect = containerRef.current.getBoundingClientRect();
        const firstCard = Object.values(taskRefs.current)[0];
        
        let top = 180; // Default vertical center in the right empty column
        let left = 600; // Default horizontal offset if empty

        if (activeId && taskRefs.current[activeId]) {
          const rect = taskRefs.current[activeId].getBoundingClientRect();
          top = rect.top - parentRect.top + (rect.height - 300) / 2;
          left = rect.right - parentRect.left + 30;
        } else if (firstCard) {
          // Align horizontally next to the cards even when idle
          const rect = firstCard.getBoundingClientRect();
          left = rect.right - parentRect.left + 30;
          top = 180; // Centered vertically in the middle-right area
        }
        
        setCompanionPos({ top, left });
      }
    }, 100);
  };

  const handleStartTask = async (task) => {
    StorageService.logTaskStart(task.id);
    setGeneratingFor(task.id);
    setSpeechText("Thinking...");
    
    // Generative AI Transformation
    const questText = await AgentService.generateQuestText(task.text, localProfile.theme);
    
    setSpeechText(questText);
    setIsSpeaking(true);
    AudioService.speak(questText);
    
    // Set timer to disable talking animation
    setTimeout(() => setIsSpeaking(false), questText.length * 90);

    // Cache questText locally
    const cachedQuestTexts = JSON.parse(localStorage.getItem('aura_cached_quests') || '{}');
    cachedQuestTexts[task.id] = questText;
    localStorage.setItem('aura_cached_quests', JSON.stringify(cachedQuestTexts));

    const updatedTasks = tasks.map(t => {
      if (t.id === task.id) return { ...t, questText, inProgress: true };
      return t;
    });
    setTasks(updatedTasks);
    setGeneratingFor(null);
  };

  const handleCompleteTask = async (task) => {
    const n8nConfig = await StorageService.getN8NConfig(childId);
    await StorageService.logTaskComplete(task.id, n8nConfig, childName);
    
    const finishMessage = "Task finished! 100 Dust added. Show Mom/Dad to verify!";
    setSpeechText(finishMessage);
    setIsSpeaking(true);
    AudioService.speak("Task complete! Show your caregiver to verify.");
    setTimeout(() => setIsSpeaking(false), 3000);
    
    // Clean up local quest text cache for this task
    const cachedQuestTexts = JSON.parse(localStorage.getItem('aura_cached_quests') || '{}');
    delete cachedQuestTexts[task.id];
    localStorage.setItem('aura_cached_quests', JSON.stringify(cachedQuestTexts));

    // Reset position to idle
    updateCompanionPosition(null);
    loadData();
  };

  const buyItem = (itemId, cost) => {
    if (StorageService.purchaseItem(itemId, cost)) {
      setSpeechText(`Awesome! I've equipped my new item!`);
      AudioService.speak("Awesome! I love my new look!");
      loadData();
    } else {
      setSpeechText("You need more Aura Dust to buy this!");
      AudioService.speak("You need more Aura Dust!");
    }
  };

  const handleEquipItem = (itemId) => {
    StorageService.equipItem(itemId);
    setSpeechText("Putting this on now!");
    loadData();
  };

  const handleUnequipItem = (itemId) => {
    StorageService.unequipItem(itemId);
    setSpeechText("Taking this off!");
    loadData();
  };

  // Lists split by child state
  const activeQuests = tasks.filter(t => !t.completedByChild && !t.completed);
  const pendingQuests = tasks.filter(t => t.completedByChild && !t.completed);
  const verifiedQuests = tasks.filter(t => t.completed);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '12px' }}>
      
      {/* Header Info */}
      <div ref={idleRef} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="slanted-heading" style={{ color: 'var(--neon-blue)' }}>🎮 Quest Board</h2>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="secondary" onClick={() => setShowShop(!showShop)} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} /> Shop Customization
          </button>
          
          <div className="game-panel" style={{ padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center', borderRadius: '99px', border: '2px solid var(--neon-pink)' }}>
            <Award size={18} color="var(--neon-pink)" />
            <span style={{ fontWeight: '800', color: 'var(--neon-pink)' }}>{localProfile.dust} Dust</span>
          </div>
        </div>
      </div>

      {/* Shop Overlay */}
      {showShop && (
        <div className="game-panel animate-slide-up" style={{ padding: '24px', marginBottom: '24px', background: 'rgba(15, 23, 42, 0.95)', border: '2px solid var(--neon-pink)' }}>
          <h3 style={{ color: 'var(--neon-pink)', marginBottom: '8px' }}>Aura Customization Shop</h3>
          <p style={{ opacity: 0.8, marginBottom: '16px', fontSize: '0.95rem' }}>Spend your hard-earned Dust to purchase and equip skins!</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            
            {/* Wizard Hat */}
            <div style={{ background: 'rgba(7, 11, 25, 0.6)', padding: '16px', borderRadius: '16px', textAlign: 'center', border: '2px solid var(--neon-blue)' }}>
              <span style={{ fontSize: '2.2rem' }}>🧙‍♂️</span>
              <h4 style={{ margin: '8px 0', color: '#f1f5f9' }}>Wizard Hat</h4>
              <p style={{ fontWeight: 'bold', color: 'var(--neon-pink)', marginBottom: '10px' }}>500 Dust</p>
              
              {!localProfile.purchases?.includes('wizard_hat') ? (
                <button className="secondary" onClick={() => buyItem('wizard_hat', 500)} style={{ width: '100%' }}>Buy</button>
              ) : localProfile.equipped?.includes('wizard_hat') ? (
                <button className="success" onClick={() => handleUnequipItem('wizard_hat')} style={{ width: '100%' }}>Equipped</button>
              ) : (
                <button className="secondary" onClick={() => handleEquipItem('wizard_hat')} style={{ width: '100%' }}>Equip</button>
              )}
            </div>

            {/* Cool Visor */}
            <div style={{ background: 'rgba(7, 11, 25, 0.6)', padding: '16px', borderRadius: '16px', textAlign: 'center', border: '2px solid var(--neon-blue)' }}>
              <span style={{ fontSize: '2.2rem' }}>🕶️</span>
              <h4 style={{ margin: '8px 0', color: '#f1f5f9' }}>Cool Visor</h4>
              <p style={{ fontWeight: 'bold', color: 'var(--neon-pink)', marginBottom: '10px' }}>300 Dust</p>
              
              {!localProfile.purchases?.includes('cool_visor') ? (
                <button className="secondary" onClick={() => buyItem('cool_visor', 300)} style={{ width: '100%' }}>Buy</button>
              ) : localProfile.equipped?.includes('cool_visor') ? (
                <button className="success" onClick={() => handleUnequipItem('cool_visor')} style={{ width: '100%' }}>Equipped</button>
              ) : (
                <button className="secondary" onClick={() => handleEquipItem('cool_visor')} style={{ width: '100%' }}>Equip</button>
              )}
            </div>

            {/* Sparkle Jetpack sparkles */}
            <div style={{ background: 'rgba(7, 11, 25, 0.6)', padding: '16px', borderRadius: '16px', textAlign: 'center', border: '2px solid var(--neon-blue)' }}>
              <span style={{ fontSize: '2.2rem' }}>🚀</span>
              <h4 style={{ margin: '8px 0', color: '#f1f5f9' }}>Sparkle Booster</h4>
              <p style={{ fontWeight: 'bold', color: 'var(--neon-pink)', marginBottom: '10px' }}>800 Dust</p>
              
              {!localProfile.purchases?.includes('jetpack_sparkles') ? (
                <button className="secondary" onClick={() => buyItem('jetpack_sparkles', 800)} style={{ width: '100%' }}>Buy</button>
              ) : localProfile.equipped?.includes('jetpack_sparkles') ? (
                <button className="success" onClick={() => handleUnequipItem('jetpack_sparkles')} style={{ width: '100%' }}>Equipped</button>
              ) : (
                <button className="secondary" onClick={() => handleEquipItem('jetpack_sparkles')} style={{ width: '100%' }}>Equip</button>
              )}
            </div>

          </div>

          {/* Dev Cheat Button */}
          <button 
            className="secondary" 
            onClick={() => { StorageService.addDust(500); loadData(); }} 
            style={{ width: '100%', marginTop: '16px', borderStyle: 'dashed', borderColor: 'var(--neon-pink)', color: 'var(--neon-pink)' }}
          >
            🔧 Dev Cheat: Add +500 Dust
          </button>

        </div>
      )}

      {/* Main Grid Viewport */}
      <div 
        ref={containerRef}
        className="game-main-grid"
        style={{ position: 'relative', overflow: 'visible', minHeight: '400px' }}
      >
        {/* Quest Cards List */}
        <div className="quests-column" style={{ padding: '0 12px 24px 0' }}>
          
          {/* Active Quests Section */}
          <h3 style={{ marginBottom: '16px', color: 'var(--neon-blue)' }}>Active {localProfile.theme} Quests</h3>
          {activeQuests.length === 0 ? (
            <div className="game-panel" style={{ padding: '24px', textAlign: 'center', opacity: 0.8, marginBottom: '24px' }}>
              All active quests complete! Check your status reports below.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              {activeQuests.map(task => {
                const isActive = task.inProgress;
                return (
                  <div 
                    key={task.id} 
                    ref={el => taskRefs.current[task.id] = el}
                    className="game-panel" 
                    style={{ 
                      padding: '20px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      borderLeft: isActive 
                        ? '6px solid var(--neon-pink)' 
                        : '6px solid var(--neon-blue)',
                      boxShadow: isActive ? 'var(--shadow-pink)' : '',
                      transition: 'all 0.4s ease'
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: '16px' }}>
                      {task.isHomework && (
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          background: 'rgba(217, 70, 239, 0.15)', 
                          color: 'var(--neon-pink)', 
                          padding: '4px 10px', 
                          borderRadius: '8px', 
                          fontSize: '0.75rem', 
                          fontWeight: '900',
                          marginBottom: '8px',
                          border: '1px solid rgba(217, 70, 239, 0.3)'
                        }}>
                          <BookOpen size={12} /> Homework
                        </span>
                      )}
                      
                      <p style={{ 
                        fontSize: '1.1rem', 
                        color: '#1e293b',
                        lineHeight: '1.4'
                      }}>
                        {task.questText ? (
                          <span style={{ fontWeight: '800', color: '#0369a1' }}>{task.questText}</span>
                        ) : (
                          task.text
                        )}
                      </p>
                    </div>

                    <div>
                      {!task.inProgress ? (
                        <button 
                          onClick={() => handleStartTask(task)}
                          disabled={generatingFor === task.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          {generatingFor === task.id ? 'Connecting...' : <><Play size={16} /> Start</>}
                        </button>
                      ) : (
                        <button 
                          className="success animate-pulse-glow"
                          onClick={() => handleCompleteTask(task)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <CheckCircle size={16} /> Finish
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending Verification Section */}
          {pendingQuests.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--neon-pink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader size={18} className="animate-spin" /> Waiting for Parent Check
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingQuests.map(task => (
                  <div key={task.id} className="game-panel" style={{ 
                    padding: '16px', 
                    borderLeft: '6px solid var(--neon-pink)',
                    background: 'rgba(217, 70, 239, 0.05)',
                    opacity: 0.8
                  }}>
                    <p style={{ fontSize: '1rem', color: '#1e293b' }}>
                      {task.questText ? (
                        <span style={{ fontWeight: '800' }}>{task.questText}</span>
                      ) : (
                        task.text
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verified/Completed Section */}
          {verifiedQuests.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '16px', color: 'var(--neon-green)' }}>Completed Quests</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {verifiedQuests.map(task => (
                  <div key={task.id} className="game-panel success" style={{ 
                    padding: '16px', 
                    borderLeft: '6px solid var(--neon-green)',
                    background: 'rgba(16, 185, 129, 0.05)',
                    opacity: 0.6
                  }}>
                    <p style={{ fontSize: '1rem', color: '#64748b', textDecoration: 'line-through' }}>
                      {task.questText ? task.questText : task.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Dynamic Flying 3D Companion Frame */}
        <div 
          className="floating-companion-frame"
          style={window.innerWidth > 768 ? {
            top: `${companionPos.top}px`,
            left: `${companionPos.left}px`
          } : {}}
        >
          <Companion3D 
            isSpeaking={isSpeaking} 
            speechText={speechText} 
            purchases={localProfile.purchases || []}
            equippedItems={localProfile.equipped || []}
            isAR={isAR}
            onToggleAR={() => setIsAR(!isAR)}
          />
        </div>

      </div>
      
    </div>
  );
}
