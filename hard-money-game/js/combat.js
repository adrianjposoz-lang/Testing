// Combat System - fights, timer, questions, hints, damage
import { QUESTIONS, STAGE_TOPICS } from './questions.js';
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
    // Scale max HP: base 5, +1 at stage 5, +1 at stage 8
    // Equipment bonuses: plate/golden armor = +1 HP, horned helmet = +1 HP
    const bonusHp = (stageNum >= 8 ? 2 : stageNum >= 5 ? 1 : 0);
    const armorHp = (state.equipment.armor === 'plate' || state.equipment.armor === 'golden') ? 1 : 0;
    const helmetHp = (state.equipment.helmet === 'horned') ? 1 : 0;
    const newMaxHp = 5 + bonusHp + armorHp + helmetHp;
    combat.playerMaxHp = newMaxHp;
    state.persistentMaxHp = newMaxHp;
    // Persistent HP: carry over from previous fights, capped at new max
    if (state.persistentHp <= 0 || state.persistentHp > newMaxHp) {
        combat.playerHp = newMaxHp;
    } else {
        combat.playerHp = state.persistentHp;
    }
    state.persistentHp = combat.playerHp;
    combat.combo = 0;
    combat.maxCombo = 0;
    combat.goldEarned = 0;
    combat.questionsAnswered = 0;
    combat.hintsRemaining = 1;
    combat.shieldsRemaining = state.inventory.shield_block > 0 ? 1 : 0;
    combat.bonusTime = state.inventory.potion_time > 0 ? 5 : 0;
    // Gold multiplier: gold charm + golden sword bonus
    const usedGoldCharm = state.inventory.gold_charm > 0;
    let goldMult = usedGoldCharm ? 1.25 : 1;
    if (state.equipment.sword === 'golden') goldMult += 0.1;
    // Golden set bonus: all 3 golden items = +25% gold extra
    const goldenPieces = [state.equipment.sword === 'golden', state.equipment.armor === 'golden', state.equipment.helmet === 'gold'].filter(Boolean).length;
    if (goldenPieces >= 3) goldMult += 0.25;
    combat.goldMultiplier = goldMult;
    combat.isAnswering = false;
    combat.showingExplanation = false;
    combat.eliminatedIndex = -1;
    combat.questionIndex = 0;
    combat.wrongAnswers = 0;
    combat.missedQuestions = [];
    combat.answerTimes = [];
    combat._rageShown = false;

    // Apply difficulty settings
    const diff = state.settings.difficulty || 'normal';
    if (diff === 'easy') {
        combat.timerMax = 20;
        combat.baseDamageMultiplier = 1;
    } else if (diff === 'hard') {
        combat.timerMax = 10;
        combat.baseDamageMultiplier = 2;
    } else {
        combat.timerMax = 15;
        combat.baseDamageMultiplier = 1;
    }

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
    if (usedGoldCharm) state.inventory.gold_charm--;

    // Update HUD
    const bossNameEl = document.getElementById('boss-name');
    bossNameEl.textContent = boss.name;
    document.getElementById('stage-indicator').textContent = `Stage ${stageNum}`;
    document.getElementById('hud-player-name').textContent = `Sir ${state.playerName}`;
    document.getElementById('combat-gold').textContent = state.gold;

    updateHpBars();
    updateHintButton();
    updatePotionButton();
    showScreen('combat');

    try { audio.stopMusic(); audio.playBattleMusic(); } catch(e) {}

    // Show boss intro, then taunt
    showBossIntro(boss.intro);
    setTimeout(() => showBossTaunt(boss.taunt), 1800);
    setTimeout(() => nextQuestion(), 3500);
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

    // Boss rage warning
    const bossHpPct = combat.bossHp / combat.bossMaxHp;
    if (bossHpPct < 0.3 && !combat._rageShown) {
        combat._rageShown = true;
        showComboText('BOSS ENRAGED!', '#ff2200');
    }

    // Display question with topic hint
    const topicLabel = document.getElementById('question-topic');
    if (topicLabel) {
        topicLabel.textContent = STAGE_TOPICS[combat.bossStage] || '';
    }
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
    combat.questionStartTime = Date.now();
    startTimer();
}

