# Libras Arcade | Auditoria E/M e protocolo de webcam | FASE 03.3B-2C

**Estado:** auditoria estática e preparação de QA. Nenhuma regra ou instrumentação foi alterada. E e M não estão recuperadas nem homologadas.

## Evidência e limite da investigação

O [resumo antigo de 16 buffers](Libras_Arcade_Analise_Diagnosticos_Fase_03_3B.md) registrou, em uma janela declarada E, candidatas O=30, A=29 e S=11, com confirmações A/O; em uma janela declarada M, B=32, V=5 e A=3, com confirmações B. São contagens de eventos do anel, não tentativas independentes nem medições da postura física. Aqueles arquivos não trazem as features escalares atuais, a mão física e a orientação verificadas. A competição M/N é estrutural no código, mas **não foi demonstrada** nesses relatos: a concorrente observada para M foi B. A causa geométrica e a frequência de falha atuais permanecem desconhecidas.

As descrições de E/M abaixo são das regras do classificador. A validade das poses executadas precisa de referência pedagógica revisada; geometria de landmarks isolada não comprova a realização correta de um sinal de Libras.

## Regras auditadas

`dist()` é distância 3D entre landmarks; distâncias de mão são divididas por `max(dist(pulso, MCP do médio), 1e-4)`. `ext*` compara a distância da ponta ao pulso com a da base ao pulso. `curl* = 1 − dist(MCP,ponta) / (dist(MCP,PIP) + dist(PIP,ponta))`; portanto mede dobra da trajetória, sem indicar sozinho onde a ponta repousa. As rampas `fuzzyOn` de fechamento por curvatura vão de 0,40 a 0,62; `fuzzyOff` de extensão baixa vale 1 até 0,38 e 0 desde 0,50. Para proximidade do polegar ao MCP, `fuzzyOff` vale 1 até 0,28 e 0 desde 0,50. Escores são médias heurísticas de 0 a 1, não probabilidades.

| Regra | Cinco/seis componentes da média | Limite estrutural a investigar |
| --- | --- | --- |
| E | Quatro `curl*` altos + `thumbMiddlePinch` **distante** (rampa 0,42–0,67) | Quatro dedos muito curvos ainda dão 0,80 mesmo se o componente do polegar for zero. Não exige `ext*` baixo, ponta individual próxima à palma, nem posição do polegar perante outros dedos. |
| S | Os mesmos quatro `curl*` altos + `thumbAcross` **próximo** (rampa 0,42–0,45) | O teste de polegar não é o complemento do de E; ambos podem pontuar alto. |
| A | Quatro `ext*` baixos + `thumbOut` alto; pinça polegar–médio pode descontar até 1/6 | Dedos curvos podem também ter `ext*` baixo. A precede E em `RULES` e vence empate exato. |
| O | `extIndex/Middle/Ring` baixos (rampa até 0,65) + `thumbMiddlePinch` **próximo** (até 0,42) | A pinça se opõe ao componente do polegar de E nos platôs, mas as rampas e os componentes dos dedos podem gerar escores intermediários concorrentes. |
| M | `curlIndex/Middle/Ring` altos + `extPinky` baixo + `thumbPinkyMcp` **próximo** | Os três `curl` e o mindinho bastam para 0,80 sem a posição correta do polegar; não testa `curlPinky`, `extRing` ou lado do polegar em relação aos dedos. |
| N | `curlIndex/Middle` altos + `extRing/Pinky` baixos + `thumbRingMcp` próximo + `thumbPinkyMcp` **distante** | A distância ao MCP do mínimo se opõe à de M, mas ambas ficam parciais entre 0,28 e 0,50; N também pode pontuar por componentes compartilhados. |

