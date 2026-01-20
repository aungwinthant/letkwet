
# Gemini API Coding Guidelines

## Initialization
- Always use `const ai = new GoogleGenAI({apiKey: process.env.API_KEY});`.

## Model Selection
- Basic Text: `gemini-3-flash-preview`
- Complex/Reasoning: `gemini-3-pro-preview`
- Image Gen: `gemini-2.5-flash-image`
- High-Quality Image Gen: `gemini-3-pro-image-preview` (Requires tool: googleSearch)

## Key Rules
- API Key must come from `process.env.API_KEY`.
- Use `response.text` (property, not method).
- For JSON, use `responseMimeType: "application/json"` and `responseSchema`.
- For Search Grounding, use `tools: [{googleSearch: {}}]` and extract `groundingChunks`.
- Thinking Budget: Reserved for Gemini 3 and 2.5 series. Set `thinkingBudget` within `thinkingConfig`.

## Examples

### Generate Content
```ts
const response = await ai.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: 'prompt',
});
const text = response.text;
```

### JSON Response
```ts
const response = await ai.models.generateContent({
   model: "gemini-3-flash-preview",
   config: {
     responseMimeType: "application/json",
     responseSchema: { ... },
   },
});
```
