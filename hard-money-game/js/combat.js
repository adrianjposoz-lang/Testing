// Combat System - fights, timer, questions, hints, damage
import { QUESTIONS } from './questions.js';
import { BOSS_DATA } from './cutscenes.js';
import { audio } from './audio.js';
import { state, combat, showScreen, saveGame, getFrame, anim } from './engine.js';

// ── Start Fight ──
export function startFight(stageNum) {
    const boss = BOSS_DATA[stageNum];
    if (!boss) return;

    combat.bossStage = stageNum;
    combat.bossHp = boss.hp;
    combat.bossMaxHp = boss.hp;
    // Scale player HP: base 5, +1 at stage 5, +1 at stage 8
    const bonusHp = (stageNum >= 8 ? 2 : stageNum >= 5 ? 1 : 0);
    combat.playerHp = 5 + bonusHp;
    combat.playerMaxHp = 5 + bonusHp;
    combat.combo = 0;
    combat.maxCombo = 0;
    combat.goldEarned = 0;
    combat.questionsAnswered = 0;
    combat.hintsRemaining = 1;
    combat.shieldsRemaining = state.inventory.shield_block > 0 ? 1 : 0;
    combat.bonusTime = state.inventory.potion_time > 0 ? 5 : 0;
    combat.goldMultiplier = state.inventory.gold_charm > 0 ? 1.25 : 1;
    combat.isAnswering = false;
    combat.showingExplanation = false;
    combat.eliminatedIndex = -1;
    combat.questionIndex = 0;

    // Check rubber banding - died twice on this boss = extra hint
    const deaths = state.deathsPerStage[stageNum] || 0;
    if (deaths >= 2) {
        combat.hintsRemaining = 99; // unlimited hints
    }

    // Get and shuffle questions for this stage
    const stageQuestions = QUESTIONS.filter(q => q.stage === stageNum);
    combat.fightQuestions = shuffleArray([...stageQuestions]);

    // Consume consumables used
    if (combat.shieldsRemaining > 0) state.inventory.shield_block--;
    if (combat.bonusTime > 0) state.inventory.potion_time--;
    if (combat.goldMultiplier > 1) state.inventory.gold_charm--;

    // Update HUD
    const bossNameEl = document.getElementById('boss-name');
    bossNameEl.textContent = boss.name;
    document.getElementById('stage-indicator').textContent = `Stage ${stageNum}`;
    document.getElementById('hud-player-name').textContent = `Sir ${state.playerName}`;
    document.getElementById('combat-gold').textContent = state.gold;

    updateHpBars();
    updateHintButton();
    showScreen('combat');

    try { audio.stopMusic(); audio.playBattleMusic(); } catch(e) {}

    // Show boss taunt
    showBossTaunt(boss.taunt);

    // Delay first question so player reads the taunt
    setTimeout(() => nextQuestion(), 2000);
}

// ── Next Question ──
export function nextQuestion() {
    if (combat.bossHp <= 0 || combat.playerHp <= 0) return;

    // Cycle through questions, reshuffle if needed
    if (combat.questionIndex >= combat.fightQuestions.length) {
        combat.fightQuestions = shuffleArray([...combat.fightQuestions]);
        combat.questionIndex = 0;
    }

    const q = combat.fightQuestions[combat.questionIndex];
    combat.currentQuestion = q;
    combat.questionIndex++;
    combat.isAnswering = true;
    combat.showingExplanation = false;
    combat.eliminatedIndex = -1;

    // Display question
    document.getElementById('question-text').textContent = q.question;
    document.getElementById('explanation-box').classList.add('hidden');

    // Setup answer buttons
    const container = document.getElementById('answers-container');
    container.innerHTML = '';
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.dataset.index = i;
        btn.textContent = opt;
        btn.addEventListener('click', () => selectAnswer(i));
        container.appendChild(btn);
    });

    // Start timer
    startTimer();
}

