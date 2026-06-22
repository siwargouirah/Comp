import { pipeline, env } from '@xenova/transformers';

// Skip local model checks since we are pulling from Hugging Face directly
env.allowLocalModels = false;
env.useBrowserCache = true;

class AIPipeline {
  // SmolLM2 is a causal language model
  static task = 'text-generation';

  static model = 'HuggingFaceTB/SmolLM2-360M-Instruct';

  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = await pipeline(
        this.task,
        this.model,
        { progress_callback }
      );
    }
    return this.instance;
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { type, payload, id } = event.data;

  if (type === 'load') {
    try {
      await AIPipeline.getInstance(x => {
        self.postMessage({
          type: 'progress',
          data: x
        });
      });

      self.postMessage({
        type: 'loaded',
        id
      });
    } catch (e) {
      self.postMessage({
        type: 'error',
        error: e.message,
        id
      });
    }
  }

  if (type === 'generate_quest') {
    try {
      const generator = await AIPipeline.getInstance();

      const prompt = `
You are a creative storyteller for children with ADHD.

Transform the task into a short exciting quest.

Rules:
- Maximum 2 sentences.
- The child is the hero.
- Use the theme naturally.
- Make the task feel like an adventure.
- Positive and motivating tone.
- Do not explain.
- Do not use bullet points.
- Language: Write strictly in simple, clear, child-friendly English. Avoid French words, complex terms, or complicated sentences.

Theme: ${payload.theme}
Task: ${payload.task}

Quest:
`;

      const out = await generator(prompt, {
        max_new_tokens: 80,
        temperature: 0.2, // Lowered temperature to prevent multilingual drifting and keep text simple
        top_p: 0.90,
        repetition_penalty: 1.15,
        do_sample: true
      });

      const result = out[0].generated_text
        .replace(prompt, '')
        .trim();

      self.postMessage({
        type: 'result',
        data: result,
        id
      });

    } catch (e) {
      self.postMessage({
        type: 'error',
        error: e.message,
        id
      });
    }
  }

  if (type === 'generate_insight') {
    try {
      const generator = await AIPipeline.getInstance();

      const prompt = `
You are an ADHD coach.

Analyze the following task completion logs and provide one short,
clear, practical recommendation for the parent.

Logs:
${JSON.stringify(payload.logs)}

Advice:
`;

      const out = await generator(prompt, {
        max_new_tokens: 40,
        temperature: 0.5,
        top_p: 0.9,
        repetition_penalty: 1.1,
        do_sample: true
      });

      const result = out[0].generated_text
        .replace(prompt, '')
        .trim();

      self.postMessage({
        type: 'result',
        data: result,
        id
      });

    } catch (e) {
      self.postMessage({
        type: 'error',
        error: e.message,
        id
      });
    }
  }
});