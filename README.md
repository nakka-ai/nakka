# Nakka
Multi AI SDK built on top of Langchain, designed for seamless integration into projects with modular workflows and extensions.

## Main Features
- 📚 Unified Model Providers
- 🤖 Multi-Model Streaming Chat Conversations
- 📦 Modular Workflow with Extensions
- 🌐 Backend and Browser Environment Support
- 🛎️ Event-Driven Stream Data

## Packages
- `@nakka/core`: Nakka core functionalities
- `@nakka/kit`: Extension kit
- `@nakka/extension`: Official extensions
- `@nakka/ui`: UI SDK

## Example Usage
1. Install nakka
```bash
bun install @nakka/core
```

2. Create a nakka instance
```typescript
import readline from 'readline'
import {
  NakkaCore,
  OpenaiGpt3dot5TurboModel,
  OpenaiGpt4Model,
} from '@nakka/core'

const nakka = new NakkaCore({
  models: [
    OpenaiGpt3dot5TurboModel,
    OpenaiGpt4Model,
  ],
  env: {
    MODEL_OPENAI_API_KEY: process.env.MODEL_OPENAI_API_KEY || '',
  }
})

const conversation = nakka.chat({
  models: [
    '@openai/gpt4',
    '@openai/gpt3.5-turbo',
    ['@openai/gpt3.5-turbo', { temperature: 0.5 }],
  ], // multiple models 
  prompt: 'Hello, how are you?',
})

const modelOutputs: Record<string, string> = {};
conversation.models.forEach((model, index) => {
  const key = `${index}.${model.metadata.id}`
  modelOutputs[key] = ""
})
const updateCLI = () => {
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
  console.log("nakka Streaming Multiple Models...\n")
  Object.entries(modelOutputs).forEach(([key, output]) => console.log(`[${key}] ${output}`))
}

// Stream output
console.log(`Stream:`);
const stream = conversation.stream();
for await (const chunk of stream) {
  if (chunk.type === 'content' && chunk.content) {
    const key = `${chunk.modelIndex}.${chunk.modelId}`
    modelOutputs[key] = (modelOutputs[key] || '') + chunk.content
    updateCLI()
  }
}
console.log(`\nDone.`)
```
3. Multi Output
![image](./assets/images/preview-1.png)
