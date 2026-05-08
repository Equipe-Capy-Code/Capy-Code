---
title: Node.js event loop — por que seu código async não é paralelo
description: Como o event loop funciona de verdade, a diferença entre concorrência e paralelismo, e por que um setTimeout de 0ms não executa imediatamente.
author: Lucas Pereira
date: 2025-02-10
tags:
  - Node.js
  - Runtime
  - Performance
status: published
readTime: 11 min
---

# Node.js event loop — por que seu código async não é paralelo

Uma das maiores confusões entre devs JavaScript: achar que código `async/await` roda em paralelo. Não roda. Node.js é **single-threaded**.

## A pergunta que derruba 80% dos devs

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
console.log('3');
```

Qual a saída? `1, 3, 2` — mesmo com timeout de **0ms**.

Por quê? Event loop.

## Como o event loop funciona

```
   ┌──────────────────────────┐
   │       Call Stack         │
   └──────────────────────────┘
              ↓ (esvazia)
   ┌──────────────────────────┐
   │    Microtask Queue       │  ← Promises, queueMicrotask
   │    (processa tudo)       │
   └──────────────────────────┘
              ↓ (esvazia)
   ┌──────────────────────────┐
   │     Macrotask Queue      │  ← setTimeout, setInterval, I/O
   │    (processa 1 item)     │
   └──────────────────────────┘
              ↓
           repete
```

**Microtasks têm prioridade sobre macrotasks.**

## Exemplo que surpreende

```js
Promise.resolve().then(() => console.log('Promise'));
setTimeout(() => console.log('Timeout'), 0);
queueMicrotask(() => console.log('Microtask'));

// Saída:
// Promise
// Microtask
// Timeout
```

Promises e `queueMicrotask` são microtasks — executam antes de qualquer `setTimeout`, mesmo com delay 0.

## O que bloqueia o event loop

```js
// ❌ Isso BLOQUEIA tudo por 5 segundos
function heavyComputation() {
  const start = Date.now();
  while (Date.now() - start < 5000) {}
  return 'done';
}

app.get('/api', (req, res) => {
  const result = heavyComputation(); // outras requests ficam esperando
  res.json({ result });
});
```

```js
// ✓ Mover para Worker Thread
const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  app.get('/api', (req, res) => {
    const worker = new Worker(__filename);
    worker.on('message', result => res.json({ result }));
  });
} else {
  const result = heavyComputation();
  parentPort.postMessage(result);
}
```

## Concorrência vs Paralelismo

| | Node.js (single thread) | Go / Java (multi-thread) |
|---|---|---|
| Modelo | Concorrência (event loop) | Paralelismo real |
| I/O bound | ✅ Excelente | ✅ Bom |
| CPU bound | ❌ Ruim | ✅ Excelente |
| Memória | Baixa | Alta |

Node.js brilha em I/O: milhares de conexões simultâneas com pouca memória. Para CPU-heavy, use Worker Threads ou delegue para serviços externos.

## Dica prática

```js
// Use setImmediate para "ceder" o loop em operações longas
async function processLargeArray(items) {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    results.push(processItem(items[i]));
    
    // A cada 1000 items, dá chance pro event loop respirar
    if (i % 1000 === 0) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }
  return results;
}
```

---

*Entender o event loop é o que separa quem escreve Node.js de quem entende Node.js.*
