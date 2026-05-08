# Guia de Contribuição - Equipe Capy Code

Bem-vindo ao projeto! Este guia foi feito para ajudar a nossa equipe (especialmente novos membros e o Zen 11) a manter o projeto organizado e padronizado.

## 🛠️ Nosso Fluxo de Trabalho (Git Flow)

Nós **nunca** enviamos código direto para a ramificação `master`. Siga estes passos:

1. **Atualize seu código local:**
   ```bash
   git pull origin master
   ```
2. **Crie uma ramificação (branch) para a sua tarefa:**
   ```bash
   # Se for uma nova funcionalidade:
   git checkout -b feat/nome-da-funcionalidade
   
   # Se for correção de bug:
   git checkout -b fix/nome-do-bug
   ```
3. **Faça as alterações, salve e adicione ao commit:**
   ```bash
   git add .
   git commit -m "feat: adiciona nova pagina de contato"
   ```
   *(Sempre comece os commits com `feat:`, `fix:`, `docs:`, ou `build:`)*
4. **Envie para o GitHub:**
   ```bash
   git push origin sua-branch
   ```
5. **Vá no GitHub e abra um Pull Request (PR)** para a equipe revisar.

## 🎨 Padrão de Código (Linting)

Nós usamos o **ESLint** e o **Prettier** para garantir que o código de todo mundo tenha a mesma "cara".
Antes de fazer um commit, certifique-se de formatar seu código ou confie nas extensões do seu editor (como o VS Code) que fazem isso automaticamente ao salvar.

## 🧪 Testes

Se você criar uma função complexa, escreva um teste automatizado para ela.
Para rodar os testes localmente:
```bash
npm test
```

## 🔒 Segurança

- **Nunca** coloque chaves de API, senhas ou tokens no código.
- Sempre use o arquivo `.env` (use o `.env.example` como base).
