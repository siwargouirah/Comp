import { supabase } from './supabaseClient';

const TASKS_KEY = 'aura_tasks';
const LOGS_KEY = 'aura_logs';
const PROFILE_KEY = 'aura_profile';
const HOMEWORK_KEY = 'aura_homework';
const FEEDBACK_KEY = 'aura_teacher_feedback';

// Static Configuration for Brevo SMS & n8n webhook integration
// Modified to local n8n URL by default, easily editable when deploying to production hosting
const N8N_CONFIG = {
  webhookUrl: 'https://n8n-production-74f50.up.railway.app/webhook/aura-trigger',
  brevoApiKey: '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',
  senderId: 'AURA',
  phoneNumber: '+21650402494',
  enabled: true
};

export const StorageService = {
  // --- Profile & Customizations (Local-only rewards system) ---
  getProfile: () => {
    const profile = localStorage.getItem(PROFILE_KEY);
    const defaultProfile = { theme: 'Space', dust: 0, level: 1, purchases: [], equipped: [] };
    return profile ? { ...defaultProfile, ...JSON.parse(profile) } : defaultProfile;
  },

  updateProfile: (updates) => {
    const profile = { ...StorageService.getProfile(), ...updates };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return profile;
  },

  purchaseItem: (itemId, cost) => {
    const profile = StorageService.getProfile();
    if (!profile.purchases) profile.purchases = [];
    if (!profile.equipped) profile.equipped = [];
    if (profile.dust >= cost && !profile.purchases.includes(itemId)) {
      profile.dust -= cost;
      profile.purchases.push(itemId);
      profile.equipped.push(itemId); // Auto-equip on purchase
      StorageService.updateProfile(profile);
      return true;
    }
    return false;
  },

  equipItem: (itemId) => {
    const profile = StorageService.getProfile();
    if (!profile.equipped) profile.equipped = [];
    if (profile.purchases.includes(itemId) && !profile.equipped.includes(itemId)) {
      profile.equipped.push(itemId);
      StorageService.updateProfile(profile);
      return true;
    }
    return false;
  },

  unequipItem: (itemId) => {
    const profile = StorageService.getProfile();
    if (!profile.equipped) profile.equipped = [];
    profile.equipped = profile.equipped.filter(id => id !== itemId);
    StorageService.updateProfile(profile);
    return true;
  },

  addDust: (amount) => {
    const profile = StorageService.getProfile();
    profile.dust += amount;
    StorageService.updateProfile(profile);
    return profile.dust;
  },

  // --- Task & Logs (Supabase Synced) ---
  getTasks: async (childId) => {
    if (!childId) return [];
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching tasks:", error);
      return [];
    }

    // Filter out config and feedback rows, map DB schema (snake_case) to client camelCase
    return data
      .filter(t => !t.text.startsWith('⚙️ N8N_CONFIG:') && !t.text.startsWith('💬 FEEDBACK:'))
      .map(t => ({
        id: t.id,
        childId: t.child_id,
        text: t.text,
        completed: t.completed,
        completedByChild: t.completed_by_child,
        isHomework: t.is_homework,
        teacherId: t.teacher_id,
        createdAt: t.created_at
      }));
  },

  addTask: async (taskText, childId, isHomework = false, teacherId = null) => {
    if (!childId) throw new Error("Child ID is required to add tasks.");
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        child_id: childId,
        text: taskText,
        completed: false,
        completed_by_child: false,
        is_homework: isHomework,
        teacher_id: teacherId
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      childId: data.child_id,
      text: data.text,
      completed: data.completed,
      completedByChild: data.completed_by_child,
      isHomework: data.is_homework,
      teacherId: data.teacher_id,
      createdAt: data.created_at
    };
  },

  deleteTask: async (id) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  logTaskStart: (taskId) => {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    logs.push({ taskId, action: 'start', time: Date.now() });
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  },

  logTaskComplete: async (taskId, n8nConfig = null, childName = 'Leo') => {
    // 1. Update status in Supabase
    const { data: task, error: updateError } = await supabase
      .from('tasks')
      .update({ completed_by_child: true })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Log Locally for Analytics
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
    const startLog = [...logs].reverse().find(l => l.taskId === taskId && l.action === 'start');
    
    let duration = null;
    if (startLog) {
      duration = Date.now() - startLog.time;
    }
    logs.push({ taskId, action: 'complete', time: Date.now(), duration });
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));

    // 3. Award Dust locally
    const profile = StorageService.getProfile();
    StorageService.updateProfile({ dust: profile.dust + 100 });

    // 4. Trigger Webhook automatically if ALL child's quests are done
    const { data: siblingTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('child_id', task.child_id);

    if (!fetchError && siblingTasks) {
      // Filter out config and feedback rows
      const activeQuests = siblingTasks.filter(t => !t.text.startsWith('⚙️ N8N_CONFIG:') && !t.text.startsWith('💬 FEEDBACK:'));
      const allCompletedByChild = activeQuests.length > 0 && activeQuests.every(t => t.completed_by_child || t.completed);

      if (allCompletedByChild) {
        const config = n8nConfig || N8N_CONFIG;
        if (config.enabled && config.webhookUrl) {
          fetch(config.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'all_tasks_completed',
              childName: childName,
              totalTasks: activeQuests.length,
              timestamp: new Date().toLocaleString(),
              brevoApiKey: config.brevoApiKey || '',
              recipient: config.phoneNumber || '',
              sender: config.senderId || 'AURA'
            })
          }).catch(err => console.warn("n8n all complete webhook failed:", err));
        }
      }
    }

    return task;
  },

  approveTask: async (taskId, n8nConfig = null) => {
    // 1. Update status in Supabase
    const { data: task, error: updateError } = await supabase
      .from('tasks')
      .update({ completed: true })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Trigger webhook automatically
    const config = n8nConfig || N8N_CONFIG;
    if (config.enabled && config.webhookUrl) {
      fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'quest_approved',
          taskText: task.text,
          originalText: task.text,
          isHomework: !!task.is_homework,
          profile: StorageService.getProfile(),
          timestamp: new Date().toLocaleString(),
          brevoApiKey: config.brevoApiKey || '',
          recipient: config.phoneNumber || '',
          sender: config.senderId || 'AURA'
        })
      }).catch(err => console.warn("n8n webhook fire failed:", err));
    }
    return task;
  },

  rejectTask: async (taskId) => {
    // Deduct 100 dust locally
    const profile = StorageService.getProfile();
    StorageService.updateProfile({ dust: Math.max(0, profile.dust - 100) });

    // Reset status in Supabase
    const { data: task, error: updateError } = await supabase
      .from('tasks')
      .update({ completed: false, completed_by_child: false })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Clean up local logs
    const logs = StorageService.getLogs();
    const cleanLogs = [];
    let removed = false;
    for (let i = logs.length - 1; i >= 0; i--) {
      const log = logs[i];
      if (log.taskId === taskId && log.action === 'complete' && !removed) {
        removed = true; // skip this one
      } else {
        cleanLogs.unshift(log);
      }
    }
    localStorage.setItem(LOGS_KEY, JSON.stringify(cleanLogs));
    return task;
  },

  getLogs: () => {
    return JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
  },

  // --- N8N Multi-device Config Sync (Legacy fallback, now returns N8N_CONFIG constant) ---
  getN8NConfig: async () => {
    return N8N_CONFIG;
  },

  saveN8NConfig: async () => {
    // No-op since configuration is hardcoded in the code as requested
  },

  // --- Teacher Portal Integrations (Supabase Sync) ---
  getHomework: async (teacherProfileId) => {
    if (!teacherProfileId) return [];

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('teacher_id', teacherProfileId)
      .eq('is_homework', true);

    if (error) {
      console.error("Error fetching homework:", error);
      return [];
    }

    // Get unique homework texts (since homework is assigned to all children individually)
    const uniqueHomework = [];
    const seenTexts = new Set();
    
    data.forEach(item => {
      // Remove prefix "🎒 Homework: " for teacher display if present
      let displayName = item.text;
      if (displayName.startsWith("🎒 Homework: ")) {
        displayName = displayName.substring("🎒 Homework: ".length);
      }

      if (!seenTexts.has(displayName)) {
        seenTexts.add(displayName);
        uniqueHomework.push({
          id: item.id,
          text: displayName,
          date: new Date(item.created_at).toLocaleDateString(),
          completed: item.completed
        });
      }
    });

    return uniqueHomework;
  },

  addHomework: async (text, teacherProfileId, childIds) => {
    if (!teacherProfileId || !childIds || childIds.length === 0) return;

    const homeworkTasks = childIds.map(childId => ({
      child_id: childId,
      teacher_id: teacherProfileId,
      text: `🎒 Homework: ${text}`,
      completed: false,
      completed_by_child: false,
      is_homework: true
    }));

    const { error } = await supabase
      .from('tasks')
      .insert(homeworkTasks);

    if (error) throw error;
  },

  deleteHomework: async (text, teacherProfileId) => {
    if (!teacherProfileId) return;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('teacher_id', teacherProfileId)
      .eq('text', `🎒 Homework: ${text}`);

    if (error) throw error;
  },

  // --- Teacher Daily Behavior Feedback (Supabase Sync) ---
  getTeacherFeedback: async (childId) => {
    const fallbackText = "No feedback submitted yet for today.";
    if (!childId) return fallbackText;

    const { data, error } = await supabase
      .from('tasks')
      .select('text')
      .eq('child_id', childId)
      .like('text', '💬 FEEDBACK:%')
      .maybeSingle();

    if (error || !data) return fallbackText;

    return data.text.substring('💬 FEEDBACK:'.length);
  },

  saveTeacherFeedback: async (text, childId, teacherProfileId) => {
    if (!childId || !teacherProfileId) return;

    const feedbackText = `💬 FEEDBACK:${text}`;

    // Check if feedback row already exists for this child
    const { data, error } = await supabase
      .from('tasks')
      .select('id')
      .eq('child_id', childId)
      .like('text', '💬 FEEDBACK:%')
      .maybeSingle();

    if (error) {
      console.error("Error checking feedback row:", error);
      return;
    }

    if (data) {
      // Update existing feedback row
      await supabase
        .from('tasks')
        .update({ text: feedbackText, teacher_id: teacherProfileId })
        .eq('id', data.id);
    } else {
      // Insert new feedback row
      await supabase
        .from('tasks')
        .insert({
          child_id: childId,
          teacher_id: teacherProfileId,
          text: feedbackText,
          completed: true,
          completed_by_child: true,
          is_homework: false
        });
    }
  }
};
