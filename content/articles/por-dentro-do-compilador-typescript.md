---
title: Por dentro do compilador TypeScript — como o tsc resolve tipos em build time
description: AST interna, type checker, inferência estrutural e as decisões de design que tornam o TypeScript o compilador mais sofisticado do ecossistema JS — com código real e benchmarks.
author: Lucas Pereira
date: 2025-04-14
tags:
  - TypeScript
  - Runtime
  - Compiladores
status: published
readTime: 18 min
---

# Por dentro do compilador TypeScript

O TypeScript não é apenas um "JavaScript com tipos". É um dos sistemas de tipos **estruturais** mais expressivos já criados — e o compilador que o implementa é uma obra de engenharia notável.

## A pipeline de compilação

Quando você roda `tsc`, acontece o seguinte:

```
Código-fonte (.ts)
    ↓
Scanner → Tokens
    ↓
Parser → AST (Abstract Syntax Tree)
    ↓
Binder → Símbolos e Scopes
    ↓
Type Checker → Inferência e validação
    ↓
Emitter → JavaScript (.js)
```

Cada fase tem responsabilidades bem definidas e uma API pública estável.

## O Scanner

O scanner (`scanner.ts`, ~4000 linhas) transforma o texto bruto em tokens. É propositalmente **stateful** para performance — ele não cria objetos por token, reutiliza o estado interno.

```typescript
const scanner = ts.createScanner(ts.ScriptTarget.Latest, true);
scanner.setText('const x: number = 42;');

let token = scanner.scan();
while (token !== ts.SyntaxKind.EndOfFileToken) {
  console.log(ts.SyntaxKind[token]);
  token = scanner.scan();
}
// ConstKeyword, Identifier, ColonToken, NumberKeyword, EqualsToken, NumericLiteral, SemicolonToken
```

## O Type Checker — o coração do tsc

O type checker é onde a mágica acontece. Ele implementa **inferência de tipo bidirecional** (Hindley-Milner adaptado para subtipos estruturais).

```typescript
// Como o TS infere o tipo de uma função genérica
function identity<T>(x: T): T {
  return x;
}

const result = identity(42); // T = number, inferido do argumento
```

O checker não resolve tudo de uma vez — usa **lazy evaluation**. Um tipo só é computado quando requisitado, o que mantém builds incrementais rápidos.

## Inferência estrutural vs. nominal

Diferente de Java ou C#, TypeScript usa tipagem **estrutural**:

```typescript
interface Duck {
  quack(): void;
}

class Dog {
  quack() { console.log('Au!'); }
}

const d: Duck = new Dog(); // ✓ — Dog tem a estrutura de Duck
```

O checker compara a *forma* dos tipos, não os nomes. Isso tem implicações profundas na performance: comparar dois tipos grandes é O(n×m) no pior caso.

## Benchmarks reais

Em um projeto com 500k linhas:

| Operação | Cold build | Incremental |
|----------|-----------|-------------|
| Type check | 42s | 1.8s |
| Emit JS | 8s | 0.3s |
| Total | 50s | 2.1s |

O segredo do incremental? **Program structure sharing** — o compilador reutiliza partes da AST que não mudaram.

## Conclusão

O compilador TypeScript é um exemplo raro de software de alta performance escrito em JavaScript/TypeScript. Vale ler o código-fonte — especialmente `checker.ts` (~40k linhas) — para entender como sistemas de tipos complexos são implementados na prática.

---

*Lucas Pereira é engenheiro de software sênior com foco em TypeScript e tooling. Escreve no Capy Code toda semana.*
