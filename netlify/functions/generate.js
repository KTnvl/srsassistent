exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  const { topic } = body;
  if (!topic) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Topic is required' }) };
  }

  const prompt = `You are a study coach using the Smart Revision System. Create study materials for "${topic}".

The system is based on:
1. Plan Your Reviews — review before you forget, not after
2. Test Yourself First — don't reread, retrieve (close notes, write from memory)
3. Turn Notes Into Questions — if you can answer it, you know it
4. Learn From Mistakes — mistakes show you what to study next
5. Before the Exam — prepare calmly, perform confidently
Weekly rhythm: Mon=new material, Tue=test yourself, Wed=notes to questions, Thu=mistakes, Fri=weak points, Sat=spaced review, Sun=rest

Return ONLY valid JSON, no markdown:
{
  "flashcards": [
    {"q":"retrieval-style question about ${topic}","a":"clear answer"},
    {"q":"...","a":"..."},
    {"q":"...","a":"..."},
    {"q":"...","a":"..."},
    {"q":"...","a":"..."}
  ],
  "quiz": [
    {"q":"question","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0},
    {"q":"question","options":["A) ...","B) ...","C) ...","D) ..."],"correct":2},
    {"q":"question","options":["A) ...","B) ...","C) ...","D) ..."],"correct":1},
    {"q":"question","options":["A) ...","B) ...","C) ...","D) ..."],"correct":3},
    {"q":"question","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0}
  ],
  "plan": [
    {"title":"Introduction & First Study","tasks":"specific task for day 1 about ${topic}"},
    {"title":"Test Yourself First","tasks":"specific retrieval task for ${topic}"},
    {"title":"Turn Notes Into Questions","tasks":"specific question-creation task for ${topic}"},
    {"title":"Learn From Mistakes","tasks":"specific error-analysis task for ${topic}"},
    {"title":"Review Weak Points","tasks":"specific targeted review for ${topic}"},
    {"title":"Spaced Repetition Review","tasks":"specific spaced review task for ${topic}"},
    {"title":"Final Review & Rest","tasks":"light final review of ${topic} + exam checklist"}
  ]
}
The correct field is the 0-based index of the correct option. All content must be specific to "${topic}".`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: 500, body: JSON.stringify({ error: 'API error', detail: err }) };
    }

    const data = await response.json();
    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed)
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
