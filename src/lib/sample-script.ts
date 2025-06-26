import type { Mulmoscript } from '@/types';

// ================================================================
// Sample Script for Testing
// ================================================================

export const createSampleScript = (title: string = "Sample Video Script"): Mulmoscript => ({
  $mulmocast: {
    version: "1.0",
  },
  title: title,
  lang: "en",
  speechParams: {
    provider: "openai",
    speakers: {
      "Presenter": {
        voiceId: "alloy"
      },
      "Narrator": {
        voiceId: "nova"
      }
    }
  },
  canvasSize: {
    width: 1280,
    height: 720
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
// Script Templates
// ================================================================

export const scriptTemplates = {
  product_demo: {
    title: "Product Demo Video",
    description: "A template for product demonstration videos",
    script: createSampleScript("Product Demo Video")
  }
};

// ================================================================
// Helper Functions
// ================================================================

export const validateScript = (script: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!script.$mulmocast || !script.$mulmocast.version) errors.push("Script version is required");
  if (!script.speechParams) errors.push("Speech parameters are required");
  if (!script.beats || !Array.isArray(script.beats)) {
    errors.push("Script must have beats array");
  } else {
    if (script.beats.length === 0) {
      errors.push("Script must have at least one beat");
    }
    
    script.beats.forEach((beat: any, index: number) => {
      if (!beat.speaker) errors.push(`Beat ${index + 1}: Speaker is required`);
      if (!beat.text) errors.push(`Beat ${index + 1}: Text is required`);
      if (beat.duration && beat.duration <= 0) {
        errors.push(`Beat ${index + 1}: Duration must be greater than 0`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
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