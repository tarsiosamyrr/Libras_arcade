# Libras Arcade 1.5

Jogo educacional de datilologia em Libras, desenvolvido no contexto de uma Liga de Inteligência Artificial. A webcam fornece landmarks da mão para um classificador geométrico executado no navegador, que alimenta os modos **Treino, Soletrar e Forca**.

Esta documentação descreve a auditoria da FASE 00, as alterações de performance da FASE 01, o ciclo de vida da câmera da FASE 02, as correções de armazenamento e estatísticas da FASE 02.1, o cooldown da FASE 03, a arbitragem estática/dinâmica da FASE 03.1, a navegação do Treino da FASE 03.1.3 e o diagnóstico da FASE 03.2. A aplicação atual continua em JavaScript, sem backend Python, TypeScript ou etapa de treinamento de letras.

Repositório: [Darkzin41/Libras_arcade](https://github.com/Darkzin41/Libras_arcade).

## Os três jogos

| Modo | Funcionamento atual | Progressão |
| --- | --- | --- |
| Treino | Nos níveis tradicionais, sorteia letras conforme a dificuldade. **Todas as letras (A–Z)** percorre as 26 letras em ordem, inclusive J e Z, para validação individual. Acertos somam pontos; os controles manuais trocam o alvo sem pontuar nem alterar a sequência. | Nos níveis tradicionais, sobe um nível a cada 5 letras corretas, até o nível 5. O conjunto A–Z mantém o tempo do nível 1 e não sobe de nível. |
| Soletrar | Sorteia uma palavra e recebe suas letras em ordem. O cronômetro é por letra; completar a palavra acrescenta bônus. | Sobe um nível a cada 5 letras corretas, até o nível 5. |
| Forca | Sorteia palavra e dica. Cada palpite correto revela todas as ocorrências; repetidos não acrescentam erros. Com 6 erros, perde-se a rodada. Não há cronômetro. | Sobe um nível a cada 3 palavras vencidas, até o nível 5. |

O menu permite escolher os níveis iniciais 1, 2 e 3; os níveis 4 e 5 são alcançados pela progressão. O cartão do Treino oferece também o botão **Todas as letras (A–Z)**, que inicia diretamente o conjunto completo sem modificar a seleção dos níveis. Treino e Soletrar compartilham um recorde local; a Forca mantém outro. A melhor sequência de Treino/Soletrar e as vitórias da Forca pertencem à sessão atual. Não há limite de rodadas para encerrar automaticamente a sessão. Após vitória/derrota na Forca, uma nova palavra começa após 1,6 s; no Treino e ao concluir uma palavra, a pausa de avanço é de 450 ms.

## Como executar

Sirva a raiz que contém este README, `index.html`, `js/` e `css/`. Não abra o HTML por `file://`.

Requisitos: webcam com permissão, navegador com módulos ES, Canvas, `getUserMedia` e suporte ao runtime MediaPipe/WASM e ao delegate GPU solicitado. Use `localhost` ou HTTPS. Não existe matriz de compatibilidade validada nesta fase nem fallback explícito de GPU para CPU.

Com Python 3 já instalado, execute na raiz:

```powershell
# Windows com Python Launcher
py -m http.server 8000 --bind 127.0.0.1
```

Em ambientes onde Python 3 é acessível por `python` ou `python3`, use esse executável com os mesmos argumentos. Abra [localhost:8000](http://localhost:8000), clique em **Começar** e permita a câmera. Pare o servidor com `Ctrl+C`. Python serve apenas os arquivos estáticos nessa opção; não processa os sinais.

Alternativas existentes de desenvolvimento: Live Server do VS Code ou `npx serve` com Node.js instalado. `npx serve` pode baixar o pacote de servidor; ele não é uma dependência versionada do projeto. O `package.json` contém apenas comandos de teste; a aplicação não exige `npm install`, dependências locais ou etapa de build.

É necessária conectividade para os recursos externos quando eles não estiverem em cache. O repositório não contém service worker, modelo local ou garantia de funcionamento offline.

## Interação

| Ação | Entrada implementada |
| --- | --- |
| Escolher um modo | Clique/toque ou cursor do indicador com pinça sobre o cartão. |
| Escolher Treino | O botão destacado **Todas as letras** abre A–Z (26 letras). Para a progressão tradicional, escolha 1–3 e acione **Iniciar nível selecionado**; os botões funcionam com teclado, mouse e toque. Não há seleção de nível por gesto implementada. |
| Confirmar letra estática | Sustentar a candidata por 600 ms, com tolerância de 250 ms a perda breve da candidata. |
| Confirmar J/Z | Formar pose-base e executar uma trajetória nova; pequenos ajustes da pose-base não cancelam indefinidamente o hold de I/D. |
| Preparar a próxima letra | Após confirmar, aguardar ao menos 900 ms. Para repetir uma letra estática, deixar de apresentar candidata por 250 ms; para outra letra estática, mantê-la detectada por 300 ms. J/Z podem ser observados durante a espera, mas só uma trajetória válida concluída após o cooldown emite evento. |
| Após J/Z | I/D são poses residuais de J/Z e não confirmam automaticamente. Para sinalizar I/D em seguida, libere a candidata por 250 ms ou faça outra pose estável. Para outro J/Z com a mesma pose-base, pause a ponta do dedo e desenhe novo trajeto. |
| Navegar no Treino | **← Anterior**, **Próxima letra →** e **Escolher letra** aparecem em toda sessão de Treino. Em A–Z, Próxima após Z retorna a A e Anterior em A retorna a Z; a posição, como “8 de 26”, aparece acima da letra. Nos níveis, Anterior percorre as letras já visitadas e fica visível, porém desabilitado antes da segunda letra; Próxima conserva o sorteio pedagógico ao avançar além do histórico. O seletor oferece somente as letras do nível atual. Cada troca reinicia o tempo e limpa o gesto pendente, sem mudar pontuação, recorde ou sequência. Os controles não aparecem em Soletrar, Forca ou menu. |
| Abrir guia | Botões “Guia do alfabeto” ou “Aprender Libras”. |
| Sair da rodada | Botão Sair, `Esc`, pinça sobre Sair ou deslize da mão da esquerda para a direita na imagem espelhada. |
| Fechar guia | Clique em Fechar, `Esc`, deslize ou punho fechado fora das telas de jogo. |
| Abrir diagnóstico | Tecla `d` ativa a captura local e abre o painel; a mesma tecla desativa e apaga a captura. O painel fica oculto pelo CSS em telas de até 720 px; use a API do console no celular. |

Mouse/toque são alternativas de **navegação**; as respostas dos jogos continuam dependendo do reconhecimento. O teclado desenhado na Forca é um indicador de palpites, sem entrada por clique. O Treino tem botões nativos para escolher conjunto, nível e alvo por teclado. O suporte geral de navegação por teclado ainda está incompleto: os cartões recebem foco, mas não tratam Enter/Espaço.

Há marcação de identificação do jogador e ranking, porém o ranking não tem preenchimento/persistência implementados e faltam estilos específicos desses painéis. A presença dos botões não significa um ranking funcional. Veja os achados no [roadmap](docs/ROADMAP.md).

## Reconhecimento existente e limites

A cobertura **nominal** do código é de 26 letras:

- Regras estáticas: `A B C D E F G H I K L M N O P Q R S T U V W X Y`.
- Trajetórias experimentais: `J Z`.

Essa lista descreve a implementação, não comprova precisão, conformidade pedagógica ou reconhecimento confiável de todas as letras. O conjunto A–Z do Treino disponibiliza todas as letras nominalmente cadastradas, sem homologar seu reconhecimento com webcam real. H, K e X, por exemplo, são tratados como poses estáticas neste código; isso não é uma afirmação linguística sobre a realização correta desses sinais em Libras.

O MediaPipe detecta a mão e seus 21 pontos; a classificação das letras é feita por regras próprias. Distâncias são normalizadas pela distância entre pulso e base do dedo médio, com proteção contra divisão por zero. Extensão/curvatura de dedos, posição do polegar, distâncias e orientação recebem escores fuzzy. A maior pontuação acima de `MIN_SCORE = 0.55` vira candidata. O percentual apresentado como “confiança” é um escore heurístico, sem calibração estatística.

O cooldown bloqueia apenas novas confirmações. Vídeo, inferência, desenho, cursor e gesto de voltar continuam ativos. O texto discreto na barra inferior indica detecção, confirmação, preparação ou prontidão; a barra circular zera durante a espera. O valor de 900 ms é uma hipótese inicial para teste com jogadores. No Soletrar, o cronômetro por letra continua em curso durante a espera por cooldown/rearmamento; sua duração será revista somente na FASE 04.

J/Z usam histórico de até 1.300 ms, suavização por 3 amostras, mínimo de 6 amostras e critérios de trajetória. Na FASE 03.1, o hold da pose-base passou a ser suspenso por deslocamento líquido recente. Na FASE 03.1.2, a intenção também requer progressão vertical, Z exige três traços alternados com avanço vertical coerente e J exige avanço vertical no gancho. Na FASE 03.3B-1, J passou a exigir uma haste descendente e intervalos sem callbacks acima de 300 ms descartam o trajeto antigo. Na 03.3B-1.2, a haste precisa terminar em retorno ascendente e lateral; um desvio apenas lateral não basta. A 03.3B-1.3 avalia haste e gancho como segmentos, acompanha um J já iniciado durante perda breve da pose-base I e compensa variação de escala sem remover o movimento do pulso. Z não mudou. Vai-e-vem incompatível é descartado para permitir o hold de D/I; uma nova tentativa dinâmica requer pausa observável da ponta. Os limiares são heurísticos ainda sem calibração com webcam. I e Y compartilham componentes de escore e podem alternar a candidata; essa classificação permanece pendente. Iluminação, oclusão, escala, posição, orientação e frequência de frames precisam de avaliação real.

A configuração atual detecta **uma mão** (`numHands: 1`), atribui a primeira detecção ao papel lógico `right` e mantém `REQUIRE_LEFT_HAND: false`. Não identifica lateralidade nesse caminho. O painel de duas mãos é um resquício de outra configuração; ativar só a flag da esquerda impediria confirmações.

As 90 palavras cadastradas têm dicas e usam letras da cobertura nominal. A dificuldade das palavras não é filtrada pela dificuldade individual das letras; Soletrar/Forca não têm exatamente o mesmo conjunto por nível que Treino.

## Arquitetura e estrutura

```text
.
├── index.html              # Telas, vídeo, Canvas, HUD, guia e painéis
├── css/style.css           # Tema HUD, estados visuais e regra responsiva
├── js/
│   ├── app.js              # Boot, desenho e conexão dos componentes
│   ├── vision.js           # MediaPipe, câmera, loop e landmarks
│   ├── libras.js           # Regras estáticas, trajetórias, hold e navback
│   ├── data.js             # Letras, dificuldades, 90 palavras e dicas
│   ├── diagnostics.js      # Captura local opcional e buffer circular limitado
│   ├── game.js             # Treino/Soletrar, pontos, sequência e tempo
│   ├── forca.js            # Palpites, erros e vitórias da Forca
│   └── ui.js               # DOM, eventos, telas, cursor e interações
├── AGENTS.md               # Contrato de engenharia e regras de Git
├── docs/ROADMAP.md         # Diagnóstico classificado e fases futuras
├── docs/state.md           # Estado da entrega e próxima ação
└── specs/                  # Arquitetura detalhada, contratos e evidências
```

`app.js` carrega modelo e câmera após o clique inicial, constrói os motores e inicia o loop. A cada inferência, desenha a mão, atualiza `LibrasEngine` e entrega o cursor à UI. O motor emite `frame`, `signconfirmed` e `navback`; a UI encaminha a letra ao jogo ativo e traduz seus eventos para o DOM.

O detalhamento de dependências, eventos e recursos está em [specs/system.md](specs/system.md). O catálogo pedagógico importa o classificador, que importa a visão; portanto até os motores de jogo têm uma dependência transitiva do módulo remoto de MediaPipe.

## Tecnologias e dependências efetivas

| Tecnologia | Uso verificado |
| --- | --- |
| JavaScript com módulos ES, HTML e CSS | Aplicação estática, sem framework ou bundler. |
| MediaPipe Tasks Vision `0.10.14` | Import JS e WASM via jsDelivr; `HandLandmarker` em modo VIDEO com delegate GPU. |
| Modelo `hand_landmarker/float16/1` | Download de `storage.googleapis.com` durante o boot. |
| Canvas, `requestAnimationFrame`, eventos nativos | Desenho, agendamento e comunicação entre módulos. |
| Google Fonts | Rajdhani e Share Tech Mono importadas pelo HTML. |
| `localStorage` | Recordes de pontuação, quando disponível; não armazena imagens ou landmarks. |

## Performance e diagnóstico

Já existem intervalo mínimo de 50 ms entre tentativas de inferência, descarte de frames com `currentTime` repetido, captura solicitada em 320×240 (máximo 480×360, até 30 FPS), Canvas interno de 640×480 e caches parciais de texto/estado na UI.

Na FASE 01, o FPS passou a contar inferências concluídas na última janela de 1.000 ms. O loop mantém uma única cadeia de rAF; o Canvas evita redefinir dimensões iguais e limpar repetidamente uma imagem já vazia. Modelo, resolução, limites de confiança, regras e cadência mínima foram preservados.

Para consultar as métricas locais pelo console do navegador:

```javascript
const vision = await import('./js/vision.js');
vision.getPerformanceMetrics();
```

O snapshot retorna FPS, callbacks, inferências e callbacks ignorados por frame repetido/intervalo; média, p95 e máximo de inferência, consumidor (desenho + reconhecimento + UI) e trabalho total do ciclo, em milissegundos. Tempos usam as últimas 120 amostras; FPS usa apenas 1 s. Os buffers ocupam 3.840 bytes de dados numéricos. A consulta calcula os percentis, sem ordenar arrays a cada inferência. O HUD recebe FPS na última inferência; se o vídeo parar, consulte o snapshot para observar a expiração para zero.

Há comparação com MediaPipe real, vídeo controlado sem mãos e os três modos em Edge/Windows. Protocolo, números, arquivos brutos e avaliação de Worker/rVFC estão no [relatório da FASE 01](docs/performance/FASE01.md). O ganho comprovado é a remoção de trabalho redundante do Canvas; variação de tempo do modelo não é atribuída à alteração. Não há medição de CPU/RAM total nem homologação de precisão por webcam.

`detectForVideo()` continua síncrono na thread principal. As FASES 03.1/03.1.2 observam e avaliam trajetórias também durante cooldown para permitir D→Z/I→J e rejeitar oscilações; não há timers por frame nem alteração da frequência de inferência, mas esse caminho faz trabalho adicional quando há pose-base J/Z. Permanecem alocações de eventos, objetos e arrays. Na FASE 03.2, o diagnóstico fica desligado por padrão; ligado, calcula a segunda candidata e a validade estrutural dos landmarks, amostra decisões a cada 200 ms ou mudança de estado e só serializa os oito eventos finais para o painel a cada 200 ms. A calibração rotulada da 03.3B-1.2 também fica desligada por padrão e acrescenta apenas escalares e escores do classificador já calculados. CPU/RAM e custo comparativo em webcam real não foram medidos. Worker e `requestVideoFrameCallback` não foram adotados, conforme justificativas e limites registrados no relatório.

### Diagnóstico voluntário no navegador

No console, após carregar a página:

```javascript
window.librasArcadeDiagnostics.enable();
window.librasArcadeDiagnostics.read();
window.librasArcadeDiagnostics.disable(); // desliga e apaga o buffer
```

`clear()` apaga o buffer mantendo a captura ativa. O painel da tecla `d` apresenta os oito eventos mais recentes; a API devolve até 120 eventos em ordem cronológica, somente na memória da aba. Não há gravação, envio ou exportação automática. Desative a captura antes de compartilhar a tela ou qualquer resultado.

Para avaliar uma letra por tentativa, inclusive I/O no Soletrar, use a [matriz A–Z e o protocolo manual de QA](docs/qa/qa-reconhecimento.md). Limpe o buffer antes de cada tentativa e copie o resumo escalar logo depois; o anel sobrescreve eventos antigos. A trilha mostra apenas duas candidatas estáticas, portanto não informa o escore da letra esperada se ela ficar abaixo do segundo lugar. A FASE 03.3B-1 alterou apenas a decisão temporal de J; O/A e as demais regras estáticas não foram recalibradas. [Evidências e limites da mudança](specs/changes/2026-10-24-fase-033b1-j-oa.md).

Para uma tentativa **voluntária e rotulada**, informe no console a letra que você pretende sinalizar e as condições observadas. Os rótulos de mão e orientação vêm do avaliador, não são inferidos pela aplicação:

```javascript
const diag = window.librasArcadeDiagnostics;
diag.startCalibration({
  intendedLetter: 'O', physicalHand: 'left', orientation: 'front',
  distance: 'medium', mirrored: true
});
// Faça uma tentativa; depois examine o resultado conscientemente.
const attempt = diag.stopCalibration();
attempt.events;
diag.disable(); // apaga os dados da memória da aba
```

Use `left`/`right`, `front`/`oblique`/`side` e `near`/`medium`/`far`. Cada `startCalibration()` limpa a tentativa anterior. `stopCalibration()` interrompe a captura e conserva até 120 eventos em memória para leitura; `disable()` apaga. Durante uma tentativa rotulada, `clear()` cancela o rótulo: inicie outra tentativa para continuar. As amostras incluem features escalares dos dedos, polegar, orientação projetada e escores A/B/C/F/G/I/K/O/P/T/V/Y; para J incluem descida/desvio da haste, consistência, retorno do gancho, amostras, duração, curva e `reason` da condição avaliada. `motion_base_lost` marca perda breve da pose I; `motion_rejected` com `stale_history` ou `tracking_discontinuity` marca descarte. Não há imagens, vídeo ou landmarks brutos. `elapsedMs` parte do início manual da captura, não é latência de inferência. Nada é salvo ou enviado automaticamente. [Decisão da 03.3B-1.3](specs/changes/2026-10-24-fase-033b13-j-segmentacao.md).

`recognition` contém `handPresent`, `landmarksValid` (21 pontos com `x/y` finitos), `candidate`/`second` (primeira e segunda regras estáticas), `candidateEligible` (passou de `MIN_SCORE`), `score`/`secondScore`, `gap`, `phase`, `stabilizingMs`, `cooldownRemainingMs`, `motionLetter`, `motionSamples`, `motionProgress`, `motionStatus` e `reason`. Escores são médias heurísticas, **não probabilidades**. `signconfirmed` registra emissão; `ui_received`, chegada à UI; `game_decision`, aceitação ou rejeição; `ui_target`, atualização do alvo; `round_start` e `game_timeout`, ciclo da rodada. `mode` e `screen` indicam o contexto. Ausência de `signconfirmed` após uma candidata visível indica perda antes do evento, geralmente limiar, instabilidade, trajetória ou fase temporal; um `game_decision` rejeitado mostra a razão do motor. `input_invalid` marca uma estrutura de landmarks incompleta sem guardar as coordenadas.

Razões do jogo: `no_session` (motor encerrado), `paused`, `round_transition` (intervalo sem cronômetro ativo), `wrong_letter`, `accepted`, `inactive_screen` (menu/resultado) e, na Forca, `repeated_letter`. No reconhecimento, as razões incluem `no_hand`, `invalid_landmarks`, `below_threshold`, `stabilizing`, `motion_in_progress`, `motion_rejected`, `cooldown`, `wait_release` e `residual_base`. Eventos `hold_reset` distinguem `candidate_changed`, `candidate_lost` e `motion_preparing`; `motion_rejected` distingue trajetória incompleta ou incoerente. Uma candidata exibida não equivale a confirmação; uma confirmação emitida também pode ser rejeitada pelo estado do jogo. O relógio do Soletrar segue ativo durante cooldown; sua duração não foi alterada.

## Webcam, privacidade e erros

No código auditado, imagens e landmarks são processados no navegador, sem rotinas de upload ou gravação automática. `audio: false` dispensa captura de microfone. O acesso à rede carrega JS, WASM, modelo e fontes; isso não significa que o site seja totalmente offline. Os imports JS e fontes começam antes do clique; inicialização do modelo/WASM e solicitação da câmera ocorrem depois.

Os únicos dados persistidos pela aplicação são os recordes nas chaves `libras-arcade:best-score` e `libras-arcade:best-score-forca`. O nome informado apenas atualiza o HUD no fluxo existente.

Se o armazenamento local falhar, os jogos continuam e o recorde permanece em memória enquanto a página estiver aberta. A falha é registrada no console. No próximo fim de sessão (Treino/Soletrar) ou vitória/fim (Forca), o jogo tenta ler e salvar o maior recorde novamente. Um recorde ainda não salvo pode ser perdido ao fechar ou recarregar a página.

Sair de uma rodada volta ao menu e mantém a câmera ativa para navegação por gesto. Ao ocultar a aba, a aplicação pausa inferência e rodada, interrompe as trilhas de vídeo e limpa gestos incompletos. Ao voltar, solicita a câmera novamente e retoma o tempo restante. Em `pagehide`, fecha o modelo; uma restauração pelo cache do navegador o carrega novamente.

Falhas de permissão, câmera ausente ou ocupada e erros de inferência mostram uma tela com **TENTAR NOVAMENTE**. A abertura da câmera aguarda dados do vídeo e a promessa de `play()`, com limite de 10 s para dados iniciais. Confira conexão, origem local/HTTPS, permissão e disponibilidade da webcam. Falhas no import remoto ainda podem ocorrer antes do tratamento do aplicativo; não há fallback de GPU para CPU. As decisões e os cenários manuais estão em [Fase 02 — câmera e recursos](docs/fase-02-camera-recursos.md).

## Testes e validação

Os testes focados das FASES 01 a 03.2 usam o runner nativo do Node. A suíte da FASE 03.2 cobre diagnóstico e decisões do Soletrar no harness existente; contagem e resultados executados estão em [specs/testing.md](specs/testing.md). A versão mais antiga efetivamente verificada é **Node.js 24.18.0**; versões anteriores não foram testadas nesta integração. Execute na raiz:

```powershell
npm.cmd test
npm.cmd run test:performance
npm.cmd run test:camera
```

Sem npm, os comandos equivalentes são:

```powershell
node --experimental-vm-modules --test tests/performance.test.cjs tests/phase02.test.mjs tests/app-ui.integration.test.cjs
node --experimental-vm-modules --test tests/performance.test.cjs
node --test tests/phase02.test.mjs
node --experimental-vm-modules --test tests/app-ui.integration.test.cjs
```

`tests/performance.test.cjs` e a integração de `tests/app-ui.integration.test.cjs` usam `vm.SyntheticModule`/`vm.SourceTextModule`, indisponíveis no Node 24.18.0 sem `--experimental-vm-modules`; por isso `test` e `test:camera` incluem a flag. O harness testa módulos reais com DOM, relógio, câmera e MediaPipe simulados; não comprova compatibilidade de navegador, webcam física, permissões do sistema ou execução real de GPU/WASM. Houve relatos manuais com webcam, mas a FASE 03.1 não executou um protocolo controlado de precisão ou desempenho real. Os scripts de navegador usam Playwright disponível no ambiente; não há instalação automática, CI, lint, typecheck ou build. Comandos, resultados e limites estão em [specs/testing.md](specs/testing.md).

Precisão por webcam, navegação completa, acessibilidade e compatibilidade entre navegadores permanecem sem homologação. O benchmark sem mãos não mede a precisão das letras; os demais achados da auditoria seguem no roadmap.

## Evolução com Python e contribuição

A FASE 06 propõe pesquisa consentida de landmarks rotulados, normalização, separação de treino/avaliação, avaliação por letra e matriz de confusão, além de comparação entre classificadores estáticos e modelos temporais. Ferramentas e formato de exportação dependerão dos resultados. Não há dataset, classificador treinado de letras ou backend Python entregue. Não se deve gravar imagens/biometria automaticamente nem introduzir backend sem justificativa e autorização.

Antes de contribuir, leia [AGENTS.md](AGENTS.md), o [índice técnico](specs/README.md) e o [roadmap](docs/ROADMAP.md). Preserve os três jogos, a identidade visual e os dados pedagógicos. Trabalhe na branch autorizada para cada entrega, tarefa por tarefa, sem commit, push, PR ou merge sem autorização.

## Uso educacional e licença

Os diagramas são esquemas de dedos, não referências oficiais de Libras. A validação de sinais, dicas e movimentos requer especialistas em Libras. O jogo não substitui formação com profissionais e materiais pedagógicos validados.

O README anterior declarava licença MIT, mas não há arquivo `LICENSE` no conjunto versionado auditado. A formalização da licença está registrada como pendência; esta fase não adiciona nem altera termos de licença.
