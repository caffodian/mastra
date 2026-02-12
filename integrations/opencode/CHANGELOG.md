# @mastra/opencode

## 0.0.2-alpha.0

### Patch Changes

- @mastra/opencode: Add opencode plugin for Observational Memory integration ([#12925](https://github.com/mastra-ai/mastra/pull/12925))

  Added standalone `observe()` API that accepts external messages directly, so integrations can trigger observation without duplicating messages into Mastra's storage.

  **New exports:**
  - `ObserveHooks` — lifecycle callbacks (`onObservationStart`, `onObservationEnd`, `onReflectionStart`, `onReflectionEnd`) for hooking into observation/reflection cycles
  - `OBSERVATION_CONTEXT_PROMPT` — preamble that introduces the observations block
  - `OBSERVATION_CONTEXT_INSTRUCTIONS` — rules for interpreting observations (placed after the `<observations>` block)
  - `OBSERVATION_CONTINUATION_HINT` — behavioral guidance that prevents models from awkwardly acknowledging the memory system
  - `getOrCreateRecord()` — now public, allows eager record initialization before the first observation cycle

  ```ts
  import { ObservationalMemory } from '@mastra/memory/processors';

  const om = new ObservationalMemory({ storage, model: 'google/gemini-2.5-flash' });

  // Eagerly initialize a record
  await om.getOrCreateRecord(threadId);

  // Pass messages directly with lifecycle hooks
  await om.observe({
    threadId,
    messages: myMessages,
    hooks: {
      onObservationStart: () => console.log('Observing...'),
      onObservationEnd: () => console.log('Done!'),
      onReflectionStart: () => console.log('Reflecting...'),
      onReflectionEnd: () => console.log('Reflected!'),
    },
  });
  ```

  **Breaking:** `observe()` now takes an object param instead of positional args. Update calls from `observe(threadId, resourceId)` to `observe({ threadId, resourceId })`.

- Updated dependencies [[`7ef618f`](https://github.com/mastra-ai/mastra/commit/7ef618f3c49c27e2f6b27d7f564c557c0734325b), [`b896b41`](https://github.com/mastra-ai/mastra/commit/b896b41343de7fcc14442fb40fe82d189e65bbe2), [`6415277`](https://github.com/mastra-ai/mastra/commit/6415277a438faa00db2af850ead5dee25f40c428), [`191bc3a`](https://github.com/mastra-ai/mastra/commit/191bc3adfdbe4b262dbc93b7d9c3d6c6a3c8ef92), [`0831bbb`](https://github.com/mastra-ai/mastra/commit/0831bbb5bc750c18e9b22b45f18687c964b70828), [`63f7eda`](https://github.com/mastra-ai/mastra/commit/63f7eda605eb3e0c8c35ee3912ffe7c999c69f69), [`a5b67a3`](https://github.com/mastra-ai/mastra/commit/a5b67a3589a74415feb663a55d1858324a2afde9), [`cb8c38e`](https://github.com/mastra-ai/mastra/commit/cb8c38e6f855ad190383a7112ba95abef072d490), [`eb36bd8`](https://github.com/mastra-ai/mastra/commit/eb36bd8c52fcd6ec9674ac3b7a6412405b5983e1), [`3cbf121`](https://github.com/mastra-ai/mastra/commit/3cbf121f55418141924754a83102aade89835947)]:
  - @mastra/core@1.4.0-alpha.0
  - @mastra/memory@1.3.0-alpha.0
