import type { Mulmoscript } from '@/types';

// ================================================================
// Sample Script for Testing
// ================================================================

export const createSampleScript = (title: string = "Sample Video Script"): Mulmoscript => ({
  $mulmocast: {
    version: "1.0"
  },
  title: title,
  lang: "en",
  speechParams: {
    provider: "openai",
    speakers: {
      Presenter: { voiceId: "alloy" },
      Narrator: { voiceId: "onyx" }
    }
  },
  beats: [
    {
      speaker: "Narrator",
      text: "Welcome to our revolutionary new product that will change the way you work.",
      duration: 4.5
    },
    {
      speaker: "Presenter", 
      text: "Hi there! I'm excited to show you what we've built.",
      duration: 3.2
    },
    {
      speaker: "Narrator",
      text: "Demonstrate the key features of the application with smooth transitions.",
      duration: 6.0
    },
    {
      speaker: "Narrator", 
      text: "Our innovative solution combines cutting-edge technology with user-friendly design.",
      duration: 5.5
    },
    {
      speaker: "Presenter",
      text: "Join thousands of satisfied customers who have already transformed their workflow.",
      duration: 4.0
    }
  ]
});

// ================================================================
// Helper Functions
// ================================================================

export const calculateTotalDuration = (beats: any[]): number => {
  return beats.reduce((total, beat) => total + (beat.duration || 0), 0);
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
  }
  return `${remainingSeconds.toFixed(1)}s`;
};

// ================================================================
// Export
// ================================================================

export default createSampleScript;