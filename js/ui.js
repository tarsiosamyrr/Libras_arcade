/* ==========================================================================
   ui.js
   Liga o LibrasEngine (reconhecimento de sinal) e os motores de jogo
   (Game = treino/soletrar, ForcaGame = forca) ao DOM. Também trata a
   navegação do menu por gesto (apontar + pinça), reaproveitando a mesma
   filosofia do jarvis-hud original.
   ========================================================================== */

import { LETTERS, LETTER_POOL } from "./data.js";
import { MOTION_LETTERS } from "./libras.js";
import { diagnostics } from "./diagnostics.js";

const $ = (sel) => document.querySelector(sel);

export class UI {
  /** Registra os listeners uma vez no boot; ainda não existe um método de descarte. */
  constructor(librasEngine, game, forcaGame) {
    this.libras = librasEngine;
    this.game = game;
    this.forca = forcaGame;

    this.homeEl = $('#home');
    this.playEl = $('#play');
    this.forcaPlayEl = $('#forca-play');
    this.referenceEl = $('#reference');
    this.resultsEl = $('#results');
    this.diagEl = $('#diag');
    this.diagJson = $('#diag-json');
    this.cursorEl = $('#cursor');
    this.hintEl = $('#hint-text');
    this.exitBtn = $('#exit-btn');
    this.feedbackToast = $('#feedback-toast');

    this.targetCard = $('#target-card');
    this.targetEyebrow = $('#target-eyebrow');
    this.targetLetterEl = $('#target-letter');
    this.practiceAllBtn = $('#practice-all-btn');
    this.practiceStartBtn = $('#practice-start-btn');
    this.practiceNav = $('#practice-nav');
    this.prevPracticeBtn = $('#prev-practice-btn');
    this.nextPracticeBtn = $('#next-practice-btn');
    this.practiceJump = $('#practice-jump');
    this.practiceLetterSelect = $('#practice-letter-select');
    this.targetWordEl = $('#target-word');
    this.schematicHand = $('#schematic-hand');
    this.targetTip = $('#target-tip');
    this.holdFill = $('#hold-fill');
    this.holdLabel = $('#hold-label');
    this.timerFill = $('#timer-fill');

    // ----- modo forca -----
    this.forcaCard = $('#forca-card');
    this.forcaEyebrow = $('#forca-eyebrow');
    this.forcaHint = $('#forca-hint');
    this.forcaWordEl = $('#forca-word');
    this.forcaTip = $('#forca-tip');
    this.forcaHoldFill = $('#forca-hold-fill');
    this.forcaHoldLabel = $('#forca-hold-label');
    this.forcaKeyboard = $('#forca-keyboard');
    this.forcaErrorsCount = $('#forca-errors-count');

    // ----- status das duas mãos -----
    this.handsStatusEl = $('#hands-status');
    this.handLeftState = $('#hand-left-state');
    this.handRightState = $('#hand-right-state');
    this.handDetectedLetter = $('#hand-detected-letter');
    this.handDetectedConfidence = $('#hand-detected-confidence');
    this.handGateStatus = $('#hand-gate-status');

    this.hudScore = $('#hud-score');
    this.hudStreak = $('#hud-streak');
    this.hudBest = $('#hud-best');

    this.HOLD_CIRC = 175.9; // 2 * PI * 28

    this.hoveredId = null;
    this.diagOpen = false;
    this.currentScreen = 'home';
    diagnostics.setContext(null, 'home');
    this._exitingManually = false;
    this.pendingLevels = { practice: 1, word: 1, forca: 1 };
    this.practiceLevelDots = [...document.querySelectorAll('.mode-card')]
      .find((card) => card.dataset.mode === 'practice')?.querySelectorAll('.level-dot') || [];
    this._practiceSelectKey = null;

    // Cache de controle de renderização (evita gargalo de layout no DOM)
    this._cacheFps = null;
    this._cacheHands = null;
    this._cacheProgress = null;
    this._cacheLetter = null;
    this._cacheStatusKey = null;
    this._cacheRecognitionPhase = null;
    this._lastDiagRenderAt = -Infinity;

    this._buildReference();
    this._bindLibrasEvents();
    this._bindGameEvents();
    this._bindForcaEvents();
    this._bindMouseFallback();

    this._renderHud(this.game._snapshot());
  }

