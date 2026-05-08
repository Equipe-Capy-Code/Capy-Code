# 🦫 Capy Code — Blog de Engenharia de Software

Blog técnico em português com painel de edição integrado. Conteúdo em Markdown, sem banco de dados, versionável no Git.

---

## Como rodar

**Pré-requisitos:** Node.js 18+

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
# Crie um arquivo .env na raiz do projeto e adicione a senha de administrador:
# ADMIN_PASSWORD=sua_senha_secreta

# 3. Subir o servidor
npm run dev
```

Pronto. Abra:

| URL                           | O quê            |
| ----------------------------- | ---------------- |
| `http://localhost:3000`       | Blog público     |
| `http://localhost:3000/admin` | Painel de edição |

---

## Como funciona

### Arquitetura

```
Requisição do browser
        ↓
   server.js (Express)
        ↓
   /api/articles  →  lê/escreve arquivos .md em content/articles/
        ↓
   Resposta JSON   →  browser renderiza
```

Sem banco de dados. Cada artigo é um arquivo `.md` na pasta `content/articles/`.

### Estrutura de arquivos

```
Blog/
├── server.js              # Servidor Express + API REST
├── package.json
├── index.html             # Blog público (lê da API)
├── article.html           # Página de artigo individual
│
├── admin/
│   └── index.html         # Painel de edição
│
├── content/
│   └── articles/          # Artigos em Markdown
│       └── meu-artigo.md
│
├── css/
│   └── styles.css
└── js/
    └── main.js
```

---

## Painel de edição (`/admin`)

### Criando um artigo

1. Clique em **+ Novo artigo**
2. Escreva no editor Markdown (esquerda) — o preview aparece ao vivo (direita)
3. Clique na aba **Metadados** para preencher título, descrição, tags
4. Clique **Publicar** ou **Salvar rascunho**

> **Atalho:** `Ctrl+S` salva o artigo atual.

### Status dos artigos

| Status      | Visível no blog? |
| ----------- | ---------------- |
| `draft`     | ❌ Não           |
| `published` | ✅ Sim           |

---

## Formato de um artigo (Markdown + Frontmatter)

Cada artigo é um arquivo `.md` com metadados no topo:

```markdown
---
title: Título do artigo
description: Descrição curta para SEO e cards
author: Seu Nome
date: 2025-04-14
tags:
  - TypeScript
  - React
status: published # draft | published
readTime: 12 min # opcional — calculado automaticamente
---

# Conteúdo do artigo

Escreva em **Markdown** normalmente.

## Seção

Código, listas, tabelas — tudo funciona.
```

O arquivo é criado automaticamente ao salvar pelo painel. O nome do arquivo é gerado a partir do título (slug).

---

## API REST

O servidor expõe uma API que o blog e o admin consomem:

| Método   | Rota                       | Descrição                                    |
| -------- | -------------------------- | -------------------------------------------- |
| `GET`    | `/api/articles`            | Lista artigos publicados                     |
| `GET`    | `/api/articles?status=all` | Lista todos (para o admin)                   |
| `GET`    | `/api/articles/:slug`      | Retorna artigo completo com HTML renderizado |
| `POST`   | `/api/articles`            | Cria novo artigo                             |
| `PUT`    | `/api/articles/:slug`      | Atualiza artigo existente                    |
| `DELETE` | `/api/articles/:slug`      | Deleta artigo                                |

### Exemplo de resposta — `GET /api/articles`

```json
[
  {
    "slug": "por-dentro-do-compilador-typescript",
    "title": "Por dentro do compilador TypeScript",
    "description": "AST interna, type checker...",
    "author": "Lui",
    "date": "2025-04-14",
    "tags": ["TypeScript", "Compiladores"],
    "status": "published",
    "readTime": "18 min"
  }
]
```

### Exemplo de resposta — `GET /api/articles/:slug`

Igual ao anterior, mais os campos:

```json
{
  "content": "# Por dentro do compilador...", // Markdown bruto
  "html": "<h1>Por dentro do...</h1>" // HTML renderizado
}
```

---

## Fluxo completo de um artigo

```
Escrever no admin  →  Salvar  →  Arquivo .md criado em content/articles/
                                            ↓
                              Blog lê via GET /api/articles
                                            ↓
                              Renderiza na index.html
```

---

## Variáveis de ambiente

| Variável | Padrão | Descrição         |
| -------- | ------ | ----------------- |
| `PORT`   | `3000` | Porta do servidor |

```bash
PORT=8080 npm run dev
```

### Segurança e Governança

Para garantir a integridade do blog em produção, implementamos:

1.  **Proteção contra Brute Force**: Limite de 10 tentativas de login a cada 15 minutos.
2.  **Audit Logs**: Registro de todas as ações administrativas (login, criação, edição, delete) no arquivo `audit.log`.
3.  **Sanitização de Output**: Proteção contra XSS usando a biblioteca `xss` na renderização do Markdown.
4.  **Segurança de Cabeçalhos**: Implementação do `helmet` para configurar CSP, X-Frame-Options e outras proteções de browser.
5.  **Controle de Tamanho**: Limite de 1MB para payloads de API e 5MB para uploads de imagem.
6.  **Governança via Git**: O conteúdo é versionado, permitindo auditoria histórica completa via `git log`.

---

## Versionamento com Git

Por usar arquivos `.md`, o conteúdo é versionável normalmente:

```bash
git add content/articles/meu-artigo.md
git commit -m "post: adiciona artigo sobre TypeScript"
```

Todo o histórico de edições fica no Git — sem precisar de backup de banco de dados.

---

## Stack

| Camada       | Tecnologia                           |
| ------------ | ------------------------------------ |
| Servidor     | Node.js + Express                    |
| Conteúdo     | Markdown + Frontmatter (gray-matter) |
| Renderização | marked.js                            |
| Frontend     | HTML + CSS + JS vanilla              |
| Admin        | HTML puro (sem framework)            |

---

## 👥 Nossa Equipe (Equipe-Capy-Code)

Este projeto é desenvolvido e mantido pelo nosso esquadrão:

| Membro | Função / Papel |
| ------ | -------------- |
| **LFPE** | Analista de Sistemas (Owner) |
| **Bruce** | Desenvolvedor Full Stack |
| **Zen 11** | Desenvolvedor Júnior |