`MIN_SCORE=0,55` é aplicado **ao vencedor**, não a cada regra separadamente. Assim, E ou M com 0,80 podem ser elegíveis e ainda perder para outra letra. A classificação percorre `RULES` em ordem e só substitui o vencedor quando o escore é estritamente maior: empates preservam a regra anterior. Em E, verificar A/O/S e as demais vencedoras observadas; em M, verificar N e também B/V/A, porque B foi a confirmação incorreta antiga. O `score` do vencedor e a margem para o segundo lugar não mostram, sozinhos, a posição de E/M quando ficam abaixo do segundo lugar.

### Hipóteses testáveis, ainda não causas confirmadas

1. **E → A/S:** curvatura alta junto de extensão baixa e polegar projetado fora do padrão de E pode sustentar A ou S. Comparar quatro `curl*`, quatro `ext*`, `thumbMiddlePinch`, `thumbAcross` e `thumbOut` nos E e controles verdadeiros. A condição de E não demonstra proximidade individual das pontas à palma; `tipPalmMean` é apenas média dos quatro dedos.
2. **E → O:** pinça polegar–médio pequena favorece O e enfraquece o quinto componente de E. Verificar se isso corresponde à pose executada ou a oclusão/estimativa de profundidade; não inverter a regra por um relato sem geometria.
3. **M → B, hipótese prioritária do relato:** comparar `ext*`, `curl*`, `thumbAcross` e `thumbPinkyMcp` para saber se a forma foi estimada como aberta, se o polegar foi mal localizado ou se uma média parcial de M perdeu. O histórico não permite escolher entre essas causas.
4. **M ↔ N, hipótese estrutural:** comparar simultaneamente `thumbPinkyMcp`, `thumbRingMcp`, `curlRing`, `extRing` e os escores M/N nos controles verdadeiros. Essas distâncias 3D podem variar com oclusão e `z` estimado; a diferença de distância não prova que o polegar está fisicamente sob o dedo pretendido.

## Integridade da instrumentação existente

`startCalibration()` já registra, **a cada inferência enquanto a tentativa rotulada está ativa**, os escores `scoreE/M/N/S/A/O` e também B/V e outros concorrentes, quatro `ext*`, quatro `curl*`, `thumbMiddlePinch`, `thumbAcross`, `thumbOut`, `thumbPinkyMcp`, `thumbRingMcp`, distâncias suplementares do polegar, `tipPalmMean` e `thumbFingerDepth`. Registra `candidate`, `score`, `second`, `secondScore`, `gap`, `phase`, `stabilizingMs`, `candidateEligible`, `handPresent` e `landmarksValid`. Eventos separados contêm `hold_reset`, `signconfirmed`, `ui_received` e `game_decision`. O resumo `calibration` guarda rótulos, primeira confirmação e contagem mesmo se `calibration_start` sair do anel.

Isso basta para **reconstituir os componentes das regras atuais e localizar a etapa da perda**. Não há distância de cada ponta ao centro da palma, ordem/superposição do polegar em relação a cada dedo, qualidade/visibilidade individual dos landmarks ou handedness física inferida. `tipPalmMean` e `thumbFingerDepth` agregam dedos; `landmarksValid` atesta estrutura e `x/y` finitos, não qualidade anatômica ou confiabilidade de `z`. Esses dados podem ser úteis para uma regra futura, mas as capturas iniciais devem demonstrar a ambiguidade antes de ampliar a instrumentação. Nenhum campo novo é necessário nesta fase.

O diagnóstico é opcional e local: sem imagens, vídeos, landmarks completos ou gravação/envio automáticos. O anel guarda 120 eventos. Fora da calibração, `recognition` é amostrado a cada 200 ms ou por mudança de estado, insuficiente para reconstruir toda a permanência da candidata. Na captura rotulada, há um evento por inferência. Perda completa da mão pode zerar o hold sem `hold_reset`; correlacionar com `recognition.reason=no_hand`.

## Protocolo de webcam

