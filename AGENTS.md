# Contrato de engenharia — Libras Arcade

## Escopo e ordem de leitura

Aplicação educacional estática de datilologia, com Treino, Soletrar e Forca. A implementação atual usa JavaScript ES modules, MediaPipe, Canvas e armazenamento local. Python e TypeScript são propostas futuras.

Instruções de sistema, desenvolvedor, plataforma, segurança, permissões e solicitação atual do usuário têm prioridade sobre este arquivo e sobre skills. Use `using-superpowers` no início da tarefa, quando disponível, e carregue apenas as demais skills pertinentes.

Leia [README.md](README.md), [specs/README.md](specs/README.md), a capacidade relacionada, [specs/system.md](specs/system.md), [specs/testing.md](specs/testing.md) e [docs/ROADMAP.md](docs/ROADMAP.md). Consulte [docs/state.md](docs/state.md) para o andamento local. Código e evidência executada determinam o implementado; planos não comprovam entrega.

## Git e trabalho local

Antes de qualquer edição, execute na raiz correta:

```powershell
git status --short --branch
git branch --show-current
git rev-parse --show-toplevel
git remote -v
```

- A branch autorizada para esta entrega é `teste-ariel-versao-python`, no repositório `Darkzin41/Libras_arcade`.
- Não trabalhar em `main`/`master`, não criar branch substituta nem trocar o diretório de trabalho por uma cópia aninhada.
- Preservar arquivos locais preexistentes. A pasta não rastreada `Libras_arcade/` estava presente no início da FASE 00; não adicionar, limpar ou integrar seu conteúdo por inferência.
- Não fazer commit, push, PR, merge ou descarte de alterações sem autorização explícita. Não executar `reset --hard` ou limpezas destrutivas.
- Em worktree temporário de Orca, preservar isolamento e informar diferenças para futura integração na branch indicada; não integrar automaticamente.

## Responsabilidades dos módulos

| Arquivo | Responsabilidade atual |
| --- | --- |
| `js/app.js` | Boot, composição dos objetos, Canvas e entrega do cursor. |
| `js/vision.js` | Modelo, stream, loop de detecção, índices e conexões de landmarks. |
| `js/libras.js` | Features, regras estáticas, trajetórias J/Z, hold e gesto de voltar. |
| `js/data.js` | Letras, dificuldades, palavras e dicas compartilhadas. |
| `js/game.js` | Estado, pontuação, sequência e cronômetro de Treino/Soletrar. |
| `js/forca.js` | Palpites, erros, palavras e progressão da Forca. |
| `js/ui.js` | Eventos, navegação e renderização do DOM. |
| `index.html`, `css/style.css` | Estrutura visual e tema HUD. |

Há acoplamentos legados descritos em `specs/system.md`. Sua presença não autoriza refatoração fora da fase aprovada.

## Convenções de código e organização

- Manter módulos ES e imports relativos com extensão `.js`; não inserir bundler, framework ou dependência sem necessidade justificada e escopo aprovado.
- Seguir a formatação local: dois espaços, ponto e vírgula, `const` quando não houver reatribuição e `let` quando necessário. Evitar reformatar arquivos inteiros.
- Usar `camelCase` para funções/variáveis, `PascalCase` para classes e `UPPER_SNAKE_CASE` para constantes. Prefixo `_` é convenção de método interno, não isolamento da linguagem.
- Preservar nomes de eventos, campos de `detail`, IDs HTML, classes CSS, chaves de armazenamento e modos `practice`, `word`, `forca`, salvo mudança contratual aprovada.
- Texto de interface, comentários e documentação em português brasileiro. Usar JSDoc em APIs relevantes e explicar intenção, unidades, limiares e recursos; não narrar cada linha.
- Não apresentar escores como probabilidade, cobertura como precisão ou otimizações como ganhos medidos sem evidência.
- Se a migração TypeScript for autorizada, tipar landmarks, resultados, estados, eventos e configurações; evitar `any`, migrar incrementalmente e manter distribuição estática. Não adicionar TypeScript na FASE 00.
- Futuro Python deverá ter docstrings em PT-BR e ficar separado do runtime web, com contrato e autorização explícitos.

## Recursos, eventos e dados

Para alterações funcionais futuras, explicitar quem cria e quem libera streams, tracks, modelo, rAF, intervalos, timeouts, listeners e buffers. Início, pausa, retomada e descarte devem evitar duplicidade e atualização de sessões antigas. Não afirmar que o legado já atende a essa política.