  /* ===================================================== reconhecimento */
  _bindLibrasEvents() {
    this.libras.addEventListener('frame', (e) => this._onLibrasFrame(e.detail));
    this.libras.addEventListener('signconfirmed', (e) => {
      const letter = e.detail.letter;
      if (diagnostics.enabled) diagnostics.record('ui_received', {
        letter, screen: this.currentScreen, mode: this.game.mode ||
          (this.currentScreen === 'forca-play' ? 'forca' : null)
      });
      if (this.currentScreen === 'play') {
        const expected = this.game.mode === 'word'
          ? this.game.target?.[this.game.wordIndex] : this.game.target;
        const mode = this.game.mode;
        const wordIndex = this.game.wordIndex;
        const round = this.game.round;
        const timeLeft = this.game.timeLeft;
        const reason = this.game.handleSign(letter);
        if (diagnostics.enabled) diagnostics.record('game_decision', {
          letter, expected, mode, screen: this.currentScreen, wordIndex, round,
          accepted: reason === 'accepted', reason, timeLeft
        });
      } else if (this.currentScreen === 'forca-play') {
        const reason = this.forca.handleGuess(letter);
        if (diagnostics.enabled) diagnostics.record('game_decision', {
          letter, mode: 'forca', screen: this.currentScreen,
          accepted: reason === 'accepted', reason, round: this.forca.round
        });
      } else if (diagnostics.enabled) {
        diagnostics.record('game_decision', {
          letter, screen: this.currentScreen, accepted: false, reason: 'inactive_screen'
        });
      }
    });
    // gesto de voltar (deslizar a mão da esquerda pra direita) — funciona
    // nas telas internas do projeto, igual pedido: fecha o guia se estiver
    // aberto, sai do jogo se estiver numa rodada, ou volta da tela de
    // resultado pro menu. Já em home sem nada aberto, não faz nada.
    this.libras.addEventListener('navback', () => this._handleNavBack());
  }

  _handleNavBack() {
    if (this.referenceEl && this.referenceEl.classList.contains('is-open')) {
      this.toggleReference(false);
      return;
    }
    if (this.currentScreen === 'play' || this.currentScreen === 'forca-play') {
      this._toast('👋 VOLTANDO AO INÍCIO', 'correct');
      this.exitToHome();
    } else if (this.currentScreen === 'results') {
      this._showScreen('home');
    }
  }

  _onLibrasFrame(state) {
    if ((this.currentScreen === 'play' || this.currentScreen === 'forca-play') &&
        this._cacheRecognitionPhase !== state.recognitionPhase) {
      this._cacheRecognitionPhase = state.recognitionPhase;
      if (this.hintEl) {
        this.hintEl.textContent = {
          READY: 'Pronto para reconhecer',
          STABILIZING: 'Detectando gesto',
          CONFIRMED: 'Gesto confirmado',
          COOLDOWN: 'Preparando próxima letra',
          WAIT_RELEASE: 'Prepare outro gesto ou libere a mão'
        }[state.recognitionPhase] || 'Pronto para reconhecer';
      }
    }
    // SÓ atualiza o texto se o número de FPS ou de Mãos realmente mudou
    if (this._cacheFps !== state.fps) {
      this._cacheFps = state.fps;
      const el = $('#tel-fps');
      if (el) el.textContent = state.fps;
    }
    if (this._cacheHands !== state.hands) {
      this._cacheHands = state.hands;
      const el = $('#tel-hands');
      if (el) el.textContent = state.hands;
    }

    // anel de "segurar para confirmar" — evita reescrever o SVG do anel se o progresso for o mesmo
    const progress = state.holdProgress || 0;
    if (this._cacheProgress !== progress || this._cacheLetter !== state.letter ||
        this._cacheRingPhase !== state.recognitionPhase) {
      this._cacheProgress = progress;
      this._cacheLetter = state.letter;
      this._cacheRingPhase = state.recognitionPhase;

      const offsetStr = String(this.HOLD_CIRC * (1 - progress));
      const letterText = state.recognitionPhase === 'STABILIZING' && state.letter ? state.letter : '—';

      if (this.currentScreen === 'play') {
        if (this.holdFill) this.holdFill.style.strokeDashoffset = offsetStr;
        if (this.holdLabel) this.holdLabel.textContent = letterText;
      } else if (this.currentScreen === 'forca-play') {
        if (this.forcaHoldFill) this.forcaHoldFill.style.strokeDashoffset = offsetStr;
        if (this.forcaHoldLabel) this.forcaHoldLabel.textContent = letterText;
      }
    }

    this._renderDiagnostics();

    this._renderHandsStatus(state);
  }