// ── Timer ──
function startTimer() {
    combat.timerValue = combat.timerMax + combat.bonusTime;
    const timerFill = document.getElementById('timer-fill');
    const timerText = document.getElementById('timer-text');
    const totalTime = combat.timerValue;

    timerFill.style.width = '100%';
    timerFill.classList.remove('timer-danger');
    timerText.textContent = Math.ceil(combat.timerValue);

    clearInterval(combat.timerInterval);
    combat.timerInterval = setInterval(() => {
        combat.timerValue -= 0.1;
        const pct = (combat.timerValue / totalTime) * 100;
        timerFill.style.width = Math.max(0, pct) + '%';
        timerText.textContent = Math.ceil(Math.max(0, combat.timerValue));

        if (combat.timerValue <= 5 && combat.timerValue > 0) {
            timerFill.classList.add('timer-danger');
            if (Math.floor(combat.timerValue * 10) % 10 === 0) {
                try { audio.playTimerTick(); } catch(e) {}
            }
        }

        if (combat.timerValue <= 3 && combat.timerValue > 0) {
            try { audio.playHeartbeat(); } catch(e) {}
        }

        if (combat.timerValue <= 0) {
            clearInterval(combat.timerInterval);
            if (combat.isAnswering) {
                timeOut();
            }
        }
    }, 100);
}

function stopTimer() {
    clearInterval(combat.timerInterval);
}

// ── Answer Selection ──
export function selectAnswer(index) {
    if (!combat.isAnswering || combat.showingExplanation) return;
    combat.isAnswering = false;
    stopTimer();

    const q = combat.currentQuestion;
    const correct = index === q.correctIndex;

    combat.questionsAnswered++;
    state.totalAnswered++;

    // Highlight buttons
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === q.correctIndex) btn.classList.add('correct');
        if (i === index && !correct) btn.classList.add('wrong');
    });

    if (correct) {
        onCorrectAnswer();
    } else {
        onWrongAnswer(q);
    }
}

function timeOut() {
    combat.isAnswering = false;
    combat.questionsAnswered++;
    state.totalAnswered++;

    const q = combat.currentQuestion;
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === q.correctIndex) btn.classList.add('correct');
    });

    onWrongAnswer(q);
}

// ── Correct Answer ──
function onCorrectAnswer() {
    state.totalCorrect++;
    combat.combo++;
    if (combat.combo > combat.maxCombo) combat.maxCombo = combat.combo;
    if (combat.combo > state.bestCombo) state.bestCombo = combat.combo;

    // Calculate damage
    let damage = 1;
    let goldGain = 5 + combat.combo;
    let isCritical = false;

    if (combat.combo >= 5) {
        // Critical hit!
        damage = 2;
        goldGain += 15;
        isCritical = true;
        try { audio.playCritical(); } catch(e) {}
        shakeScreen();
        showComboText('CRITICAL HIT!', '#ff4444');
        if (!state.titles.includes('The Unstoppable') && combat.combo >= 10) {
            state.titles.push('The Unstoppable');
        }
    } else if (combat.combo >= 3) {
        goldGain += 8;
        try { audio.playCombo(); } catch(e) {}
        showComboText(`COMBO x${combat.combo}!`, '#ffdd00');
    } else {
        try { audio.playSlash(); setTimeout(() => audio.playGoldPickup(), 150); } catch(e) {}
    }

    // Apply gold multiplier
    goldGain = Math.floor(goldGain * (combat.goldMultiplier || 1));

    // Deal damage to boss
    combat.bossHp = Math.max(0, combat.bossHp - damage);
    combat.goldEarned += goldGain;
    state.gold += goldGain;

    // Trigger attack animation - knight lunges, boss flashes
    anim.knightAttack = 12;
    anim.bossHit = 18;
    anim.showSlash = true;
    anim.slashX = 560;
    anim.slashY = 280;
    anim.slashFrame = 10;

    updateHpBars();
    document.getElementById('combat-gold').textContent = state.gold;
    spawnDamageNumber(`-${damage}`, 560, 250, 'boss', isCritical);
    flashScreen('green');

    // Check boss death
    if (combat.bossHp <= 0) {
        spawnBossParticles();
        shakeScreen();
        setTimeout(() => onBossDefeated(), 1000);
    } else {
        setTimeout(() => nextQuestion(), 1200);
    }
}

