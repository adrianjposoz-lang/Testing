// Combat System - fights, timer, questions, hints, damage
import { QUESTIONS, STAGE_TOPICS } from './questions.js';
import { BOSS_DATA } from './cutscenes.js';
import { audio } from './audio.js';
import { state, combat, showScreen, saveGame, getFrame, anim, hasSkill } from './engine.js';

const LEADERBOARD_API = 'https://script.google.com/macros/s/AKfycbwZ5zTYKgZEa0OB7aXUQ3u_WsUfNWVtWELmtXz6sf0remx4P4-CcBaSS0jAevLSNKgl/exec';

// ── Submit Boss Progress to Google Sheets ──
function submitBossProgress(bossStage, result) {
    const boss = BOSS_DATA[bossStage];
    if (!boss || state.endlessMode) return;
    const totalDeaths = Object.values(state.deathsPerStage || {}).reduce((a, b) => a + b, 0);
    const accuracy = combat.questionsAnswered > 0
        ? Math.round(((combat.questionsAnswered - combat.wrongAnswers) / combat.questionsAnswered) * 100)
        : 0;
    const payload = {
        type: 'progress',
        name: state.playerName,
        stage: bossStage,
        boss: boss.name,
        result: result,
        accuracy: accuracy + '%',
        questionsRight: combat.questionsAnswered - combat.wrongAnswers,
        questionsTotal: combat.questionsAnswered,
        hpRemaining: result === 'WIN' ? combat.playerHp + '/' + combat.playerMaxHp : '0/' + combat.playerMaxHp,
        deaths: totalDeaths,
        deathsThisBoss: state.deathsPerStage[bossStage] || 0,
        gold: state.gold,
        time: formatProgressTime(state.totalPlaytime || 0)
    };
    fetch(LEADERBOARD_API, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(() => {});
}

function formatProgressTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

// ── Start Fight ──
export function startFight(stageNum) {
    const boss = BOSS_DATA[stageNum];
    if (!boss) return;

    combat.bossStage = stageNum;
    combat.bossHp = boss.hp;
    combat.bossMaxHp = boss.hp;
    // Max HP is always 5
    const newMaxHp = 5;
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

    // Skill tree bonuses
    if (hasSkill('scholars_focus')) combat.timerMax += 2;
    if (hasSkill('sage_wisdom')) combat.hintsRemaining++;
    if (hasSkill('legendary_knight')) combat.shieldsRemaining++;
    if (hasSkill('treasure_hunter')) combat.goldMultiplier += 0.15;
    if (hasSkill('golden_touch')) combat.goldMultiplier += 0.25;
    combat.xpEarned = 0;
    // mechanicState skill bonuses are set after boss mechanic init below

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

    try { audio.stopMusic(); audio.playBossBattleMusic(stageNum); } catch(e) {}

    // Boss mechanic state
    combat.mechanicState = {};
    combat.mechanicState.firstWrongProtected = hasSkill('battle_hardened');
    combat.mechanicState.phoenixUsed = false;
    const mechanic = boss.mechanic;
    if (mechanic) {
        switch (mechanic.type) {
            case 'shell_shield':
                combat.mechanicState.shieldHits = 0;
                break;
            case 'escrow_hold':
                combat.mechanicState.heldGold = 0;
                combat.mechanicState.lastCorrect = false;
                break;
            case 'rising_ashes':
                combat.mechanicState.hasRevived = false;
                break;
            case 'compounding_fury':
                combat.mechanicState.timerPenalty = 0;
                break;
            case 'penalty_interest':
                combat.mechanicState.wrongCount = 0;
                break;
            case 'two_heads':
                combat.mechanicState.rapidFire = false;
                break;
        }
    }

    // Show boss intro, then taunt, then mechanic announcement
    showBossIntro(boss.intro);
    setTimeout(() => showBossTaunt(boss.taunt), 1800);
    if (boss.mechanicAnnounce) {
        setTimeout(() => showMechanicAnnounce(boss.mechanicAnnounce), 2800);
    }
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

    // Display question with topic hint (Master Lender skill shows topic)
    const topicLabel = document.getElementById('question-topic');
    if (topicLabel) {
        topicLabel.textContent = hasSkill('master_lender') ? (STAGE_TOPICS[combat.bossStage] || '') : '';
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

    // Boss mechanic: post-render effects on answer buttons
    const boss = BOSS_DATA[combat.bossStage];
    if (boss && boss.mechanic) {
        const mType = boss.mechanic.type;

        if (mType === 'phantom_shuffle') {
            // After 3 seconds, re-shuffle the answer button texts and handlers
            combat._phantomTimer = setTimeout(() => {
                if (!combat.isAnswering) return;
                const btns = document.querySelectorAll('.answer-btn');
                if (btns.length < 2) return;
                // Collect current data
                const data = Array.from(btns).map(btn => ({
                    text: btn.textContent,
                    index: parseInt(btn.dataset.index)
                }));
                // Shuffle
                for (let i = data.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [data[i], data[j]] = [data[j], data[i]];
                }
                // Apply shuffled data back
                btns.forEach((btn, i) => {
                    btn.textContent = data[i].text;
                    btn.dataset.index = data[i].index;
                    // Replace click handler - use cloneNode(false) to strip old handlers
                    const newBtn = btn.cloneNode(false);
                    newBtn.textContent = data[i].text;
                    newBtn.addEventListener('click', () => selectAnswer(data[i].index));
                    btn.parentNode.replaceChild(newBtn, btn);
                });
                showMechanicAnnounce('Answers shuffled!');
            }, 3000);
        }

        if (mType === 'market_crash') {
            // Hide a random non-correct answer for 4 seconds
            const btns = document.querySelectorAll('.answer-btn');
            const hideable = Array.from(btns).filter(btn => parseInt(btn.dataset.index) !== q.correctIndex);
            if (hideable.length > 0) {
                const hideBtn = hideable[Math.floor(Math.random() * hideable.length)];
                hideBtn.style.visibility = 'hidden';
                combat._marketCrashTimer = setTimeout(() => {
                    hideBtn.style.visibility = 'visible';
                }, 4000);
            }
        }
    }
}

// ── Timer ──
function startTimer() {
    // Boss rage: timer shortens when boss HP is below 30%
    const bossHpPercent = combat.bossHp / combat.bossMaxHp;
    const rageReduction = bossHpPercent < 0.3 ? 3 : 0;
    let timerBase = combat.timerMax + combat.bonusTime - rageReduction;

    // risk_frenzy: 30% timer reduction when boss HP below 30%
    const boss = BOSS_DATA[combat.bossStage];
    if (boss && boss.mechanic && boss.mechanic.type === 'risk_frenzy' && bossHpPercent < 0.3) {
        timerBase = Math.floor(timerBase * 0.7);
    }

    // Appraiser's Eye: +3 seconds on Stage 4+ questions
    if (hasSkill('appraisers_eye') && combat.bossStage >= 4) {
        timerBase += 3;
    }

    combat.timerValue = Math.max(5, timerBase);
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
    // Clear any pending mechanic timers
    if (combat._phantomTimer) { clearTimeout(combat._phantomTimer); combat._phantomTimer = null; }
    if (combat._marketCrashTimer) { clearTimeout(combat._marketCrashTimer); combat._marketCrashTimer = null; }
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
    buttons.forEach((btn) => {
        btn.disabled = true;
        const btnIdx = parseInt(btn.dataset.index);
        if (btnIdx === q.correctIndex) btn.classList.add('correct');
        if (btnIdx === index && !correct) btn.classList.add('wrong');
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
    buttons.forEach((btn) => {
        btn.disabled = true;
        const btnIdx = parseInt(btn.dataset.index);
        if (btnIdx === q.correctIndex) btn.classList.add('correct');
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

    // XP from correct answer
    combat.xpEarned += 10 + (combat.combo * 5);
    // Quick Study: +5% gold bonus
    const quickStudyMult = hasSkill('quick_study') ? 1.05 : 1;

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

    // Berserker: 3+ combo deals double damage
    if (hasSkill('berserker') && combat.combo >= 3 && !isCritical) {
        damage *= 2;
    }

    // Apply gold multiplier + Quick Study
    goldGain = Math.floor(goldGain * (combat.goldMultiplier || 1) * quickStudyMult);

    // Boss mechanic: shell_shield — first 2 hits do 50% damage
    const bossMech = BOSS_DATA[combat.bossStage] && BOSS_DATA[combat.bossStage].mechanic;
    if (bossMech && bossMech.type === 'shell_shield' && combat.mechanicState.shieldHits < 2) {
        combat.mechanicState.shieldHits++;
        damage = Math.max(1, Math.floor(damage * 0.5));
        showMechanicAnnounce('Shell Shield absorbs some damage!');
    }

    // Boss mechanic: escrow_hold — hold gold, pay double on consecutive correct
    if (bossMech && bossMech.type === 'escrow_hold') {
        if (combat.mechanicState.lastCorrect && combat.mechanicState.heldGold > 0) {
            // Consecutive correct: pay out held gold + current gold
            goldGain += combat.mechanicState.heldGold;
            showMechanicAnnounce('Escrow released! Double payout!');
            combat.mechanicState.heldGold = 0;
        } else {
            // First correct (or non-consecutive): hold gold in escrow
            combat.mechanicState.heldGold = goldGain;
            goldGain = 0;
            showMechanicAnnounce('Gold held in escrow...');
        }
        combat.mechanicState.lastCorrect = true;
    }

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
        // Boss mechanic: rising_ashes — revive once with 2 HP
        if (bossMech && bossMech.type === 'rising_ashes' && !combat.mechanicState.hasRevived) {
            combat.mechanicState.hasRevived = true;
            combat.bossHp = 2;
            updateHpBars();
            shakeScreen();
            showBossTaunt('THE PHOENIX RISES!');
            showMechanicAnnounce('The Phoenix rises from the ashes with renewed fury!');
            setTimeout(() => nextQuestion(), 1500);
        } else {
            spawnBossParticles();
            shakeScreen();
            setTimeout(() => onBossDefeated(), 1000);
        }
    } else {
        // Boss mechanic: two_heads — 30% chance to skip pause and rapid fire next question
        if (bossMech && bossMech.type === 'two_heads' && Math.random() < 0.3) {
            showMechanicAnnounce('The Hydra attacks again!');
            setTimeout(() => nextQuestion(), 400);
        } else {
            setTimeout(() => nextQuestion(), 1200);
        }
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

    // Boss mechanic: wrong answer effects
    const wrongBoss = BOSS_DATA[combat.bossStage];
    const wrongMech = wrongBoss && wrongBoss.mechanic;
    if (wrongMech) {
        if (wrongMech.type === 'greedy_grab') {
            const stolenGold = Math.min(5, state.gold);
            state.gold = Math.max(0, state.gold - stolenGold);
            document.getElementById('combat-gold').textContent = state.gold;
            if (stolenGold > 0) {
                spawnGoldNumber(`-${stolenGold}`);
                showMechanicAnnounce(`The Goblin steals ${stolenGold} gold!`);
            }
        }
        if (wrongMech.type === 'compounding_fury') {
            combat.mechanicState.timerPenalty++;
            combat.timerMax = Math.max(5, combat.timerMax - 1);
            showMechanicAnnounce(`Timer reduced! ${combat.timerMax}s remaining...`);
        }
        if (wrongMech.type === 'penalty_interest') {
            combat.mechanicState.wrongCount++;
            if (combat.mechanicState.wrongCount > 1) {
                const extraDmg = combat.mechanicState.wrongCount - 1;
                combat.playerHp = Math.max(0, combat.playerHp - extraDmg);
                state.persistentHp = combat.playerHp;
                spawnDamageNumber(`-${extraDmg}`, 150, 300, 'player', false);
                showMechanicAnnounce(`Penalty interest! +${extraDmg} extra damage!`);
            }
        }
        if (wrongMech.type === 'escrow_hold') {
            if (combat.mechanicState.heldGold > 0) {
                showMechanicAnnounce(`Escrow forfeited! Lost ${combat.mechanicState.heldGold} held gold!`);
                combat.mechanicState.heldGold = 0;
            }
            combat.mechanicState.lastCorrect = false;
        }
    }

    // Add to persistent mistake journal (avoid duplicates for same question in same fight)
    const existingEntry = state.mistakeJournal.find(e => e.questionId === q.id);
    if (existingEntry) {
        existingEntry.reviewedWrong++;
        existingEntry.lastMissed = Date.now();
        existingEntry.yourAnswer = selectedAnswer;
    } else {
        state.mistakeJournal.push({
            questionId: q.id,
            stage: q.stage,
            question: q.question,
            yourAnswer: selectedAnswer,
            correctAnswer: q.options[q.correctIndex],
            explanation: q.explanation,
            timestamp: Date.now(),
            lastMissed: Date.now(),
            reviewedCorrect: 0,
            reviewedWrong: 1
        });
    }

    // Battle Hardened: first wrong answer deals 0 damage
    if (combat.mechanicState.firstWrongProtected) {
        combat.mechanicState.firstWrongProtected = false;
        showComboText('IRON WILL!', '#4488ff');
        try { audio.playMenuSelect(); } catch(e) {}
    // Check shield
    } else if (combat.shieldsRemaining > 0) {
        combat.shieldsRemaining--;
        showComboText('SHIELD BLOCKED!', '#4488ff');
        try { audio.playMenuSelect(); } catch(e) {}
    } else {
        const rawDmg = BOSS_DATA[combat.bossStage].baseDamage || 1;
        let bossDmg = Math.round(rawDmg * (combat.baseDamageMultiplier || 1));
        // Iron Will: reduce damage taken by 1 (minimum 1)
        if (hasSkill('iron_will') && bossDmg > 1) bossDmg--;
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

    // Phoenix Heart: survive death once per fight
    if (combat.playerHp <= 0 && hasSkill('phoenix_heart') && !combat.mechanicState.phoenixUsed) {
        combat.mechanicState.phoenixUsed = true;
        combat.playerHp = 1;
        state.persistentHp = 1;
        updateHpBars();
        showComboText('PHOENIX HEART SAVES YOU!', '#ff8800');
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

    // Award XP
    combat.xpEarned += 50; // boss defeat bonus
    if (combat.isPerfect) combat.xpEarned += 30; // perfect bonus
    state.xp += combat.xpEarned;
    state.totalXp += combat.xpEarned;

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
    document.getElementById('gold-earned').innerHTML = `+${combat.goldEarned} Gold &nbsp; <span style="color:#aa88ff">+${combat.xpEarned} XP</span>`;
    document.getElementById('fragment-topic').textContent = boss.topic;
    document.getElementById('fragment-recovered').style.display = state.endlessMode ? 'none' : 'block';
    // HP remaining display with color coding
    const hpPct = combat.playerHp / combat.playerMaxHp;
    const hpColor = hpPct <= 0.3 ? '#ff4444' : hpPct <= 0.6 ? '#ffaa44' : '#66cc66';
    document.getElementById('battle-stats').innerHTML =
        `Questions: ${combat.questionsAnswered - combat.wrongAnswers}/${combat.questionsAnswered} correct<br>` +
        `Best Combo: ${combat.maxCombo}x<br>` +
        `<span style="color:${hpColor}">HP Remaining: ${combat.playerHp}/${combat.playerMaxHp}</span><br>` +
        `<span style="color:#88bbff">+${combat.xpEarned} XP earned</span><br>` +
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

    submitBossProgress(combat.bossStage, 'WIN');
    saveGame();
    showScreen('victory');
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

    // Contextual death tip
    document.getElementById('death-tip').textContent = getDeathTip();

    submitBossProgress(combat.bossStage, 'DIED');
    showScreen('death');
}

function getDeathTip() {
    const tips = [];

    // Contextual tips based on player state
    if (state.inventory.potion_hp === 0) {
        tips.push('💡 Tip: Health Potions from the shop restore 1 HP mid-fight. Stock up before tough battles!');
    }
    if (state.inventory.shield_block === 0 && !state.ownedItems.has('shield_block')) {
        tips.push('💡 Tip: Magic Shields from the shop can block one wrong answer — a lifesaver on hard bosses.');
    }
    if (state.inventory.scroll_hint === 0 && combat.hintsRemaining < 99) {
        tips.push('💡 Tip: Hint Scrolls eliminate a wrong answer. Buy them from the shop for tricky questions.');
    }
    if (combat.maxCombo < 3) {
        tips.push('💡 Tip: Answer 3 in a row for a Combo bonus. 5 in a row = Critical Hit for double damage!');
    }
    if (state.equipment.armor === 'basic') {
        tips.push('💡 Tip: Better armor from the shop gives you more max HP. Chainmail and Plate Armor help you survive longer.');
    }
    if (state.equipment.sword === 'basic') {
        tips.push('💡 Tip: Upgrading your sword at the shop increases critical hit damage. Flame Sword and Frost Blade deal +1 crit damage.');
    }
    if ((state.deathsPerStage[combat.bossStage] || 0) >= 2) {
        tips.push('💡 Tip: Died twice on this boss? You now get unlimited hints! Use them to eliminate wrong answers.');
    }
    if (state.inventory.potion_time === 0) {
        tips.push('💡 Tip: Time Elixirs add +5 seconds to your timer for the whole fight. Great for reading-heavy questions.');
    }
    if (combat.wrongAnswers > combat.questionsAnswered * 0.6) {
        tips.push('💡 Tip: Visit the Codex from the map to review topics. Studying the material helps you answer faster!');
    }

    // General fallback tips
    tips.push('💡 Tip: Take your time reading each question carefully. Wrong answers hurt more than slow answers.');
    tips.push('💡 Tip: Gold carries over between fights. Save up for powerful gear and potions.');

    // Pick one contextual tip (prefer specific ones over general)
    return tips[0];
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
    buttons.forEach((btn) => {
        const btnIdx = parseInt(btn.dataset.index);
        if (btnIdx !== q.correctIndex && !btn.disabled) {
            wrongIndices.push(btnIdx);
        }
    });

    if (wrongIndices.length > 0) {
        const removeIdx = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
        // Find the button with this dataset.index (may differ from DOM position after shuffle)
        const targetBtn = Array.from(buttons).find(b => parseInt(b.dataset.index) === removeIdx);
        if (targetBtn) {
            targetBtn.disabled = true;
            targetBtn.classList.add('eliminated');
        }
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
    state.persistentHp = combat.playerHp;
    updateHpBars();
    updatePotionButton();
    try { audio.playGoldPickup(); } catch(e) {}
    showComboText('+1 HP', '#22ff44');
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
        btn.disabled = false;
    } else if (totalHints > 0) {
        btn.textContent = `HINT (${totalHints})`;
        btn.disabled = false;
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

// ── Boss Mechanic Announcement ──
function showMechanicAnnounce(text) {
    const el = document.getElementById('boss-mechanic-text');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    setTimeout(() => el.classList.add('hidden'), 3000);
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
