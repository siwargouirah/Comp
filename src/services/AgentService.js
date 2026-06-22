import { StorageService } from './StorageService';

class AIWorkerClient {
  constructor() {
    this.worker = new Worker(new URL('./ai.worker.js', import.meta.url), { type: 'module' });
    this.resolvers = {};
    this.idCounter = 0;
    this.isLoaded = false;
    this.loadPromise = null;

    this.worker.addEventListener('message', (event) => {
      const { type, data, id, error } = event.data;
      if (type === 'progress') {
        // Could dispatch to a global store to show loading bar
        console.log('AI Downloading/Loading:', data);
      } else if (type === 'loaded') {
        this.isLoaded = true;
        if (this.resolvers[id]) {
          this.resolvers[id].resolve(true);
          delete this.resolvers[id];
        }
      } else if (type === 'result') {
        if (this.resolvers[id]) {
          this.resolvers[id].resolve(data);
          delete this.resolvers[id];
        }
      } else if (type === 'error') {
        if (this.resolvers[id]) {
          this.resolvers[id].reject(new Error(error));
          delete this.resolvers[id];
        }
      }
    });
  }

  loadModel() {
    if (this.isLoaded) return Promise.resolve(true);
    if (this.loadPromise) return this.loadPromise;

    const id = this.idCounter++;
    this.loadPromise = new Promise((resolve, reject) => {
      this.resolvers[id] = { resolve, reject };
      this.worker.postMessage({ type: 'load', id });
    });
    return this.loadPromise;
  }

  generateQuest(task, theme) {
    return new Promise((resolve, reject) => {
      const id = this.idCounter++;
      this.resolvers[id] = { resolve, reject };
      this.worker.postMessage({ type: 'generate_quest', payload: { task, theme }, id });
    });
  }

  generateInsight(logs) {
    return new Promise((resolve, reject) => {
      const id = this.idCounter++;
      this.resolvers[id] = { resolve, reject };
      this.worker.postMessage({ type: 'generate_insight', payload: { logs }, id });
    });
  }
}

const aiClient = new AIWorkerClient();