**Conjunto inicial:** 12 capturas separadas no Treino, uma por letra e mão física: E direita/esquerda, M direita/esquerda, S direita/esquerda, A direita/esquerda, O direita/esquerda e N direita/esquerda. S/A/O são controles de E; N é controle de M. Se M perder para B novamente, incluir B verdadeiro nas duas mãos em rodada adicional, sem mudar esta primeira matriz. O avaliador deve conferir a forma de cada sinal com referência pedagógica válida. Cada captura é uma tentativa; frames dentro dela são correlacionados.

1. Em **Treino → Todas as letras → Escolher letra**, escolha como alvo a própria letra sinalizada, inclusive nos controles. Antes de cada tentativa, retire a mão por pelo menos 250 ms e aguarde o cooldown de 900 ms da confirmação anterior terminar; não inicie durante `COOLDOWN` ou `WAIT_RELEASE`. Anote identificador da tentativa, mão física, orientação realmente executada (`front`, `oblique`, `side`), distância (`near`, `medium`, `far`), espelhamento real e condições de iluminação/oclusão em notas externas. Não inferir mão física de `rightHand`: o motor usa um papel lógico para a única mão detectada.
2. Imediatamente antes de apresentar a pose, inicie `window.librasArcadeDiagnostics.startCalibration({ intendedLetter: 'E', physicalHand: 'right', orientation: 'front', distance: 'medium', mirrored: true })`, substituindo os valores pela execução real. Se mudar orientação, espelho ou mão, encerre e reinicie outra tentativa com rótulo correto.
3. Encerre com `const attempt = window.librasArcadeDiagnostics.stopCalibration();` logo após a **primeira** `signconfirmed`. Se não confirmar, encerre após uma janela fixa de cerca de 1,5 s de pose estável e registre `confirmation=absent`; interrompa antes se o anel se aproximar de 120 eventos. Inspecione `attempt.events.length` e `attempt.calibration.confirmationCount`; se houver mais de uma confirmação ou o anel atingir 120, marque a captura como não limpa e repita em nova tentativa. `stopCalibration()` não salva o resultado: copie manualmente os escalares e eventos para arquivo local fora do repositório antes de chamar `disable()`.
4. Registre também ausência de mão/landmarks válidos. Preserve eventos e tempos suficientes para comparar a primeira candidata estável, sua margem contra cada concorrente, resets e primeira decisão do Treino; não recorte apenas o frame de confirmação. Não reutilize uma tentativa longa como várias tentativas independentes.

Para classificar cada falha, siga esta ordem: (A) mão/landmarks ausentes; (B) `scoreE` ou `scoreM` abaixo de 0,55; (C) escore elegível, mas outra letra vence, inclusive empate por ordem; (D) letra correta vence, mas trocas de candidata, perda de mão ou movimento reiniciam o hold; (E) `signconfirmed` correto emitido, mas `ui_received`/`game_decision` não aceita; (F) confirmação correta e aceita. Separe `wrong_letter`, `round_transition`, `cooldown` e `wait_release` pelos respectivos campos. Resuma por **tentativa** e mão, com distribuições de escores e diferenças por frame somente como diagnóstico interno, sem chamar frações de frames de precisão.

## Critérios para a etapa funcional posterior

Só formular alteração E ou M depois de reunir positivos e controles independentes que distingam forma legítima, concorrente vencedora e causa temporal. Comparar componentes efetivos das regras, margens E−A/O/S e M−N/B, e sua persistência por pelo menos o hold existente, incluindo casos negativos. Se a separação não aparecer nos escalares atuais, solicitar apenas medidas opcionais indispensáveis; não derivar limiares de uma única tentativa nem alterar N/S ou qualquer outra regra protegida. Uma correção futura exigirá testes positivos/negativos, Treino e Soletrar, rearmamento, suítes completas, revisão independente e **nova** homologação real nas duas mãos, separada das capturas usadas para desenvolver a regra. E/M permanecem em diagnóstico até lá.
