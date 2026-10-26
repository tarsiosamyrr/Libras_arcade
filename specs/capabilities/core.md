---
id: core
contract_status: confirmed
implementation_status: partial
last_verified: 2026-10-25
last_verified_ref: working-tree-fase-033b2b-automated
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

A revisão CodeRabbit da 03.3B-1.4 identificou que a média curta ainda reduzia uma subida terminal válida. A FASE 03.3B-1.4.1 conserva o último ponto bruto e exige avanço lateral no mesmo sentido também no passo anterior, para separar um gancho curto de um salto isolado. O defeito e um falso J por ruído terminal foram reproduzidos em `update()` antes da correção. A capacidade continua `partial`: as fixtures não substituem tentativas com webcam nem a nova revisão do diff.

A FASE 03.3B-2A reduz V somente quando há evidência simultânea de polegar próximo à região K/P e direção descendente, após reproduzir uma P sintética que confirmava V. A captura rotulada ganhou escalares de projeção da palma, direção local dos dedos, agrupamento das pontas e escores S/E. O/A continua ambíguo em empate: os buffers reais não incluem a geometria para calibrá-lo sem risco a A. A capacidade permanece `partial`; a mudança em P/V e a instrumentação precisam de webcam rotulada, comparação por tentativa e revisão pedagógica.

Na FASE 03.3B-2A.1, o JSON escalar da homologação seguinte ficou disponível localmente. A pinça polegar–médio separou as janelas O das duas janelas A verdadeiras com mais consistência que área projetada da palma. A regra A passou a ser descontada pela faixa de pinça já usada em O, sem elevar o escore original e sem mudar O/P/V/K. Rótulos e primeira confirmação da captura voluntária permanecem em um resumo fora do anel de 120 eventos, apenas na memória da aba. O controle A lateral real e a verificação da orientação declarada nas capturas problemáticas faltam; a capacidade continua `partial` e a melhora com webcam após a alteração não foi homologada. [Decisão](../changes/2026-10-25-fase-033b2a1-oa.md).

Na FASE 03.3B-2B, a regra R passou a exigir inversão projetada da ordem das pontas, proximidade 3D e um eixo de palma visível, além de extensão de indicador/médio e fechamento dos demais dedos. Testes sintéticos reproduziram R reto perdendo para U e R com 0,8 mesmo sem cruzamento; a mudança local passou nos controles de R/U e no teste diferencial de estado. E e M receberam apenas escalares e escores na calibração voluntária: faltam exemplos legítimos rotulados para separar E/S/A/O e M/N sem impor limiares arbitrários. N, S e U mantêm suas regras. O reconhecimento real continua `partial` até homologação em webcam e integração controlada das branches N/S. [Decisão e limites](../changes/2026-10-25-fase-033b2b-emr.md).

Na verificação pré-checkpoint da 2B, duas fixtures revelaram falsos negativos de R com profundidade moderada e rotação 3D. A regra R passou a medir a ordem das pontas no eixo 3D dos MCPs e a distância entre os dedos no ponto de cruzamento de seus segmentos projetados, conservando o teste separado da visibilidade do eixo em 2D. Os limiares e a regra U ficaram iguais. Os testes sintéticos confirmam R até `spreadIM≈0,327` e rotação de 55°; a 60° e 65°, a competição com U permanece, e uma vista quase lateral não é obrigatoriamente reconhecível. Webcam real e custo por frame seguem sem medição. [Evidência e risco](../changes/2026-10-25-fase-033b2b-emr.md).

A homologação real posterior revelou regressão: quatro capturas rotuladas R emitiram U, enquanto dois controles U emitiram e aceitaram U. A regra anterior, reconstruída nos mesmos eventos amostrados, quase nunca superaria U; a captura também não contém landmarks para testar um novo critério de cruzamento. Na 03.3B-2B.2, apenas a calibração opcional ganhou seis escalares de lacuna, posição e ordem 2D dos segmentos. R/U, limiares, estado temporal e jogos permanecem iguais. A capacidade continua `partial` e **R não está recuperada**; novas capturas e homologação com webcam são necessárias. [Diagnóstico e limites](../changes/2026-10-26-fase-033b2b2-r-regressao.md).

Seis capturas novas da 2B.2 mostraram cruzamento projetado, proximidade 3D e inversão das pontas persistentes nos dois R estendidos, enquanto U ainda vencia por escore. A 03.3B-2B.3 promove o escore específico de R somente quando forma e essas relações geométricas são coerentes; U e o estado temporal não mudaram. Replay escalar das capturas anteriores e fixtures indicam recuperação candidata, sem execução do novo motor nos landmarks reais. A capacidade segue `partial`: R estendido em ambas as mãos e U legítimo precisam de **nova homologação independente em webcam**. [Decisão e riscos](../changes/2026-10-26-fase-033b2b3-r-recuperacao.md).

A [homologação frontal inicial após a 2B.3](../../docs/qa/Libras_Arcade_Homologacao_RU_033B2B3_2026-10-26.md) registrou primeira confirmação correta e aceita pelo Treino para R estendido cruzado e U paralelo nas duas mãos. Foram quatro capturas, todas declaradas frontais, a distância média e com espelhamento ativo. Duas tiveram confirmações adicionais, e uma perdeu eventos iniciais ao atingir o anel de 120; por isso não há taxa de precisão por tentativas independentes. Soletrar, Forca, outras orientações, usuários, iluminação e custo real continuam sem homologação nesta rodada. A capacidade permanece `partial`.

## Evidências de implementação e teste

Implementação: [Game](../../js/game.js), [ForcaGame](../../js/forca.js), [LibrasEngine](../../js/libras.js) e [UI](../../js/ui.js). A inspeção incluiu todos os módulos da raiz e seus dados. Comandos, cenários reproduzidos e limitações estão em [testing.md](../testing.md). `last_verified` representa inspeção do estado, não homologação do reconhecimento.

## Relações

[Roadmap](../../docs/ROADMAP.md), [matriz A–Z e protocolo](../../docs/qa/qa-reconhecimento.md), [decisões abertas](../open-decisions.md), [AGENTS](../../AGENTS.md), [mudança da FASE 01](../changes/2026-10-20-performance.md), [decisão da FASE 03.1](../changes/2026-10-23-arbitragem-estatico-dinamico.md), [decisão da FASE 03.1.2](../changes/2026-10-23-fase-0312-z-i-treino.md), [decisão da FASE 03.3B-1](../changes/2026-10-24-fase-033b1-j-oa.md), [decisão da FASE 03.3B-1.2](../changes/2026-10-24-fase-033b12-j-calibracao.md), [decisão da FASE 03.3B-1.3](../changes/2026-10-24-fase-033b13-j-segmentacao.md), [decisão da FASE 03.3B-1.4](../changes/2026-10-24-fase-033b14-j-rapido-curto.md), [decisão da FASE 03.3B-1.4.1](../changes/2026-10-25-fase-033b141-j-terminal.md), [decisão da FASE 03.3B-2A](../changes/2026-10-25-fase-033b2a-oa-pvk.md), [decisão da FASE 03.3B-2A.1](../changes/2026-10-25-fase-033b2a1-oa.md) e [decisão da FASE 03.3B-2B](../changes/2026-10-25-fase-033b2b-emr.md). A arquitetura principal foi preservada.