// High-fidelity creative templates for common ADHD tasks by theme to ensure instant magical results
const CREATIVE_TEMPLATES = {
  space: {
    teeth: [
      "Aura detects space dust on your primary shields! Initiate 2-minute orbital teeth scrubbing!",
      "Power up your plasma brush! Clean all docking bays in your mouth before asteroid impact!",
      "Launch tooth-brushing rockets! Protect the Smiles solar system from space plaque!"
    ],
    homework: [
      "Analyze the alien transmissions! Decrypt today's math/homework scrolls for the spaceship computer!",
      "Navigate through the academic asteroid belt! Solve all homework coordinates to hyper-jump!",
      "Calibrate the ships' mainframe! Feed the homework data modules into the cockpit scanner!"
    ],
    room: [
      "Aura alert: Cabin decompression risk! Clear all cargo (toys) off the floor to secure gravity gates!",
      "Scrape space debris from the planetary base! Return all modules to their launchpads (shelves)!",
      "Organize the space-suit bay! Align all clothing thrusters and tidy up the docking zone!"
    ],
    default: [
      "Starfleet command order: Execute the crucial mission to {task} for galaxy peace!",
      "Power up your jetpack and navigate to the sector to {task}! Aura is monitoring!",
      "A mysterious space warp has opened! Resolve it by completing: {task}!"
    ]
  },
  dinosaurs: {
    teeth: [
      "Prehistoric Plaque Alert! Brush your raptor fangs so they stay sharp for hunting!",
      "Scrub the dino-fossils in your mouth before the giant T-Rex smells the jungle snacks!",
      "Clean your triceratops horns (teeth) in the river of foam before the Volcano erupts!"
    ],
    homework: [
      "Decipher the ancient dinosaur footprints! Complete your study scrolls today!",
      "Gather prehistoric ferns! Do your research exercises to earn the title of Dino Master!",
      "Study the migratory patterns of pterodactyls! Complete your homework tasks before dusk!"
    ],
    room: [
      "Clear the jungle path! Gather all scattered dino bones (toys) and stack them in the cave!",
      "Tidy up the nesting grounds! Sweep the prehistoric twigs and leaves away!",
      "Return the baby raptors (clothes/toys) to their matching safety nests!"
    ],
    default: [
      "Jungle Quest: Safely navigate through Dino Valley to {task} before the raptors catch up!",
      "Avoid the stomping Brachiosaurus! Run quickly to {task} and claim your jungle badge!",
      "A wild dinosaur requires help! Earn its trust by finishing: {task}!"
    ]
  },
  minecraft: {
    teeth: [
      "Equip your diamond toothbrush! Mine all yellow copper block-plaque in your dental cave!",
      "Prepare for nightfall! Craft a foam wall in your mouth to keep the Creepers away!",
      "Begin the dental mining quest! Dig through the lower tooth blocks for 2 minutes!"
    ],
    homework: [
      "Read the redstone wiring diagrams! Solve your homework math problems to power the piston!",
      "Decrypt the ancient Enchantment Table scrolls! Study today's homework pages!",
      "Complete the cartography table homework to craft a map of the surrounding biomes!"
    ],
    room: [
      "Inventory full! Deposit all scattered items (toys) into their designated chests!",
      "Clear the spawn area! Tidy up the floor blocks so mobs don't spawn in your room!",
      "Tidy up your crafting table! Organize your armor stands and block stacks!"
    ],
    default: [
      "Quest active: Mine and craft your way to {task} to unlock the nether portal!",
      "Watch out for Creepers! Quick, complete the recipe to {task} and build your base!",
      "A villager has a trade for you! Complete: {task} to get emeralds!"
    ]
  },
  ninja: {
    teeth: [
      "Shuriken dental spin! Polish your ninja blades (teeth) with silent foam strikes!",
      "Defeat the plaque shadow clan! Clean your teeth with swift, precise brush movements!",
      "Sharpen your katana fangs! Scrub each quadrant like a master of the Water Temple!"
    ],
    homework: [
      "Study the secret ninja scrolls! Decrypt the math formulas to master the shadow clone jutsu!",
      "Meditate at the Dojo desk! Focus your mind to complete your homework training scrolls!",
      "Solve the scroll puzzle! Finish your ninja Academy exercises before the master returns!"
    ],
    room: [
      "Shadow sweep! Sweep all scattered gear (toys) silently into their secret storage scrolls!",
      "Dojo cleanup! Clean the training mat (floor) to maintain perfect balance and agility!",
      "Organize your weaponry (clothes/books)! Place everything back in the ninja locker!"
    ],
    default: [
      "Ninja scroll mission: Stealthily move to {task} without making a single sound!",
      "Channel your chakra! Perform the ultimate technique: {task}!",
      "A grandmaster has challenged you! Prove your honor by executing: {task}!"
    ]
  },
  default: {
    teeth: [
      "Time for a sparkling quest! Clean every corner of your mouth for a magical smile!",
      "Dental shield activated! Brush away the plaque monsters with peppermint foam!",
      "Tooth-brushing expedition! Explore your mouth and scrub all dental caves!"
    ],
    homework: [
      "Unlock the knowledge keys! Complete your homework tasks to grow your brain levels!",
      "Exercise your intellectual muscles! Solve today's homework puzzles!",
      "Study scrolls open! Read and complete your exercises to gain high-level wisdom!"
    ],
    room: [
      "Tidy up the kingdom! Place all toys and books back in their home castles!",
      "Clear the magic path! Pick up items from the floor to make room for running!",
      "Organize your inventory! Return clothes to drawers and books to shelves!"
    ],
    default: [
      "Aura Quest: Begin your daily adventure to {task} and earn your bonus points!",
      "Let's do this! Power up your energy and complete: {task}!",
      "Aura is rooting for you! Let's embark on the mission to {task}!"
    ]
  }
};