Preservar processamento local da câmera. Não gravar/transmitir imagens ou landmarks automaticamente. Mudanças na coleta ou persistência exigem escopo explícito, consentimento e documentação. Tratar falhas de permissões, vídeo, import/modelo/GPU e armazenamento conforme a fase autorizada.

Documentar limites de buffers e considerar custo de alocação antes de otimizar. A FASE 01 mede FPS por janela de 1 s e tempos nas últimas 120 amostras via `getPerformanceMetrics()`. Não confundir frequência, duração de trabalho, callbacks ignorados e frames perdidos. Comparar a mesma entrada e registrar ambiente/variação; heap JS não é RAM total. Avaliar viabilidade e custos antes de propor Workers ou mudar cadência; preservar timestamps e regressões de J/Z.

## Reconhecimento e conteúdo pedagógico

- Separar detecção de mão, classificação de letra e lógica de jogo. Preservar o contrato `signconfirmed` e seus consumidores nas mudanças autorizadas.
- Conferir `SUPPORTED_LETTERS`, `LETTERS`, `LETTER_POOL`, `WORDS` e `WORD_HINTS` em conjunto; cada palavra deve ter caracteres reconhecíveis nominalmente e uma dica.
- Tratar J/Z como trajetórias experimentais e as demais regras como aproximações estáticas do código, sem inferir validade linguística.
- Não alterar sinais, dicas ou classificações pedagógicas sem validação de especialistas. Não prometer precisão sem amostras consentidas, protocolo e avaliação por letra.
- `numHands: 1` e `splitHandsByRole()` atualmente não fornecem mão esquerda; não habilitar `REQUIRE_LEFT_HAND` isoladamente.
- Regras estáticas, movimento e navegação podem competir; qualquer correção deve avaliar os três jogos e sinais semelhantes.

## Acessibilidade

Preservar alternativas explícitas de navegação por mouse/toque/teclado, feedback textual e identidade visual. Em melhorias autorizadas, verificar ativação por teclado, foco e retorno de foco, semântica dos controles, mensagens de erro, contraste, zoom, telas pequenas e redução de movimento. Não declarar conformidade antes de avaliação. As lacunas existentes estão no roadmap; mouse/toque ainda não substituem a sinalização das respostas.

## Verificações disponíveis

Não há `package.json`, build, lint, typecheck ou CI versionados. A FASE 01 adiciona testes focados com Node e scripts de benchmark opcionais que requerem Playwright no ambiente. Não inventar comandos `npm run ...` nem instalar dependências automaticamente.

```powershell
node --experimental-vm-modules --test tests/performance.test.cjs
# Sintaxe, sem executar imports remotos nem solicitar webcam
Get-ChildItem -LiteralPath js -Filter *.js | ForEach-Object {
    node --check $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Falha de sintaxe: $($_.Name)" }
}
git diff --check
```

Ver comandos complementares e evidências em [specs/testing.md](specs/testing.md). Usar testes proporcionais ao escopo: dados e regras isoladas, relógio controlado para sessões e integração de eventos quando houver alteração funcional. Mocks não validam reconhecimento real. Webcam, navegadores, desempenho e acessibilidade precisam de avaliação específica.

## Codex, Orca e aceite

- Trabalhar tarefa por tarefa e somente na fase autorizada. Na FASE 00, editar documentação e comentários úteis, preservando o código executável.
- Delegar escopos delimitados quando autorizado; informar arquivos permitidos, branch, restrições e formato de evidência. Se Orca não estiver disponível, declarar isso e informar a alternativa realmente utilizada.
- Evitar edição concorrente dos mesmos arquivos. Revisar o retorno de agentes no código e nos resultados; relato de agente não substitui verificação.
- Atualizar somente documentos cuja verdade mudou: README para uso, AGENTS para políticas, specs para contratos/evidências e roadmap para diagnóstico/plano. `docs/state.md` contém apenas andamento.
- Antes de concluir, revisar diff completo, arquivos novos, verificações e cobertura dos requisitos. Para comentários, comprovar equivalência estrutural do JavaScript e preservação do HTML/CSS executável.
- Entregar relatório com tarefa, diagnóstico, arquivos/diff, implementação, testes e limites, performance medida ou não medida, documentação, riscos e Git.
- Não iniciar a próxima fase sem autorização. Registrar o próximo passo como pendente, sem executá-lo.