  /** Painel "Mão esquerda: forma/posição" / "Mão direita: letra em Libras" /
   *  "Letra detectada: X" — visível durante o jogo, não é um debug oculto. */
  _renderHandsStatus(state) {
    const inGame = this.currentScreen === 'play' || this.currentScreen === 'forca-play';
    if (this.handsStatusEl) this.handsStatusEl.classList.toggle('is-open', inGame);
    if (!inGame) return;

    const left = state.leftHand || { present: false, open: false };
    const right = state.rightHand || { present: false };

    // Filtro de renderização: não reescreve as classes e textos se o estado não mudou
    const statusKey = `${left.present}-${left.open}-${right.present}-${state.letter}-${state.leftGateOpen}`;
    if (this._cacheStatusKey === statusKey) return;
    this._cacheStatusKey = statusKey;

    if (this.handLeftState) {
      if (!left.present) {
        this.handLeftState.textContent = 'NÃO DETECTADA';
        this.handLeftState.className = 'hand-status-state mono is-warn';
      } else if (!left.open) {
        this.handLeftState.textContent = 'FECHADA — ABRA A MÃO';
        this.handLeftState.className = 'hand-status-state mono is-warn';
      } else {
        this.handLeftState.textContent = 'ABERTA ✓';
        this.handLeftState.className = 'hand-status-state mono is-ok';
      }
    }

    if (this.handRightState) {
      if (!right.present) {
        this.handRightState.textContent = 'NÃO DETECTADA';
        this.handRightState.className = 'hand-status-state mono is-warn';
      } else if (state.letter) {
        this.handRightState.textContent = state.letter;
        this.handRightState.className = 'hand-status-state mono is-ok';
      } else {
        this.handRightState.textContent = 'DETECTANDO…';
        this.handRightState.className = 'hand-status-state mono is-warn';
      }
    }

    if (this.handDetectedLetter) this.handDetectedLetter.textContent = state.letter || '—';
    if (this.handDetectedConfidence) {
      this.handDetectedConfidence.textContent = state.letter
        ? ` (confiança: ${Math.round((state.score || 0) * 100)}%)`
        : '';
    }

    const needsGate = state.leftGateRequired && !state.leftGateOpen && state.letter;
    if (this.handGateStatus) {
      this.handGateStatus.textContent = needsGate ? '🔒 Abra a mão esquerda para confirmar' : '';
    }
  }

  /* =============================================================== jogo */
  _bindGameEvents() {
    this.game.addEventListener('start', (e) => this._onRoundUpdate(e.detail));
    this.game.addEventListener('newtarget', (e) => {
      this.libras.resetHold();
      this._renderTarget(e.detail);
      this._renderHud(e.detail);
      this._renderTimer(1);
      if (diagnostics.enabled) diagnostics.record('round_start', {
        mode: e.detail.mode, screen: this.currentScreen, round: e.detail.round,
        expected: e.detail.mode === 'word' ? e.detail.target[e.detail.wordIndex] : e.detail.target,
        wordIndex: e.detail.wordIndex, timeLeft: e.detail.timeLeft
      });
    });
    this.game.addEventListener('correct', (e) => {
      if (e.detail.mode === 'word') this._renderTarget(e.detail);
      this._flashCard('is-correct');
      this._toast('ACERTOU! +' + e.detail.gained, 'correct');
      this._renderHud(e.detail);
    });
    this.game.addEventListener('wordcomplete', (e) => { this._renderTarget(e.detail); this._flashCard('is-correct'); this._toast('PALAVRA COMPLETA! +' + e.detail.bonus, 'correct'); this._renderHud(e.detail); });
    this.game.addEventListener('levelup', (e) => { this._toast('SUBIU DE NÍVEL! NÍVEL ' + e.detail.level, 'correct'); this._renderHud(e.detail); });
    this.game.addEventListener('wrong', (e) => { this._flashCard('is-wrong'); this._toast('TENTE NOVAMENTE', 'wrong'); this._renderHud(e.detail); });
    this.game.addEventListener('timeout', (e) => {
      if (diagnostics.enabled) diagnostics.record('game_timeout', {
        mode: e.detail.mode, screen: this.currentScreen, round: e.detail.round,
        expected: e.detail.mode === 'word' ? e.detail.target[e.detail.wordIndex] : e.detail.target,
        wordIndex: e.detail.wordIndex, phase: this.libras.state.recognitionPhase,
        reason: 'timer_expired'
      });
      this._flashCard('is-wrong'); this._toast('TEMPO ESGOTADO', 'wrong'); this._renderHud(e.detail);
    });
    this.game.addEventListener('tick', (e) => this._renderTimer(e.detail.ratio));
    this.game.addEventListener('sessionend', (e) => { if (!this._exitingManually) this._openResults(e.detail, 'game'); });
  }

