import type { Mulmoscript } from '@/types';

// ================================================================
// Sample Script for Testing
// ================================================================

export const createSampleScript = (title: string = "Sample Video Script"): Mulmoscript => ({
  version: "1.0",
  title: title,
  scenes: [
    {
      id: "scene_1",
      type: "narration",
      content: "Welcome to our revolutionary new product that will change the way you work.",
      duration: 4.5
    },
    {
      id: "scene_2", 
      type: "dialogue",
      content: "Hi there! I'm excited to show you what we've built.",
      duration: 3.2,
      voice: {
        character: "presenter",
        emotion: "excited"
      }
    },
    {
      id: "scene_3",
      type: "action",
      content: "Demonstrate the key features of the application with smooth transitions.",
      duration: 6.0
    },
    {
      id: "scene_4",
      type: "narration", 
      content: "Our innovative solution combines cutting-edge technology with user-friendly design.",
      duration: 5.5
    },
    {
      id: "scene_5",
      type: "dialogue",
      content: "Join thousands of satisfied customers who have already transformed their workflow.",
      duration: 4.0,
      voice: {
        character: "narrator",
        emotion: "confident"
      }
    }
  ],
  metadata: {
    duration_total: 23.2,
    resolution: "1920x1080",
    fps: 30
  }
});

// ================================================================
// Script Templates
// ================================================================

export const scriptTemplates = {
  product_demo: {
    title: "Product Demo Video",
    description: "A template for product demonstration videos",
    script: createSampleScript("Product Demo Video")
  },
  
  tutorial: {
    title: "Tutorial Video", 
    description: "A template for educational tutorial videos",
    script: {
      version: "1.0",
      title: "Tutorial Video",
      scenes: [
        {
          id: "scene_1",
          type: "narration",
          content: "In this tutorial, we'll learn how to use the key features step by step.",
          duration: 4.0
        },
        {
          id: "scene_2",
          type: "action", 
          content: "Show the main interface and highlight important elements.",
          duration: 5.0
        },
        {
          id: "scene_3",
          type: "dialogue",
          content: "Let's start with the basics. First, we'll open the application.",
          duration: 3.5,
          voice: {
            character: "instructor",
            emotion: "calm"
          }
        }
      ],
      metadata: {
        duration_total: 12.5,
        resolution: "1920x1080", 
        fps: 30
      }
    } as Mulmoscript
  },

  testimonial: {
    title: "Customer Testimonial",
    description: "A template for customer testimonial videos", 
    script: {
      version: "1.0",
      title: "Customer Testimonial",
      scenes: [
        {
          id: "scene_1",
          type: "dialogue",
          content: "I've been using this product for six months and it's completely transformed my business.",
          duration: 5.0,
          voice: {
            character: "customer",
            emotion: "satisfied"
          }
        },
        {
          id: "scene_2",
          type: "narration",
          content: "Sarah from TechCorp shares her experience with our solution.",
          duration: 3.0
        },
        {
          id: "scene_3", 
          type: "dialogue",
          content: "The support team is amazing and the results speak for themselves.",
          duration: 4.0,
          voice: {
            character: "customer",
            emotion: "happy"
          }
        }
      ],
      metadata: {
        duration_total: 12.0,
        resolution: "1920x1080",
        fps: 30
      }
    } as Mulmoscript
  }
};

// ================================================================
// Helper Functions
// ================================================================

export const validateScript = (script: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!script.version) errors.push("Script version is required");
  if (!script.title) errors.push("Script title is required");
  if (!script.scenes || !Array.isArray(script.scenes)) {
    errors.push("Script must have scenes array");
  } else {
    if (script.scenes.length === 0) {
      errors.push("Script must have at least one scene");
    }
    
    script.scenes.forEach((scene: any, index: number) => {
      if (!scene.id) errors.push(`Scene ${index + 1}: ID is required`);
      if (!scene.type) errors.push(`Scene ${index + 1}: Type is required`);
      if (!scene.content) errors.push(`Scene ${index + 1}: Content is required`);
      if (!scene.duration || scene.duration <= 0) {
        errors.push(`Scene ${index + 1}: Duration must be greater than 0`);
      }
    });
  }

  if (!script.metadata) {
    errors.push("Script metadata is required");
  } else {
    if (!script.metadata.duration_total) {
      errors.push("Metadata: Total duration is required");
    }
    if (!script.metadata.resolution) {
      errors.push("Metadata: Resolution is required");
    }
    if (!script.metadata.fps || script.metadata.fps <= 0) {
      errors.push("Metadata: FPS must be greater than 0");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const calculateTotalDuration = (scenes: any[]): number => {
  return scenes.reduce((total, scene) => total + (scene.duration || 0), 0);
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