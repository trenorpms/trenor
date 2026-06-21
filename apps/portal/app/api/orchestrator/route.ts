import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages, systemInstruction, responseSchema } = await req.json();

    // Keys are server-side only — never prefixed with NEXT_PUBLIC_
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!deepseekKey && !geminiKey) {
      throw new Error('No AI API keys configured. Set DEEPSEEK_API_KEY and/or GEMINI_API_KEY in .env.local');
    }

    // Hybrid System: Check if we are doing file generation/visualization tasks
    const isFileTask = messages.some((m: any) => 
      m.parts?.some((p: any) => p.text?.includes('CSV') || p.text?.includes('floor'))
    );

    if (isFileTask && geminiKey) {
      // Use Gemini for rich structured tasks and large context windows
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiKey}`;
      
      const payload = {
        contents: messages,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return new NextResponse(text, {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Use DeepSeek for fast, empathetic orchestration chat & planning
      if (!deepseekKey) {
        throw new Error('DEEPSEEK_API_KEY not configured');
      }

      const url = 'https://api.deepseek.com/chat/completions';
      
      // Convert Gemini conversation format to OpenAI/DeepSeek format
      const formattedMessages = [];
      
      if (systemInstruction) {
        formattedMessages.push({ role: 'system', content: systemInstruction });
      }

      for (const msg of messages) {
        const role = msg.role === 'model' ? 'assistant' : 'user';
        const content = msg.parts?.map((p: any) => p.text).join('\n') || '';
        formattedMessages.push({ role, content });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: formattedMessages,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DeepSeek API error:', errorText);
        throw new Error(`DeepSeek API returned status ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      return new NextResponse(content, {
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    console.error('Orchestrator route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
