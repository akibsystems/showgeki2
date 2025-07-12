import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateOptions {
  system_prompt: string;
  user_prompt: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
}

export async function generateWithOpenAI({
  system_prompt,
  user_prompt,
  temperature = 0.7,
  max_tokens = 32000,
  response_format,
}: GenerateOptions): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: system_prompt,
        },
        {
          role: 'user',
          content: user_prompt,
        },
      ],
      temperature,
      max_tokens,
      response_format,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate content with OpenAI');
  }
}

export { openai };