export const AgentService = {
  
  preloadModel: async () => {
    return aiClient.loadModel();
  },

  /**
   * Generative AI: Transforms a boring task into a thematic quest.
   * Merges high-quality templates and LLM outputs for creative and engaging text.
   */
  generateQuestText: async (taskText, theme = 'Space') => {
    const cleanTheme = theme.trim().toLowerCase();
    const cleanTask = taskText.toLowerCase();
    
    // 1. Identify task category
    let category = 'default';
    if (cleanTask.includes('tooth') || cleanTask.includes('teeth') || cleanTask.includes('brush')) {
      category = 'teeth';
    } else if (cleanTask.includes('homework') || cleanTask.includes('math') || cleanTask.includes('school') || cleanTask.includes('exercise') || cleanTask.includes('read')) {
      category = 'homework';
    } else if (cleanTask.includes('room') || cleanTask.includes('clean') || cleanTask.includes('bed') || cleanTask.includes('pack') || cleanTask.includes('tidy')) {
      category = 'room';
    }

    // 2. Select theme templates
    const themeKey = ['space', 'dinosaurs', 'minecraft', 'ninja'].includes(cleanTheme) ? cleanTheme : 'default';
    const templates = CREATIVE_TEMPLATES[themeKey] || CREATIVE_TEMPLATES.default;
    const categoryTemplates = templates[category] || templates.default;
    
    // Choose a random template
    const randomIndex = Math.floor(Math.random() * categoryTemplates.length);
    let templateText = categoryTemplates[randomIndex].replace('{task}', taskText);

    // 3. Query LLM to do custom creative rewrite (if loaded)
    try {
      await aiClient.loadModel();
      let llmOutput = await aiClient.generateQuest(taskText, theme);
      
      // Clean and format output
      if (llmOutput) {
        llmOutput = llmOutput.replace(/prompt:/i, '').replace(/quest:/i, '').replace(taskText, '').trim();
        // Remove trailing quotes
        llmOutput = llmOutput.replace(/^["']|["']$/g, '');
        
        if (llmOutput.length > 10 && llmOutput.split(' ').length > 3) {
          // If the output is reasonable, return it!
          return `[${taskText}] 🌟 ${llmOutput}`;
        }
      }
    } catch (e) {
      console.warn("LLM not ready or failed. Using template:", e);
    }
    
    // Fallback/augmented template output
    return `[${taskText}] 🌟 ${templateText}`;
  },

  /**
   * Agentic AI: Analyzes local JSON logs to generate caregiver insights via LLM.
   */
  generateInsights: async () => {
    const logs = StorageService.getLogs();
    const tasks = StorageService.getTasks();
    
    if (logs.length < 2) {
      return [
        "Aura Insight: Setup complete! Encourage Leo to complete his first daily quest to start analysis.",
        "ADHD Tip: Tying tasks to immediate rewards (like Aura Dust for the Shop) helps children maintain dopamine levels and focus."
      ];
    }
    
    const completions = logs.filter(l => l.action === 'complete' && l.duration);
    if (completions.length === 0) {
      return [
        "Aura Insight: Leo has started some quests! Try reading tasks out loud with Aura to keep him motivated."
      ];
    }

    // Format logs for LLM
    const recentLogs = completions.slice(-5).map(log => {
      const t = tasks.find(x => x.id === log.taskId);
      return { task: t ? t.text : 'Routine Task', minutes: Math.floor(log.duration / 60000) || 1 };
    });

    try {
      await aiClient.loadModel();
      const output = await aiClient.generateInsight(recentLogs);
      if (output && output.length > 5) {
        return [
          `Aura Behavior Analysis: ${output.replace(/advice:/i, '').trim()}`,
          `ADHD Strategy: Leo does great when quests are gamified. Keep using the custom themes!`
        ];
      }
    } catch (e) {
      console.warn("LLM insights fallback:", e);
    }

    // High quality rule-based insights if LLM is not ready
    const averageDuration = completions.reduce((acc, curr) => acc + (curr.duration || 0), 0) / completions.length;
    const avgMinutes = Math.floor(averageDuration / 60000) || 2;
    
    return [
      `Aura Behavior Analysis: Leo completes his routine quests in about ${avgMinutes} minutes on average. He shows high focus under the ${StorageService.getProfile().theme} theme!`,
      "ADHD Strategy: Try breaking down longer homework exercises into 3 smaller quests to prevent mental fatigue."
    ];
  }
};