  /* ============================================================ forca === */
  _bindForcaEvents() {
    this.forca.addEventListener('start', (e) => this._onForcaRoundUpdate(e.detail));
    this.forca.addEventListener('newword', (e) => {
      this.libras.resetHold();
      this._renderForca(e.detail);
      this._renderHud(e.detail);
    });
    this.forca.addEventListener('hit', (e) => {
      this._renderForca(e.detail);
      this._flashCard('is-correct', this.forcaCard);
      this._toast('LETRA CERTA! +' + e.detail.gained, 'correct');
      this._renderHud(e.detail);
    });
    this.forca.addEventListener('miss', (e) => {
      this._renderForca(e.detail);
      this._flashCard('is-wrong', this.forcaCard);
      this._toast('LETRA ERRADA: ' + e.detail.letter, 'wrong');
      this._renderHud(e.detail);
    });
    this.forca.addEventListener('repeated', () => {
      this._toast('VOCÊ JÁ TENTOU ESSA LETRA', 'wrong');
    });
    this.forca.addEventListener('win', (e) => {
      this._renderForca(e.detail, true);
      this._flashCard('is-correct', this.forcaCard);
      this._toast('PALAVRA COMPLETA! +' + e.detail.bonus, 'correct');
      this._renderHud(e.detail);
    });
    this.forca.addEventListener('levelup', (e) => {
      this._toast('SUBIU DE NÍVEL! NÍVEL ' + e.detail.level, 'correct');
      this._renderHud(e.detail);
    });
    this.forca.addEventListener('lose', (e) => {
      this._renderForca(e.detail, true);
      this._flashCard('is-wrong', this.forcaCard);
      this._toast('FORCA COMPLETA — ERA "' + e.detail.word + '"', 'wrong');
      this._renderHud(e.detail);
    });
    this.forca.addEventListener('sessionend', (e) => { if (!this._exitingManually) this._openResults(e.detail, 'forca'); });
  }

  _onForcaRoundUpdate(detail) {
    this._showScreen('forca-play');
    this._renderForca(detail);
    this._renderHud(detail);
  }

  /** @param revealAll mostra a palavra inteira mesmo com letras não
   *  tentadas — usado no fim da rodada (vitória/derrota), pra sempre deixar
   *  claro qual era a palavra. */
  _renderForca(detail, revealAll = false) {
    if (this.forcaEyebrow) this.forcaEyebrow.textContent = `FORCA · NÍVEL ${detail.level} · RODADA ${detail.round}`;
    if (this.forcaHint) this.forcaHint.textContent = '💡 ' + (detail.hint || '—');
    this._renderForcaWord(detail, revealAll);
    this._renderForcaGallows(detail.errors);
    this._renderForcaKeyboard(detail);
    if (this.forcaErrorsCount) this.forcaErrorsCount.textContent = detail.errors;
  }

  _renderForcaWord(detail, revealAll) {
    if (!this.forcaWordEl) return;
    const guessed = new Set(detail.guessed);
    this.forcaWordEl.innerHTML = detail.word.split('').map((ch) => {
      const known = revealAll || guessed.has(ch);
      return `<span class="fletter ${known ? 'is-revealed' : ''}">${known ? ch : ''}</span>`;
    }).join('');
  }

  _renderForcaGallows(errors) {
    if (!this.forcaCard) return;
    this.forcaCard.querySelectorAll('.forca-figure').forEach((el) => {
      el.classList.toggle('is-shown', Number(el.dataset.step) <= errors);
    });
  }

  _renderForcaKeyboard(detail) {
    if (!this.forcaKeyboard) return;
    const guessed = new Set(detail.guessed);
    this.forcaKeyboard.innerHTML = LETTER_POOL.map((letter) => {
      let cls = 'is-pending';
      if (guessed.has(letter)) cls = detail.word.includes(letter) ? 'is-hit' : 'is-miss';
      return `<span class="fkey ${cls}">${letter}</span>`;
    }).join('');
  }

  _onRoundUpdate(detail) {
    this._showScreen('play');
    this._renderTarget(detail);
    this._renderHud(detail);
  }

