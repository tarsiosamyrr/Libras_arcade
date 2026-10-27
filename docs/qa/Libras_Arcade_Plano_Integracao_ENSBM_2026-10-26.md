# Libras Arcade | Plano de integração seletiva e recuperação E, N, S, B, M
**Data:** 26/10/2026

**Natureza:** plano técnico, não implementação nem homologação

## 1. Decisão de arquitetura
A versão do usuário, em `fase-03-cooldown-recuperado` / `recovery/fase-033b13-6170a2d`, continua sendo a fonte de verdade. Preservar a máquina temporal `READY → STABILIZING → CONFIRMED → COOLDOWN → WAIT_RELEASE`, a instrumentação voluntária, otimizações e a recuperação de R/U (homologação frontal inicial + revisão CodeRabbit sem apontamentos). Não substituir `js/libras.js` por arquivos de colaboradores; não importar projetos completos nem configurações temporais globais. O HEAD `82ae0bc` é referência histórica informada, **não foi verificado no sistema local**. A árvore atual contém alterações não commitadas documentais e da instrumentação da 2C.2.

## 2. Evidência dos sete screenshots de webcam
- **B direita e esquerda:** houve confirmação. Um B fisicamente aberto, com separação maior do que a desejada entre os dedos, também foi aceito. Meta: B com quatro dedos alinhados, próximos e estendidos; quatro dedos afastados são controle negativo de B, sem criar letra nova no alfabeto.
- **M anatômico (duas mãos):** mãos aparentemente flexionadas/sobrepostas, mas overlay com segmentos projetados que não permitem garantir correspondência de cada articulação. Diagnóstico em tela indicou O. Investigar tanto rastreamento quanto alinhamento vídeo/canvas, antes de afirmar falha do MediaPipe.
- **Três dedos para baixo (apelidado de W invertido):** não houve confirmação de M; B apareceu como candidata ou letra detectada na UI. Essa pose isolada não identifica M, pois faltam comprovações de polegar sob três dedos, mínimo e orientação. A referência IF Baiano distingue M de W: https://www.ifbaiano.edu.br/unidades/bonfim/files/2022/07/Alfabeto-manual-em-Libras-1.pdf.
- As screenshots são frames estáticos, não medições temporais nem homologação de outras letras.

## 3. Auditoria preliminar dos arquivos recebidos
**`/mnt/data/libras.js` avulso:** B multiplica critérios de proximidade entre pontas e `upScore`; E combina curvatura, baixa extensão e polegar; N usa dois dedos estendidos e `downScore`; S usa fechamento e polegar cruzado; M favorece três dedos relativamente retos, mínimo recolhido, proximidade e `downScore`, mas não condiciona diretamente o polegar sob três dedos. Também altera outras regras e lógica global.

**`Projeto de Libras-pass.zip`:** B multiplica fechamento dos pares, mas contém `B_SPREAD_RP_TOGETHER=0.31` e `B_SPREAD_RP_APART=0.30`, intervalo em ordem invertida; E usa `garras`, mínimo das curvaturas e duas relações do polegar; N usa curvaturas e posição do polegar junto ao anelar (hipótese diferente da do arquivo avulso); S usa `Math.min` para os três dedos e fechamento do indicador; M usa punho e polegar junto ao mínimo. O ZIP altera limites globais, suavização de escores, hold, regras de R/U e seleção de candidatos. Além disso, o ZIP não inclui suíte de testes; não aceitar como substituição integral.

**Importante:** ambas são fontes externas e não representam o HEAD corrente do usuário. Revalidar contra a árvore real antes de qualquer patch.

## 4. Ordem de implementação segura
**Etapa A | Congelamento e triagem.** No worktree do usuário: registrar `git status -sb`, `git log -1 --oneline`, `git diff --stat`, `git diff --check`; preservar modificações documentais e da instrumentação opcional. Identificar commits, branches, arquivos e testes dos colaboradores; anotar versões e cenários de sucesso. Comparar `E/N/S/B/M` em três implementações, sem merge, cherry-pick ou checkout de outras branches.