// ── Timer ──
function startTimer() {
    // Boss rage: timer shortens when boss HP is below 30%
    const bossHpPercent = combat.bossHp / combat.bossMaxHp;
    const rageReduction = bossHpPercent < 0.3 ? 3 : 0;
    combat.timerValue = Math.max(5, combat.timerMax + combat.bonusTime - rageReduction);
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
        onWrongAnswer(q, q.options[index]);
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

    onWrongAnswer(q, 'Time ran out');
}

// ── Correct Answer ──
function onCorrectAnswer() {
    const answerTime = (Date.now() - (combat.questionStartTime || Date.now())) / 1000;
    combat.answerTimes.push(answerTime);
    state.totalCorrect++;
    combat.combo++;
    if (combat.combo > combat.maxCombo) combat.maxCombo = combat.combo;
    if (combat.combo > state.bestCombo) state.bestCombo = combat.combo;

    // Calculate damage
    let damage = 1;
    let goldGain = 5 + combat.combo;
    let isCritical = false;

    if (combat.combo >= 5) {
        // Critical hit! Special swords deal bonus damage
        damage = 2;
        if (state.equipment.sword === 'flame' || state.equipment.sword === 'ice') damage = 3;
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
    updatePotionButton();
    document.getElementById('combat-gold').textContent = state.gold;
    spawnDamageNumber(`-${damage}`, 560, 250, 'boss', isCritical);
    spawnHpBarDamage(damage, 'boss', isCritical);
    spawnGoldNumber(`+${goldGain}`);
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
function onWrongAnswer(q, selectedAnswer) {
    combat.combo = 0;
    combat.wrongAnswers++;
    combat.missedQuestions.push({
        question: q.question,
        yourAnswer: selectedAnswer,
        correctAnswer: q.options[q.correctIndex],
        explanation: q.explanation
    });

    // Check shield
    if (combat.shieldsRemaining > 0) {
        combat.shieldsRemaining--;
        showComboText('SHIELD BLOCKED!', '#4488ff');
        try { audio.playMenuSelect(); } catch(e) {}
    } else {
        const rawDmg = BOSS_DATA[combat.bossStage].baseDamage || 1;
        const bossDmg = rawDmg * (combat.baseDamageMultiplier || 1);
        combat.playerHp = Math.max(0, combat.playerHp - bossDmg);
        state.persistentHp = combat.playerHp;
        try { audio.playHit(); } catch(e) {}
        // Trigger boss attack animation - boss lunges, player flashes
        anim.bossAttack = 12;
        anim.playerHit = 18;
        spawnDamageNumber(`-${bossDmg}`, 150, 330, 'player', false);
        spawnHpBarDamage(bossDmg, 'player', false);
        flashScreen('red');
    }

    updateHpBars();
    updatePotionButton();
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

    // Sync persistent HP after victory
    state.persistentHp = combat.playerHp;

    const boss = BOSS_DATA[combat.bossStage];
    showBossTaunt(boss.defeat);
    const bonusGold = boss.goldReward;
    state.gold += bonusGold;
    combat.goldEarned += bonusGold;
    state.totalKills++;

    // Perfect bonus - no wrong answers
    combat.isPerfect = combat.wrongAnswers === 0 && combat.questionsAnswered >= 3;
    if (combat.isPerfect) {
        const perfectGold = Math.floor(bonusGold * 0.5);
        state.gold += perfectGold;
        combat.goldEarned += perfectGold;
        if (!state.titles.includes('The Flawless')) {
            state.titles.push('The Flawless');
        }
    }

    // Check achievements
    checkAchievements();

    // Mark stage complete
    if (!state.endlessMode) {
        state.completedStages.add(combat.bossStage);
        state.codexUnlocked.add(combat.bossStage);
        if (state.currentStage === combat.bossStage && state.currentStage < 10) {
            state.currentStage++;
        }
    } else {
        // endlessRound is already incremented in startEndlessFight()
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
    // HP remaining display with color coding
    const hpPct = combat.playerHp / combat.playerMaxHp;
    const hpColor = hpPct <= 0.3 ? '#ff4444' : hpPct <= 0.6 ? '#ffaa44' : '#66cc66';
    document.getElementById('battle-stats').innerHTML =
        `Questions: ${combat.questionsAnswered - combat.wrongAnswers}/${combat.questionsAnswered} correct<br>` +
        `Best Combo: ${combat.maxCombo}x<br>` +
        `<span style="color:${hpColor}">HP Remaining: ${combat.playerHp}/${combat.playerMaxHp}</span><br>` +
        (combat.isPerfect ? `<div class="perfect-bonus">PERFECT! +${Math.floor(boss.goldReward * 0.5)} bonus gold!</div>` : '') +
        `<span class="boss-defeat-quote">"${boss.defeat}"</span>`;

    // Wrong answer review
    const reviewEl = document.getElementById('missed-review');
    const listEl = document.getElementById('missed-list');
    if (combat.missedQuestions.length > 0) {
        reviewEl.classList.remove('hidden');
        listEl.innerHTML = combat.missedQuestions.map(m =>
            `<div class="missed-item">` +
            `<div class="missed-q">${m.question}</div>` +
            `<div class="missed-wrong">Your answer: ${m.yourAnswer}</div>` +
            `<div class="missed-correct">Correct: ${m.correctAnswer}</div>` +
            `<div class="missed-explain">${m.explanation}</div>` +
            `</div>`
        ).join('');
    } else {
        reviewEl.classList.add('hidden');
        listEl.innerHTML = '';
    }

    // Codex notification
    if (!state.endlessMode) {
        const notif = document.createElement('div');
        notif.className = 'codex-notif';
        notif.textContent = 'New Codex entry unlocked!';
        document.getElementById('victory-screen').appendChild(notif);
        setTimeout(() => notif.remove(), 4000);
    }

    saveGame();
    showScreen('victory');
    try { audio.playVictoryFanfare(); } catch(e) {}
}

// ── Player Death ──
function onPlayerDeath() {
    stopTimer();
    try { audio.stopMusic(); audio.playGameOver(); } catch(e) {}

    // Reset persistent HP on death - player starts fresh
    state.persistentHp = state.persistentMaxHp;

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
    combat.playerHp = Math.min(combat.playerMaxHp, combat.playerHp + 2);
    state.persistentHp = combat.playerHp;
    updateHpBars();
    updatePotionButton();
    try { audio.playGoldPickup(); } catch(e) {}
    showComboText('+2 HP', '#22ff44');
    spawnHealParticles();
    flashScreen('heal');
}

// ── UI Updates ──
function updateHpBars() {
    const bossPercent = (combat.bossHp / combat.bossMaxHp) * 100;
    const playerPercent = (combat.playerHp / combat.playerMaxHp) * 100;
    const bossFill = document.getElementById('boss-hp-fill');
    bossFill.style.width = bossPercent + '%';
    // Boss rage visual
    bossFill.classList.toggle('enraged', bossPercent < 30);
    document.getElementById('player-hp-fill').style.width = playerPercent + '%';
    document.getElementById('hp-text').textContent = `${combat.playerHp}/${combat.playerMaxHp}`;
}

export function updatePotionButton() {
    const btn = document.getElementById('btn-potion');
    if (!btn) return;
    const count = state.inventory.potion_hp || 0;
    if (count > 0 && combat.playerHp < combat.playerMaxHp) {
        btn.textContent = `POTION (${count})`;
        btn.disabled = false;
    } else if (count > 0) {
        btn.textContent = `POTION (${count})`;
        btn.disabled = true; // full HP
    } else {
        btn.textContent = 'NO POTIONS';
        btn.disabled = true;
    }
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

function spawnGoldNumber(text) {
    const goldEl = document.getElementById('combat-gold');
    if (!goldEl) return;
    const container = document.getElementById('damage-numbers');
    const rect = goldEl.getBoundingClientRect();
    const containerRect = document.getElementById('game-container').getBoundingClientRect();
    const x = rect.left - containerRect.left + rect.width / 2;
    const y = rect.top - containerRect.top;
    const el = document.createElement('div');
    el.className = 'gold-float-number';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    container.appendChild(el);
    setTimeout(() => el.remove(), 1400);
}

function spawnHpBarDamage(amount, type, critical) {
    const barId = type === 'boss' ? 'boss-hp-fill' : 'player-hp-fill';
    const bar = document.getElementById(barId);
    if (!bar) return;
    const barRect = bar.parentElement.getBoundingClientRect();
    const containerRect = document.getElementById('game-container').getBoundingClientRect();
    // Position on the HP bar itself
    const x = barRect.left - containerRect.left + barRect.width * 0.5;
    const y = barRect.top - containerRect.top;
    const el = document.createElement('div');
    el.className = `hp-bar-damage${critical ? ' critical' : ''}`;
    el.textContent = `-${amount}`;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.getElementById('damage-numbers').appendChild(el);
    setTimeout(() => el.remove(), 1200);
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

// ── Heal Particles ──
function spawnHealParticles() {
    const container = document.getElementById('damage-numbers');
    if (!container) return;
    const colors = ['#22ff44', '#44ff66', '#88ffaa', '#00dd33', '#66ffcc'];
    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = 'heal-particle';
        const angle = (i / 15) * Math.PI * 2;
        const speed = 40 + Math.random() * 60;
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed - 40; // bias upward
        particle.style.left = '150px';
        particle.style.top = '330px';
        particle.style.background = colors[i % colors.length];
        particle.style.setProperty('--dx', dx + 'px');
        particle.style.setProperty('--dy', dy + 'px');
        container.appendChild(particle);
        setTimeout(() => particle.remove(), 900);
    }
}

// ── Boss Intro ──
function showBossIntro(text) {
    const tauntEl = document.getElementById('boss-taunt');
    if (!tauntEl) return;
    tauntEl.textContent = text;
    tauntEl.style.borderColor = '#aa8844';
    tauntEl.style.color = '#ccbbaa';
    tauntEl.classList.remove('hidden');
    tauntEl.classList.remove('taunt-fade');
    void tauntEl.offsetWidth;
    tauntEl.classList.add('taunt-fade');
    setTimeout(() => {
        tauntEl.style.borderColor = '';
        tauntEl.style.color = '';
    }, 1800);
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

// ── Achievement System ──
function checkAchievements() {
    const t = state.titles;
    const add = (title) => { if (!t.includes(title)) t.push(title); };

    // Speed Demon — answered any question in under 3 seconds
    if (combat.answerTimes.some(t => t < 3)) add('Speed Demon');
    // Lightning Reflexes — answered any question in under 1.5 seconds
    if (combat.answerTimes.some(t => t < 1.5)) add('Lightning Reflexes');
    // Moneybags — accumulated 500+ gold total
    if (state.gold >= 500) add('Moneybags');
    // Wealthy — accumulated 1000+ gold total
    if (state.gold >= 1000) add('The Wealthy');
    // Scholar — unlocked full codex
    if (state.codexUnlocked.size >= 10) add('The Scholar');
    // Survivor — won a fight with exactly 1 HP
    if (combat.playerHp === 1) add('The Survivor');
    // Dragon Slayer — beat stage 10
    if (state.completedStages.has(10)) add('Dragon Slayer');
    // Shopaholic — own 8+ items
    if (state.ownedItems.size >= 8) add('Shopaholic');
    // Persistent — died 5+ times total
    const totalDeaths = Object.values(state.deathsPerStage).reduce((a, b) => a + b, 0);
    if (totalDeaths >= 5) add('The Persistent');
    // Golden Set — equip all golden gear
    const goldenSet = state.equipment.sword === 'golden' && state.equipment.armor === 'golden' && state.equipment.helmet === 'gold';
    if (goldenSet) add('Golden Knight');
    // Combo Master — 7+ combo in a single fight
    if (combat.maxCombo >= 7) add('Combo Master');
    // Endless Warrior — reach round 5 in endless mode
    if (state.endlessRound >= 5) add('Endless Warrior');
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
