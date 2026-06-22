let voicesCached = [];

// Pre-fetch voices and set up listener for asynchronous loading in browsers
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  voicesCached = window.speechSynthesis.getVoices();
  if (window.speechSynthesis.addEventListener) {
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      voicesCached = window.speechSynthesis.getVoices();
    });
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      voicesCached = window.speechSynthesis.getVoices();
    };
  }
}

export const AudioService = {
  speak: (text, retryCount = 0) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean text: remove emoji codes, syntax, and handle brackets for natural pausing
    const cleanText = text
      .replace(/🌟/g, '') // remove star emoji
      .replace(/\[/g, '') // remove left bracket
      .replace(/\]/g, ', ') // replace right bracket with a pause
      .replace(/<[^>]*>/g, '') // strip html tags
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Tune pitch and rate for an energetic, cute, child-friendly character vibe
    utterance.pitch = 1.25; 
    utterance.rate = 1.05;
    
    // Use cached voices or query fallback
    let voices = voicesCached.length > 0 ? voicesCached : window.speechSynthesis.getVoices();
    
    if ((!voices || voices.length === 0) && retryCount < 5) {
      // If voices aren't ready yet (common browser delay), retry to get high quality voices
      setTimeout(() => {
        AudioService.speak(text, retryCount + 1);
      }, 150);
      return;
    }
    
    const getVoiceScore = (voice) => {
      const name = voice.name.toLowerCase();
      const lang = voice.lang.toLowerCase();
      
      // Only English voices for task reading in English
      if (!lang.startsWith('en')) return 0;
      
      let score = 1;
      
      // Prioritize high-quality/natural voices
      if (name.includes('natural') || name.includes('neural')) score += 100;
      if (name.includes('google')) score += 50;
      if (name.includes('samantha')) score += 40;
      if (name.includes('hazel')) score += 30;
      if (name.includes('zira')) score += 20;
      if (name.includes('david')) score += 10;
      
      if (voice.localService) score += 5;
      
      return score;
    };
    
    if (voices && voices.length > 0) {
      const sortedVoices = [...voices].sort((a, b) => getVoiceScore(b) - getVoiceScore(a));
      if (getVoiceScore(sortedVoices[0]) > 0) {
        utterance.voice = sortedVoices[0];
      }
    }

    window.speechSynthesis.speak(utterance);
  }
};