// ── Wrong Answer ──
function onWrongAnswer(q) {
    combat.combo = 0;

    // Check shield
    if (combat.shieldsRemaining > 0) {
        combat.shieldsRemaining--;
        showComboText('SHIELD BLOCKED!', '#4488ff');
        try { audio.playMenuSelect(); } catch(e) {}
    } else {
        const bossDmg = BOSS_DATA[combat.bossStage].baseDamage || 1;
        combat.playerHp = Math.max(0, combat.playerHp - bossDmg);
        try { audio.playHit(); } catch(e) {}
        // Trigger boss attack animation - boss lunges, player flashes
        anim.bossAttack = 12;
        anim.playerHit = 18;
        spawnDamageNumber(`-${bossDmg}`, 150, 330, 'player', false);
        flashScreen('red');
    }

    updateHpBars();
    hideComboCounter();

    // Show explanation with CONTINUE button - let player read at their own pace
    combat.showingExplanation = true;
    const explBox = document.getElementById('explanation-box');
    const explText = document.getElementById('explanation-text');
    explText.textContent = q.explanation;
    explBox.classList.remove('hidden');

    // Add continue button
    let continueBtn = document.getElementById('btn-explanation-continue');
    if (!continueBtn) {
        continueBtn = document.createElement('button');
        continueBtn.id = 'btn-explanation-continue';
        continueBtn.className = 'pixel-btn explanation-continue';
        continueBtn.textContent = 'CONTINUE';
        explBox.appendChild(continueBtn);
    } else {
        continueBtn.style.display = 'block';
    }

    // Check player death
    if (combat.playerHp <= 0) {
        continueBtn.textContent = 'CONTINUE';
        continueBtn.onclick = () => {
            explBox.classList.add('hidden');
            continueBtn.style.display = 'none';
            onPlayerDeath();
        };
    } else {
        continueBtn.onclick = () => {
            explBox.classList.add('hidden');
            continueBtn.style.display = 'none';
            try { audio.playMenuSelect(); } catch(e) {}
            nextQuestion();
        };
    }
}

// ── Boss Defeated ──
function onBossDefeated() {
    stopTimer();
    try {
        audio.stopMusic();
        audio.playBossDeath();
        setTimeout(() => audio.playVictoryFanfare(), 500);
    } catch(e) {}

    const boss = BOSS_DATA[combat.bossStage];
    showBossTaunt(boss.defeat);
    const bonusGold = boss.goldReward;
    state.gold += bonusGold;
    combat.goldEarned += bonusGold;
    state.totalKills++;

    // Mark stage complete
    if (!state.endlessMode) {
        state.completedStages.add(combat.bossStage);
        state.codexUnlocked.add(combat.bossStage);
        if (state.currentStage === combat.bossStage && state.currentStage < 10) {
            state.currentStage++;
        }
    } else {
        state.endlessRound++;
        if (state.endlessRound > state.endlessHighScore) {
            state.endlessHighScore = state.endlessRound;
        }
    }

    // Show victory screen
    document.getElementById('victory-title').textContent = state.endlessMode
        ? `ROUND ${state.endlessRound} CLEAR!`
        : 'VICTORY!';
    document.getElementById('gold-earned').textContent = `+${combat.goldEarned} Gold`;
    document.getElementById('fragment-topic').textContent = boss.topic;
    document.getElementById('fragment-recovered').style.display = state.endlessMode ? 'none' : 'block';
    document.getElementById('battle-stats').innerHTML =
        `Questions: ${state.totalCorrect}/${combat.questionsAnswered} correct<br>` +
        `Best Combo: ${combat.maxCombo}x`;

    saveGame();
    showScreen('victory');
}

// ── Player Death ──
function onPlayerDeath() {
    stopTimer();
    try { audio.stopMusic(); audio.playGameOver(); } catch(e) {}

    const boss = BOSS_DATA[combat.bossStage];
    state.deathsPerStage[combat.bossStage] = (state.deathsPerStage[combat.bossStage] || 0) + 1;

    document.getElementById('death-message').textContent = boss.deathMessage;

    if (state.endlessMode) {
        document.getElementById('death-message').textContent =
            `You survived ${state.endlessRound} rounds! ${boss.deathMessage}`;
    }

    showScreen('death');
}

// ── Hint System ──
export function useHint() {
    if (!combat.isAnswering || combat.showingExplanation) return;
    if (combat.currentQuestion.type === 'true_false') return; // Can't eliminate on 2 options

    // Check if we have hints
    if (combat.hintsRemaining > 0) {
        combat.hintsRemaining--;
    } else if (state.inventory.scroll_hint > 0) {
        state.inventory.scroll_hint--;
    } else {
        return; // No hints available
    }

    // Eliminate one wrong answer
    const q = combat.currentQuestion;
    const buttons = document.querySelectorAll('.answer-btn');
    const wrongIndices = [];
    buttons.forEach((btn, i) => {
        if (i !== q.correctIndex && !btn.disabled) {
            wrongIndices.push(i);
        }
    });

    if (wrongIndices.length > 0) {
        const removeIdx = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
        buttons[removeIdx].disabled = true;
        buttons[removeIdx].classList.add('eliminated');
        combat.eliminatedIndex = removeIdx;
    }

    updateHintButton();
    try { audio.playMenuSelect(); } catch(e) {}
}

