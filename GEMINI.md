# 🦫 Capy Code — Manifesto Técnico & Protocolo Editorial

Este documento define a arquitetura, governança e padrões estéticos exclusivos da plataforma **Capy Code**. Ele deve ser seguido por qualquer agente ou desenvolvedor que atue neste ecossistema.

## 🏛️ Arquitetura de Sistema

O Capy Code é um motor editorial de alto desempenho baseado em **Node.js + Express** com renderização híbrida:
- **Core:** Servidor Express otimizado com `compression` e `helmet`.
- **Database (File-based):** Artigos em Markdown (.md), metadados em JSON para indexação veloz.
- **Segurança:** CSRF Protection via Origin Validation, Rate Limiting (100 req/15min) e Sanitização XSS.
- **Analytics:** Sistema nativo de tracking de visualizações persistido em `stats.json`.

## 🎨 Design System Cinematográfico (1:1 Pixel Perfect)

Cada interface deve ser tratada como um instrumento digital de alta precisão.
1. **Identidade Visual:** Paleta orgânica/dark (Musgo, Argila, Creme, Carvão).
2. **Tipografia:** Headings: "Inter" (Tracking -0.05em). Drama: "Lora" Italic. Data: "JetBrains Mono".
3. **Navbar "Floating Island":** Pílula fixa `backdrop-blur-xl` que transiciona para estilo sólido ao rolar.
4. **Micro-interações:**
   - Botões com efeito magnético (`scale(1.03)` no hover).
   - Overlay de ruído CSS (0.04 opacity) para eliminar gradientes digitais.
   - Bordas `rounded-[3rem]` em todos os contêineres principais.

## 📡 Protocolo de Distribuição (Newsletter)

O sistema de engajamento é automatizado:
- **Assinatura:** Captura via `/api/subscribe` com validação de formato de e-mail.
- **Automação:** Ao publicar um novo artigo via Admin, o gatilho `notifySubscribers()` é acionado.
- **Entrega:** Integração preparada para `Nodemailer` ou `SendGrid` para envio de templates HTML responsivos.

## 📑 Governança Editorial

1. **SEO:** Injeção dinâmica de JSON-LD Schema (BlogPosting) em cada artigo.
2. **Social:** OpenGraph metadados configurados para preview perfeito no LinkedIn e Twitter.
3. **Audit:** Toda alteração administrativa (criação/edição/deleção) gera um log em `audit.log`.

---

*Documento revisado pelo Tech Lead Antigravity em 02 de Maio de 2026.*