  _renderTarget(detail) {
    if (this.targetCard) this.targetCard.classList.remove('is-correct', 'is-wrong');
    this._syncPracticeControls(detail.mode, detail.practiceSet);
    if (detail.mode === 'practice') {
      if (this.targetEyebrow) {
        this.targetEyebrow.textContent = detail.practiceSet === 'all'
          ? `TREINO · A–Z · ${detail.practicePosition} DE ${detail.practiceCount}`
          : `TREINO · NÍVEL ${detail.level} · RODADA ${detail.round}`;
      }
      if (this.targetLetterEl) {
        this.targetLetterEl.classList.remove('hidden');
        this.targetLetterEl.textContent = detail.target;
      }
      this._syncPracticeLetters(detail);
      if (this.practiceLetterSelect) this.practiceLetterSelect.value = detail.target;
      if (this.targetWordEl) this.targetWordEl.classList.add('hidden');
      this._renderSchematic(detail.target);
      if (this.targetTip) this.targetTip.textContent = LETTERS[detail.target]?.tip || '';
    } else {
      if (this.targetEyebrow) this.targetEyebrow.textContent = `SOLETRAR · NÍVEL ${detail.level} · RODADA ${detail.round}`;
      if (this.targetLetterEl) this.targetLetterEl.classList.add('hidden');
      if (this.targetWordEl) {
        this.targetWordEl.classList.remove('hidden');
        const word = detail.target;
        this.targetWordEl.innerHTML = word.split('').map((ch, i) => {
          const cls = i < detail.wordIndex ? 'is-done' : (i === detail.wordIndex ? 'is-current' : '');
          return `<span class="wletter ${cls}">${ch}</span>`;
        }).join('');
      }
      // Na última confirmação, wordIndex já vale o comprimento da palavra.
      // O último caractere fica concluído durante os 450 ms de avanço.
      const current = detail.target[Math.min(detail.wordIndex, detail.target.length - 1)];
      this._renderSchematic(current);
      if (this.targetTip) this.targetTip.textContent = LETTERS[current]?.tip || '';
    }
    if (diagnostics.enabled && detail.mode === 'word') diagnostics.record('ui_target', {
      screen: this.currentScreen, mode: 'word', expected: detail.target[detail.wordIndex] ?? null,
      wordIndex: detail.wordIndex, round: detail.round, uiUpdated: true
    });
  }

  /** Atualiza as opções somente quando muda o conjunto ou o nível pedagógico. */
  _syncPracticeLetters(detail) {
    if (!this.practiceLetterSelect) return;
    const key = `${detail.practiceSet}:${detail.level}`;
    if (key === this._practiceSelectKey) return;
    const letters = detail.practiceSet === 'all'
      ? LETTER_POOL
      : LETTER_POOL.filter((letter) => LETTERS[letter].difficulty <= detail.level);
    this.practiceLetterSelect.innerHTML = letters.map((letter) =>
      `<option value="${letter}">${letter}</option>`).join('');
    this._practiceSelectKey = key;
  }

  /** Mantém navegação visível em toda sessão ativa do Treino. */
  _syncPracticeControls(mode = this.game.mode, practiceSet = this.game.practiceSet) {
    const active = this.currentScreen === 'play' && mode === 'practice';
    this.practiceNav?.classList.toggle('hidden', !active);
    this.nextPracticeBtn?.classList.toggle('hidden', !active);
    this.prevPracticeBtn?.classList.toggle('hidden', !active);
    this.practiceJump?.classList.toggle('hidden', !active);
    if (this.prevPracticeBtn) {
      this.prevPracticeBtn.disabled = active && practiceSet === 'level' && this.game.practiceHistoryIndex < 1;
    }
  }

  /** Uma única entrada da UI limpa candidatos/trajetórias após qualquer troca manual válida. */
  _navigatePracticeTarget(destination) {
    if (this.currentScreen !== 'play' || this.game.mode !== 'practice') return;
    if (this.game.navigatePracticeTarget(destination)) this.libras.resetTracking();
  }

  _renderSchematic(letter) {
    if (this.schematicHand) {
      this.schematicHand.innerHTML = this._schematicHtml(LETTERS[letter]?.shape);
    }
  }

  /** Gera o HTML das 5 barrinhas do diagrama esquemático (dedo estendido vs
   *  fechado) a partir do `shape` de uma letra em data.js. Extraído como
   *  função própria pra ser reaproveitado tanto no cartão de jogo (grande)
   *  quanto no guia do alfabeto (compacto), sem duplicar a lógica. */
  _schematicHtml(shape) {
    const s = shape || [0, 0, 0, 0, 0];
    const heights = [34, 48, 56, 50, 40];
    return s.map((on, i) => {
      const h = on ? heights[i] : Math.round(heights[i] * 0.45);
      return `<div class="finger ${on ? 'is-ext' : ''}" style="height:${h}px"></div>`;
    }).join('');
  }