// ── Use Health Potion ──
export function useHealthPotion() {
    if (state.inventory.potion_hp <= 0 || combat.playerHp >= combat.playerMaxHp) return;
    state.inventory.potion_hp--;
    combat.playerHp = Math.min(combat.playerMaxHp, combat.playerHp + 1);
    updateHpBars();
    try { audio.playGoldPickup(); } catch(e) {}
    showComboText('+1 HP', '#22ff44');
}

// ── UI Updates ──
function updateHpBars() {
    const bossPercent = (combat.bossHp / combat.bossMaxHp) * 100;
    const playerPercent = (combat.playerHp / combat.playerMaxHp) * 100;
    document.getElementById('boss-hp-fill').style.width = bossPercent + '%';
    document.getElementById('player-hp-fill').style.width = playerPercent + '%';
    document.getElementById('hp-text').textContent = `${combat.playerHp}/${combat.playerMaxHp}`;
}

function updateHintButton() {
    const btn = document.getElementById('btn-hint');
    const totalHints = combat.hintsRemaining + state.inventory.scroll_hint;
    if (combat.hintsRemaining >= 99) {
        btn.textContent = 'HINT (∞)';
    } else if (totalHints > 0) {
        btn.textContent = `HINT (${totalHints})`;
    } else {
        btn.textContent = 'NO HINTS';
        btn.disabled = true;
    }
}

function hideComboCounter() {
    document.getElementById('combo-counter').classList.add('hidden');
}

// ── Visual Effects ──
function showComboText(text, color) {
    const counter = document.getElementById('combo-counter');
    const textEl = document.getElementById('combo-text');
    counter.classList.remove('hidden');
    textEl.textContent = text;
    textEl.style.color = color;
    counter.classList.remove('combo-animate');
    void counter.offsetWidth; // force reflow
    counter.classList.add('combo-animate');
}

function spawnDamageNumber(text, x, y, type, critical) {
    const container = document.getElementById('damage-numbers');
    const el = document.createElement('div');
    el.className = `damage-number ${type}${critical ? ' critical' : ''}`;
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    container.appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

function flashScreen(color) {
    const container = document.getElementById('game-container');
    container.classList.add(`flash-${color}`);
    setTimeout(() => container.classList.remove(`flash-${color}`), 300);
}

function shakeScreen() {
    const container = document.getElementById('game-container');
    container.classList.add('shake');
    setTimeout(() => container.classList.remove('shake'), 400);
}

// ── Boss Taunts ──
function showBossTaunt(text) {
    const tauntEl = document.getElementById('boss-taunt');
    if (!tauntEl) return;
    tauntEl.textContent = `"${text}"`;
    tauntEl.classList.remove('hidden');
    tauntEl.classList.remove('taunt-fade');
    void tauntEl.offsetWidth;
    tauntEl.classList.add('taunt-fade');
    setTimeout(() => tauntEl.classList.add('hidden'), 3000);
}

// Boss defeat particle explosion
export function spawnBossParticles() {
    const container = document.getElementById('damage-numbers');
    if (!container) return;
    const colors = ['#ff4444', '#ffaa00', '#ffdd00', '#ff6600', '#ffffff'];
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'boss-particle';
        const angle = (i / 20) * Math.PI * 2;
        const speed = 60 + Math.random() * 80;
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed;
        particle.style.left = '560px';
        particle.style.top = '280px';
        particle.style.background = colors[i % colors.length];
        particle.style.setProperty('--dx', dx + 'px');
        particle.style.setProperty('--dy', dy + 'px');
        container.appendChild(particle);
        setTimeout(() => particle.remove(), 800);
    }
}

// ── Utilities ──
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ── Flee from combat ──
export function fleeFight() {
    stopTimer();
    combat.isAnswering = false;
    try { audio.stopMusic(); } catch(e) {}
}

// ── Endless Mode ──
let lastEndlessStage = -1;

export function startEndlessFight() {
    state.endlessMode = true;
    state.endlessRound++;
    // Pick a random stage, avoid repeating the same boss
    let randomStage;
    do {
        randomStage = Math.floor(Math.random() * 10) + 1;
    } while (randomStage === lastEndlessStage && state.endlessRound > 1);
    lastEndlessStage = randomStage;
    startFight(randomStage);
}
