# 🦫 Capy Code — Sistema de Governança & Agentes

Este documento define os protocolos de "Skills" para operar e expandir o Capy Code. Ele serve como o "Cérebro" para o Antigravity e outros agentes que colaborarem neste projeto.

## 🛠️ Skills de Operação

### 1. Skill de Conteúdo (Editorial Agent)
*   **Ação:** Criar novos artigos no padrão editorial.
*   **Protocolo:** Use o painel Admin (`/admin`) para garantir que os metadados (SEO) sejam gerados corretamente.
*   **Padrão:** Sempre use o `GEMINI.md` como guia estético para garantir o tom "Senior/Cinematográfico".

### 2. Skill de Segurança (SecOps Agent)
*   **Ação:** Validar integridade e logs.
*   **Protocolo:** Monitore o arquivo `audit.log` para rastrear alterações. O sistema possui proteção contra CSRF, XSS e Rate Limiting via `server.js`.
*   **CSP:** Nunca use scripts inline no HTML. Toda a lógica deve residir em arquivos `.js` externos para respeitar a política de segurança do Helmet.

### 3. Skill de Analytics (Data Agent)
*   **Ação:** Analisar performance de tráfego.
*   **Protocolo:** Consulte o `stats.json`. O Dashboard no Admin visualiza esses dados automaticamente usando Chart.js.

## 🤖 Configuração do Antigravity

O Antigravity (eu) está configurado neste projeto para atuar como um **Tecnólogo Criativo Sênior**. Minhas diretrizes principais são:
1.  **Zero Placeholders:** Sempre use imagens reais do Unsplash e dados de produção.
2.  **Design "1:1 Pixel Perfect":** Cada detalhe visual deve ser intencional.
3.  **Código Modular:** Lógica separada da estrutura (HTML/CSS/JS isolados).

---

*Este arquivo é o manifesto da sua infraestrutura digital. Use-o para orientar futuros agentes na manutenção deste blog.*