**Etapa B | B estrita (primeira correção funcional independente).** Criar duas classes de QA físico: B legítimo com dedos unidos e controle negativo com quatro dedos separados. Analisar distâncias normalizadas entre pontas adjacentes I–M, M–R, R–P; extensão dos quatro, polegar recolhido, estabilidade e orientação. Aplicar gating geométrico **apenas na pontuação de B**, com tolerância gradual e sem mudanças de `MIN_SCORE`, do estado temporal ou de outras letras. Evitar limiar rígido arbitrário; usar exemplos das duas mãos. Confirmar B correto e não confirmar B para quatro dedos afastados. Controle de negativo sem identificá-lo falsamente como letra B.

**Etapa C | E e S, integração contrastiva.** Portar conceitos da regra E do colega (curvatura mínima e posição do polegar) somente se distinguirem E de A/O/S reais; avaliar escores no replay das capturas anteriores. S do colega exige os outros dedos individualmente e índice dobrado, mais restritivo que média; avaliar a interação E↔S e regressões de A/O. Não alterar a branch do colega: receber patch, implementar equivalente minimamente no worktree próprio, com atribuição da contribuição. Criar fixtures distintas das amostras de calibração. Testar ambas as mãos e a entrega ao Treino/Soletrar.

**Etapa D | N.** Duas hipóteses incompatíveis: N com dois dedos estendidos apontados para baixo (avulso) e N com dedos dobrados sobre polegar (ZIP). Priorizar a configuração validada pedagogicamente e com webcam na branch do colega. Evitar `downScore` isolado, pois direção dos dedos não é orientação da palma e U virado para baixo pode pontuar como N. Contrastar com U, H, P, R e com a letra M; jamais enfraquecer globalmente U.

**Etapa E | M.** Rever correspondência overlay/vídeo primeiro (mesmo espelhamento, ajuste de `object-fit`, aspect ratio, resolução interna e coordenadas). Verificar 0/5/9/13/17 MCPs, PIPs, DIPs, pontas e polegar com mão real. Testar interpretação de desvio MCP e articulações distais, posição do polegar, fechamento do mínimo, orientação da mão versus direção dos dedos. Não transformar W invertido em M, nem zerar B indiscriminadamente. Comparar as duas mãos com controles B, N, W e três dedos para baixo sem polegar posicionado corretamente.

**Etapa F | Revisão final e integração.** Rodar todos os testes do worktree (`npm.cmd test`, `npm.cmd run test:camera`, `npm.cmd run test:performance` se disponíveis), validação das specs, JS syntax e `git diff --check`. Webcam em capturas novas, Treino e Soletrar, duas mãos, espelhado e sem espelho, condições positivas e negativas, hold, cooldown/rearmamento. Medir FPS/CPU/memória separadamente porque a suíte de performance testa contratos lógicos. CodeRabbit só depois da implementação e checkpoint local aprovado; resolver P0/P1 antes de integrar. Organizar PRs/commits por letra para bissecção, preservando ownership dos colegas.

## 5. Critérios de aceite
- **B:** dedos unidos confirmam; dedos significativamente afastados não confirmam B; não comprometer M/W/A.
- **E:** reconhecida nas duas mãos e vence corretamente A/O/S apenas em E verdadeiro; controles A/O/S não viram E.
- **S:** reconhecida nas duas mãos e não sequestra E/A/O.
- **N:** reconhecida nas duas mãos; U legítimo e U rotacionado não viram N sem justificativa pedagógica e evidência independente.
- **M:** reconhecida nas duas mãos com configuração válida, distinta de B/N/W; não depender de letra esperada pelo jogo.
- **R/U:** devem continuar reconhecidas na webcam frontal, como no checkpoint anterior.
- **Restrições:** sem alterações globais desnecessárias, sem mescla integral de arquivos de colaboradores, sem mudanças no worktree alheio, sem commit/push/merge sem pedido explícito.

## 6. Pendências de evidência
1. Informações de commit e testes reais de E/N/S nas branches dos colegas. O relato de sucesso não é homologação na arquitetura atual.
2. Diagnóstico de overlay versus mídia nos screenshots M, com duas mãos e calibração voluntária dos 14 novos escalares se necessário.
3. Controles físicos B com dedos juntos versus quatro afastados e casos de N/W.
4. Atualização dos critérios pedagógicos com referência institucional para variantes de M/N.

**Status:** plano pronto; nenhuma alteração do motor foi realizada nesta análise.