  _renderTimer(ratio) {
    if (this.timerFill) {
      this.timerFill.style.width = `${Math.max(0, ratio) * 100}%`;
      this.timerFill.classList.toggle('is-low', ratio < 0.3);
    }
  }

  _renderHud(detail) {
    if (this.hudScore) this.hudScore.textContent = detail.score ?? this.game.score;
    if (this.hudStreak) this.hudStreak.textContent = detail.streak ?? this.game.streak;
    if (this.hudBest) this.hudBest.textContent = detail.best ?? this.game.best;
  }

  _flashCard(cls, card = this.targetCard) {
    if (!card) return;
    card.classList.remove('is-correct', 'is-wrong');
    void card.offsetWidth;
    card.classList.add(cls);
  }

  _toast(msg, kind) {
    if (!this.feedbackToast) return;
    this.feedbackToast.textContent = msg;
    this.feedbackToast.className = `feedback-toast mono is-visible ${kind}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      if (this.feedbackToast) this.feedbackToast.classList.remove('is-visible');
    }, 1100);
  }

  /* ============================================================ telas --- */
  _showScreen(name) {
    const changed = this.currentScreen !== name;
    this.currentScreen = name;
    diagnostics.setContext(this.game.mode || (name === 'forca-play' ? 'forca' : null), name);
    if (changed && diagnostics.enabled) diagnostics.record('screen_change', {
      screen: name, mode: this.game.mode || (name === 'forca-play' ? 'forca' : null)
    });
    if (changed) {
      // Um sinal iniciado no menu ou em outro modo não pode confirmar na nova tela.
      this.libras.resetTracking();
      this._cacheProgress = null;
      this._cacheLetter = null;
      this._cacheStatusKey = null;
      this._cacheRecognitionPhase = null;
      this._cacheRingPhase = null;
      this._pinchArmed = false;
      this._exitPinchArmed = false;
    }
    if (this.homeEl) this.homeEl.classList.toggle('hidden', name !== 'home');
    if (this.playEl) this.playEl.classList.toggle('is-open', name === 'play');
    if (this.forcaPlayEl) this.forcaPlayEl.classList.toggle('is-open', name === 'forca-play');
    if (this.resultsEl) this.resultsEl.classList.toggle('is-open', name === 'results');
    if (this.exitBtn) this.exitBtn.classList.toggle('hidden', name !== 'play' && name !== 'forca-play');
    this._syncPracticeControls();
    if (this.hintEl) {
      this.hintEl.textContent = name === 'play'
        ? 'Segure o sinal correto até a barra circular completar'
        : name === 'forca-play'
          ? 'Sinalize uma letra e segure até confirmar o palpite'
          : 'Aponte com o dedo indicador e feche a pinça para escolher um cartão';
    }
  }

  startMode(mode, practiceSelection = null) {
    if (this.currentScreen === 'play' || this.currentScreen === 'forca-play') this.exitToHome();
    if (mode === 'practice') this._setPracticeChoice(practiceSelection === 'all');
    const level = mode === 'practice' && practiceSelection === 'all'
      ? 'all'
      : this.pendingLevels[mode] || 1;
    if (mode === 'practice') this.game.startPractice(level);
    else if (mode === 'word') this.game.startWord(level);
    else if (mode === 'forca') this.forca.start(level);
  }

  /** Expõe a seleção no botão e nos níveis, inclusive para leitores de tela. */
  _setPracticeChoice(allSelected) {
    this.practiceAllBtn?.classList.toggle('is-selected', allSelected);
    this.practiceAllBtn?.setAttribute('aria-pressed', String(allSelected));
    this.practiceLevelDots.forEach((dot) => {
      const selected = !allSelected && Number(dot.dataset.level) === this.pendingLevels.practice;
      dot.classList.toggle('is-active', selected);
      dot.setAttribute('aria-pressed', String(selected));
    });
  }

  /** A saída manual suprime a tela de resultados emitida por sessionend.
   * Os motores não encerram a sessão automaticamente por número de rodadas;
   * este fluxo retorna ao menu, mantendo câmera e inferência em execução.
   */
  exitToHome() {
    this._exitingManually = true;
    if (this.currentScreen === 'forca-play') this.forca.end();
    else this.game.end();
    this._exitingManually = false;
    this._showScreen('home');
  }

  _openResults(detail, source = 'game') {
    const isForca = source === 'forca';
    const l1 = $('#results-label-1');
    const l2 = $('#results-label-2');
    const sc = $('#results-score');
    const st = $('#results-streak');
    const rd = $('#results-rounds');
    const bt = $('#results-best');

    if (l1) l1.textContent = isForca ? 'PALAVRAS ACERTADAS' : 'MELHOR SEQUÊNCIA';
    if (l2) l2.textContent = 'RODADAS';
    if (sc) sc.textContent = detail.score;
    if (st) st.textContent = isForca ? detail.wins : detail.bestStreak;
    if (rd) rd.textContent = detail.round;
    if (bt) bt.textContent = detail.best;
    this._showScreen('results');
  }

  /* =========================================================== guia --- */
  _buildReference() {
    const groups = [
      {
        title: 'LETRAS SÓLIDAS',
        desc: 'Formas bem distintas entre si — as mais confiáveis de reconhecer.',
        letters: LETTER_POOL.filter((l) => LETTERS[l].difficulty === 1 && !MOTION_LETTERS.includes(l))
      },
      {
        title: 'LETRAS ESTÁTICAS',
        desc: 'Também são uma "foto" única da mão, mas algumas se parecem entre si (ex.: M/N/S/T, G/Q, K/P) — capriche na posição do polegar e no ângulo da mão.',
        letters: LETTER_POOL.filter((l) => LETTERS[l].difficulty >= 2 && !MOTION_LETTERS.includes(l))
      },
      {
        title: 'GESTOS COM MOVIMENTO',
        desc: 'Essas duas não são uma pose parada — são um trajeto no ar. Forme a pose-base e desenhe o movimento (gancho no J, zigue-zague no Z) sem soltar a mão da câmera.',
        letters: LETTER_POOL.filter((l) => MOTION_LETTERS.includes(l))
      }
    ].filter((g) => g.letters.length > 0);

    const container = $('#reference-grid');
    if (container) {
      container.innerHTML = groups.map((group) => `
        <div class="reference-group">
          <h4 class="mono reference-group-title">${group.title}</h4>
          <p class="reference-group-desc">${group.desc}</p>
          <div class="reference-grid">
            ${group.letters.map((letter) => this._referenceItemHtml(letter)).join('')}
          </div>
        </div>
      `).join('');
    }
  }

  _referenceItemHtml(letter) {
    const isMotion = MOTION_LETTERS.includes(letter);
    return `
      <div class="ref-item">
        <div class="letter mono">${letter}</div>
        <div class="schematic-hand is-compact">${this._schematicHtml(LETTERS[letter].shape)}</div>
        <p>${LETTERS[letter].tip}</p>
        ${isMotion ? '<span class="ref-motion-tag mono">🎥 MOVIMENTO</span>' : ''}
      </div>
    `;
  }

  toggleReference(force) {
    const open = force ?? !this.referenceEl?.classList.contains('is-open');
    if (this.referenceEl) this.referenceEl.classList.toggle('is-open', open);
  }

  /** Alterna a captura voluntária e o painel, apagando eventos ao fechar. */
  toggleDiag() {
    this.diagOpen = !this.diagOpen;
    if (this.diagOpen) diagnostics.enable();
    else diagnostics.disable();
    if (this.diagEl) this.diagEl.classList.toggle('is-open', this.diagOpen);
    this._renderDiagnostics(true);
  }

  /** Atualiza o painel no máximo a cada 200 ms; não cria loop nem serializa por frame. */
  _renderDiagnostics(force = false) {
    if (!this.diagOpen || !this.diagJson) return;
    const now = performance.now();
    if (!force && now - this._lastDiagRenderAt < 200) return;
    this._lastDiagRenderAt = now;
    this.diagJson.textContent = JSON.stringify(diagnostics.read().events.slice(-8), null, 2);
  }

  /* ================================================ fallback mouse/toque */
  _bindMouseFallback() {
    // Seleção de modos e níveis
    document.querySelectorAll('.mode-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.level-dot') || e.target.closest('.practice-all-option') ||
            e.target.closest('.practice-level-start')) return;
        this.startMode(card.dataset.mode);
      });
      card.querySelectorAll('.level-dot').forEach((dot) => {
        dot.addEventListener('click', () => {
          const mode = card.dataset.mode;
          this.pendingLevels[mode] = Number(dot.dataset.level);
          if (mode === 'practice') this._setPracticeChoice(false);
          else card.querySelectorAll('.level-dot').forEach((d) => d.classList.toggle('is-active', d === dot));
        });
      });
    });
    this.practiceAllBtn?.addEventListener('click', () => this.startMode('practice', 'all'));
    this.practiceStartBtn?.addEventListener('click', () => this.startMode('practice'));

    // Botões do Guia do Alfabeto
    $('#help-btn')?.addEventListener('click', () => this.toggleReference(true));
    $('#home-guide-btn')?.addEventListener('click', () => this.toggleReference(true));
    $('#reference-close')?.addEventListener('click', () => this.toggleReference(false));

    // Botão Sair da rodada
    $('#exit-btn')?.addEventListener('click', () => this.exitToHome());

    // Botões e seletor compartilham o mesmo fluxo seguro de mudança de alvo.
    this.nextPracticeBtn?.addEventListener('click', () => this._navigatePracticeTarget(1));
    this.prevPracticeBtn?.addEventListener('click', () => this._navigatePracticeTarget(-1));
    this.practiceLetterSelect?.addEventListener('change', () =>
      this._navigatePracticeTarget(this.practiceLetterSelect.value));

    // Botões da tela de Resultados
    $('#results-restart')?.addEventListener('click', () => this._showScreen('home'));
    $('#results-home')?.addEventListener('click', () => this._showScreen('home'));
    $('#results-rankings')?.addEventListener('click', () => {
      this._showScreen('home');
      $('#rankings')?.classList.add('is-open');
    });

    // Modal de Identificação do Jogador
    const playerModal = $('#player-modal');
    const nameInput = $('#player-name-input');
    const startBtn = $('#player-modal-start');

    startBtn?.addEventListener('click', () => {
      const playerName = nameInput?.value.trim() || 'JOGADOR';
      const hudPlayer = $('#hud-player');
      if (hudPlayer) hudPlayer.textContent = playerName;
      playerModal?.classList.add('hidden');
    });

    // Modal de Pontuações / Ranking
    $('#home-rankings-btn')?.addEventListener('click', () => {
      $('#rankings')?.classList.add('is-open');
    });
    $('#rankings-close')?.addEventListener('click', () => {
      $('#rankings')?.classList.remove('is-open');
    });

    // Tecla Esc e Atalhos
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { 
        this.toggleReference(false); 
        $('#rankings')?.classList.remove('is-open');
        if (this.currentScreen === 'play' || this.currentScreen === 'forca-play') this.exitToHome(); 
      }
      if (e.key === 'd') this.toggleDiag();
    });
  }

  /* ============================================= navegação por gesto --- */
  _onCursorFrame({ cursor, pinch, fist }) {
    // Coordenadas normalizadas da imagem; o recorte object-fit do vídeo não é compensado.
    if (!this.cursorEl) return;

    if (cursor) {
      const x = cursor.x * window.innerWidth;
      const y = cursor.y * window.innerHeight;
      this.cursorEl.style.left = `${x}px`;
      this.cursorEl.style.top = `${y}px`;
      this.cursorEl.classList.toggle('is-pinch', pinch);
      this.cursorEl.style.opacity = '1';
    } else {
      this.cursorEl.style.opacity = '0';
    }

    if (this.currentScreen === 'home' && cursor) {
      let found = null;
      document.querySelectorAll('.mode-card').forEach((card) => {
        const r = card.getBoundingClientRect();
        const cx = cursor.x * window.innerWidth;
        const cy = cursor.y * window.innerHeight;
        const inside = cx > r.left && cx < r.right && cy > r.top && cy < r.bottom;
        card.classList.toggle('is-hover', inside);
        if (inside) found = card;
      });
      if (found && pinch && !this._pinchArmed) {
        this._pinchArmed = true;
        this.startMode(found.dataset.mode);
      }
      if (!pinch) this._pinchArmed = false;
    }

    if (this.currentScreen === 'play' || this.currentScreen === 'forca-play') {
      if (cursor && this.exitBtn) {
        const cx = cursor.x * window.innerWidth;
        const cy = cursor.y * window.innerHeight;
        const r = this.exitBtn.getBoundingClientRect();
        const insideExit = cx > r.left && cx < r.right && cy > r.top && cy < r.bottom;
        this.exitBtn.classList.toggle('is-hover', insideExit);
        if (insideExit && pinch && !this._exitPinchArmed) {
          this._exitPinchArmed = true;
          this.exitToHome();
        }
        if (!pinch) this._exitPinchArmed = false;
      } else if (this.exitBtn) {
        this.exitBtn.classList.remove('is-hover');
      }
    }

    if (this.currentScreen !== 'play' && this.currentScreen !== 'forca-play') {
      if (fist && this._fistArmed !== true) {
        this._fistArmed = true;
        if (this.referenceEl?.classList.contains('is-open')) this.toggleReference(false);
      }
      if (!fist) this._fistArmed = false;
    }
  }
}
