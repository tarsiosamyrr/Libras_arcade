---
id: core
contract_status: confirmed
implementation_status: partial
last_verified: 2026-10-24
last_verified_ref: working-tree-fase-033b14-automated
---

# Prática de datilologia nos três jogos

## Finalidade e limites

Oferecer Treino, Soletrar e Forca mediante reconhecimento local de sinais, preservando identidade visual e proposta pedagógica. O contrato foi confirmado pelo prompt mestre do usuário. A auditoria não autoriza expandir funcionalidades ou iniciar fases futuras.

## Atores, permissões, entradas e resultados

Jogador concede acesso à webcam e navega por controles ou gestos. Landmarks alimentam o classificador e letras confirmadas alimentam o modo ativo. Saídas incluem alvo, dica, progresso, feedback, pontuação e recorde local. A execução precisa dos recursos remotos de visão/fontes quando ausentes do cache.

## Contrato comportamental e critérios de aceite

- Manter os três modos e seus feedbacks documentados no [README](../../README.md).
- Preservar processamento local e não gravar imagens/biometria automaticamente.
- Não confundir cobertura nominal com precisão ou validação pedagógica.
- Evoluir em fases autorizadas, com evidência e documentação de riscos. FASE 00 foi documental; FASE 01 instrumentou e removeu trabalho redundante; a FASE 02 acrescentou pausa, retomada, cancelamento e descarte de recursos; a FASE 02.1 trata falhas de armazenamento e reinicia estatísticas por sessão; a FASE 03 controla confirmação única, cooldown e rearmamento sem pausar a inferência; a FASE 03.1 arbitra D/I estáticos e J/Z dinâmicos e protege contra pose residual; a FASE 03.1.2 rejeita oscilação incompatível com J/Z e oferece navegação manual do Treino, inclusive pelo conjunto completo A–Z.

## Invariantes e regras de negócio

Treino compara uma letra; Soletrar recebe uma sequência e premia palavra completa; Forca revela ocorrências e limita a rodada a seis erros. Repetições de palpite não adicionam erros na Forca. São regras do código auditado; fórmulas e transições estão em [system.md](../system.md).

## Estado atual e lacunas

Os motores e o classificador estão implementados, com cobertura nominal A–Z e 90 palavras. A FASE 01 corrigiu FPS e otimizou loop/Canvas com comparação controlada. A FASE 02 controla stream, modelo, loop, atrasos de rodada e pausa dos jogos. A FASE 02.1 mantém o jogo utilizável quando o armazenamento falha e zera a melhor sequência ao iniciar Treino/Soletrar. A FASE 03 impede repetição automática da pose e mostra a preparação da próxima letra em cenários simulados. A FASE 03.1 corrige, nesses cenários, bloqueio de D/I por movimento parcial, perda de D→Z/I→J e confirmação residual J→I/Z→D. Fluxo de ranking/resultados, acessibilidade, validação com webcam e validade do reconhecimento possuem lacunas. A capacidade permanece `partial`; testes sintéticos não validam o uso real com câmera.

A FASE 03.1.2 corrigiu, em entradas sintéticas, falso Z sobre D e falso J sobre I causados por oscilação. O complemento da fase permite selecionar as 26 letras nominais em ordem. A FASE 03.1.3 deixa Anterior, Próxima e escolha direta visíveis em cada sessão ativa de Treino; níveis preservam os respectivos conjuntos, o sorteio pedagógico e histórico curto para voltar. A navegação não pontua. A FASE 03.2 acrescenta diagnóstico local opcional e limitado do fluxo de confirmação e decisão dos jogos, e corrige a marcação visual da última letra do Soletrar após `wordcomplete`. A classificação I/Y continua sem revisão. A FASE 03.3A documenta uma matriz A–Z e um protocolo de coleta manual. A FASE 03.3B-1 acrescenta um critério de haste para J e descarta trajetória antiga após intervalo de callbacks superior à graça existente; O/A e as regras estáticas continuam sem recalibração. A capacidade permanece `partial` até avaliação com câmera, jogadores e especialistas.

A FASE 03.3B-1.2 acrescenta retorno ascendente e lateral ao J após a haste, motivado por um falso J reproduzido com trajeto sintético sem gancho. A coleta rotulada de escalares é voluntária, temporária e desligada por padrão. Os 12 buffers reais anteriores à correção mostram falsos J, O/A por orientação/mão informada, V/P, B/F para C e alternância G/T, mas não trazem geometria para calibrar os pares estáticos. Nenhuma regra A/O, P/V, C/B ou G/T foi alterada. A capacidade continua `partial`; eficácia em webcam e validade pedagógica permanecem pendentes.

Após relato de J difícil na webcam, a FASE 03.3B-1.3 substitui os três passos rígidos por haste e gancho segmentados, mantém a trajetória J ativa por uma perda breve da pose-base com pulso espacialmente contínuo e compensa variação de escala projetada apenas em J. Os testes em `update()` reproduziram antes da mudança falhas de inclinação, perda de base e escala; os controles sintéticos de I e Z permanecem. A captura opcional passou a explicar melhor a geometria e o motivo de rejeição. A capacidade segue `partial`: a melhora real e o equilíbrio entre falso J e J perdido exigem webcam, tentativas rotuladas e review independente.

A homologação posterior não aprovou a 03.3B-1.3: J rápido falhou, J curto oscilou e I foi emitido em uma tentativa de J. A FASE 03.3B-1.4 separa o fim da haste do ponto inferior quando a curva ainda desce lateralmente, usa média centrada apenas em um gancho terminal claro de seis a oito pontos e limita a continuidade espacial do pulso conforme o intervalo entre callbacks. O contrato `signconfirmed` e Z continuam iguais. As falhas foram reproduzidas com landmarks sintéticos antes da correção; a causa exata de cada tentativa real e a taxa de acerto continuam desconhecidas. A capacidade permanece `partial` até nova homologação por tentativa e review do diff.

## Evidências de implementação e teste

Implementação: [Game](../../js/game.js), [ForcaGame](../../js/forca.js), [LibrasEngine](../../js/libras.js) e [UI](../../js/ui.js). A inspeção incluiu todos os módulos da raiz e seus dados. Comandos, cenários reproduzidos e limitações estão em [testing.md](../testing.md). `last_verified` representa inspeção do estado, não homologação do reconhecimento.

## Relações

[Roadmap](../../docs/ROADMAP.md), [matriz A–Z e protocolo](../../docs/qa/qa-reconhecimento.md), [decisões abertas](../open-decisions.md), [AGENTS](../../AGENTS.md), [mudança da FASE 01](../changes/2026-10-20-performance.md), [decisão da FASE 03.1](../changes/2026-10-23-arbitragem-estatico-dinamico.md), [decisão da FASE 03.1.2](../changes/2026-10-23-fase-0312-z-i-treino.md), [decisão da FASE 03.3B-1](../changes/2026-10-24-fase-033b1-j-oa.md), [decisão da FASE 03.3B-1.2](../changes/2026-10-24-fase-033b12-j-calibracao.md), [decisão da FASE 03.3B-1.3](../changes/2026-10-24-fase-033b13-j-segmentacao.md) e [decisão da FASE 03.3B-1.4](../changes/2026-10-24-fase-033b14-j-rapido-curto.md). A arquitetura principal foi preservada.
