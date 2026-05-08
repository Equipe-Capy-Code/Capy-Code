---
title: React Server Components na prática — o que mudou de verdade
description: Entendendo o modelo mental certo para RSC, quando usar Client Components e como a arquitetura muda sua forma de pensar em estado e dados.
author: Lucas Pereira
date: 2025-03-22
tags:
  - React
  - Next.js
  - Arquitetura
status: published
readTime: 14 min
---

# React Server Components na prática

O ecossistema React passou por sua maior mudança desde os Hooks. Os **React Server Components** (RSC) não são apenas uma feature nova — eles mudam o modelo mental de como você pensa em componentes.

## O problema que RSC resolve

Antes dos RSC, todo componente React rodava no cliente. Isso criava um problema clássico:

```jsx
// ❌ Antes: dados buscados no cliente, após o HTML inicial
function ProductPage({ id }) {
  const [product, setProduct] = useState(null);
  
  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => r.json())
      .then(setProduct);
  }, [id]);

  if (!product) return <Spinner />;
  return <ProductCard product={product} />;
}
```

Problema: o browser baixa o JS, executa, faz um fetch, espera, renderiza. O usuário vê um spinner.

## A solução RSC

```jsx
// ✓ Agora: componente roda no servidor
async function ProductPage({ id }) {
  // Isso roda NO SERVIDOR — pode acessar DB diretamente
  const product = await db.products.findById(id);
  
  return <ProductCard product={product} />;
}
```

O servidor renderiza o HTML completo. O browser recebe a página já com os dados.

## Quando usar Server vs Client Components

| Situação | Usar |
|----------|------|
| Buscar dados | Server Component |
| Acessar banco de dados | Server Component |
| `useState`, `useEffect` | Client Component |
| Event listeners | Client Component |
| Browser APIs | Client Component |
| Componentes pesados (charts) | Server Component |

## O erro mais comum

```jsx
// ❌ Erro: tentar usar hooks em Server Component
async function Counter() {
  const [count, setCount] = useState(0); // ERRO
  return <button onClick={() => setCount(c => c+1)}>{count}</button>;
}

// ✓ Correto: separar em dois componentes
async function CounterPage() {
  const initialCount = await db.getCount(); // server
  return <CounterClient initialCount={initialCount} />;
}

'use client';
function CounterClient({ initialCount }) {
  const [count, setCount] = useState(initialCount); // client
  return <button onClick={() => setCount(c => c+1)}>{count}</button>;
}
```

## Performance real

Em benchmarks com páginas de e-commerce:

- **FCP** (First Contentful Paint): -40%
- **TTI** (Time to Interactive): -35%
- **Bundle size**: -60% (todo código de Server Components não vai pro bundle)

## Conclusão

RSC é uma mudança de paradigma, não uma feature. O modelo mental certo: **"o que PRECISA ser interativo vai pro cliente; o resto fica no servidor."**

---

*Próximo artigo: data fetching patterns com RSC e cache strategies no Next.js 15.*
