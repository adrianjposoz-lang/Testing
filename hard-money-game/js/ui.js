// UI System - Shop, Map, Cutscenes, Codex, Settings, event wiring
import { state, combat, showScreen, saveGame, loadGame, getMapNodePos, init as engineInit, hasSkill } from './engine.js';
import { startFight, useHint, useHealthPotion, updatePotionButton, selectAnswer, startEndlessFight, fleeFight } from './combat.js';
import { BOSS_DATA, INTRO_CUTSCENE, ENDING_CUTSCENE, CODEX_ENTRIES } from './cutscenes.js';
import { SHOP_ITEMS, getRandomQuote } from './shop.js';
import { QUESTIONS, STAGE_TOPICS } from './questions.js';
import { drawKnight, drawShopkeeper, drawBoss, drawBackground, drawGoldCoin } from './sprites.js';
import { audio } from './audio.js';
import { SaveSystem } from './save.js';
import { MAP_EVENTS } from './events.js';
import { DEAL_SCENARIOS } from './deals.js';

let cutsceneQueue = [];
let cutsceneIndex = 0;
let typewriterInterval = null;
let typewriterDone = false;
let cutsceneCallback = null;
let shopkeeperClicks = 0;
let shopPreviewFrame = 0;
let shopPreviewInterval = null;

// ── Initialize Everything ──
export function bootGame() {
    engineInit();
    wireEvents();
    showScreen('title');
    // Title music starts on first click (audio needs user interaction)
    document.addEventListener('click', () => {
        try {
            audio.init();
            if (state.screen === 'title') audio.playTitleMusic();
        } catch(e) {}
    }, { once: true });
}

// ── Wire All Event Listeners ──
function wireEvents() {
    // Title
    document.getElementById('btn-start').addEventListener('click', onStartClick);

    // Name input
    document.getElementById('btn-name-confirm').addEventListener('click', onNameConfirm);
    document.getElementById('player-name-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') onNameConfirm();
    });

    // Tutorial
    document.getElementById('btn-tutorial-continue').addEventListener('click', onTutorialContinue);

    // Cutscene
    document.getElementById('cutscene-overlay').addEventListener('click', advanceCutscene);
    document.getElementById('btn-skip-cutscene').addEventListener('click', skipCutscene);

    // Map
    document.getElementById('btn-shop-from-map').addEventListener('click', () => openShop());
    document.getElementById('btn-codex').addEventListener('click', openCodex);
    document.getElementById('btn-study').addEventListener('click', openStudyMode);
    document.getElementById('btn-glossary').addEventListener('click', openGlossary);
    document.getElementById('btn-journal').addEventListener('click', openJournal);
    document.getElementById('btn-close-journal').addEventListener('click', () => { try { audio.playMenuSelect(); } catch(e) {} showScreen('map'); });
    document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings'));
    document.getElementById('btn-skills').addEventListener('click', openSkillTree);
    document.getElementById('btn-close-skills').addEventListener('click', () => { try { audio.playMenuSelect(); } catch(e) {} showScreen('map'); });

    // Map Events
    document.getElementById('btn-event-continue').addEventListener('click', onEventContinue);

    // Deal Simulator
    document.getElementById('btn-deals').addEventListener('click', openDealSimulator);
    document.getElementById('btn-close-deals').addEventListener('click', () => { try { audio.playMenuSelect(); } catch(e) {} showScreen('map'); });
    document.getElementById('btn-deal-next').addEventListener('click', onDealNext);

    // Map node clicks - use canvas click
    document.getElementById('map-screen').addEventListener('click', onMapClick);

    // Combat
    document.getElementById('btn-hint').addEventListener('click', useHint);
    document.getElementById('btn-potion').addEventListener('click', useHealthPotion);
    document.getElementById('btn-flee').addEventListener('click', onFlee);
    document.getElementById('btn-mute').addEventListener('click', toggleMute);

    // Victory
    document.getElementById('btn-victory-continue').addEventListener('click', onVictoryContinue);
    document.getElementById('btn-return-map').addEventListener('click', onReturnToMap);

    // Death
    document.getElementById('btn-retry').addEventListener('click', onRetry);
    document.getElementById('btn-death-map').addEventListener('click', onReturnToMap);

    // Shop
    document.getElementById('btn-leave-shop').addEventListener('click', leaveShop);
    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.addEventListener('click', () => switchShopTab(tab.dataset.tab));
    });

    // Codex
    document.getElementById('btn-close-codex').addEventListener('click', () => showScreen('map'));

    // Stats
    document.getElementById('btn-stats').addEventListener('click', openStats);
    document.getElementById('btn-close-stats').addEventListener('click', () => { try { audio.playMenuSelect(); } catch(e) {} showScreen('map'); });

    // Study Mode
    document.getElementById('btn-close-study').addEventListener('click', () => { try { audio.playMenuSelect(); } catch(e) {} showScreen('map'); });

    // Glossary
    document.getElementById('btn-close-glossary').addEventListener('click', () => { try { audio.playMenuSelect(); } catch(e) {} showScreen('map'); });
    document.getElementById('glossary-search').addEventListener('input', filterGlossary);

    // Leaderboard
    document.getElementById('btn-leaderboard').addEventListener('click', () => openLeaderboard('map'));
    document.getElementById('btn-close-leaderboard').addEventListener('click', closeLeaderboard);
    document.getElementById('btn-complete-leaderboard').addEventListener('click', () => openLeaderboard('complete'));

    // Settings
    document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
    document.getElementById('master-volume').addEventListener('input', e => {
        state.settings.masterVolume = e.target.value / 100;
        try { audio.setMasterVolume(state.settings.masterVolume); } catch(er) {}
    });
    document.getElementById('music-volume').addEventListener('input', e => {
        state.settings.musicVolume = e.target.value / 100;
        try { audio.setMusicVolume(state.settings.musicVolume); } catch(er) {}
    });
    document.getElementById('sfx-volume').addEventListener('input', e => {
        state.settings.sfxVolume = e.target.value / 100;
        try { audio.setSfxVolume(state.settings.sfxVolume); } catch(er) {}
    });
    document.getElementById('skip-cutscenes').addEventListener('change', e => {
        state.settings.skipCutscenes = e.target.checked;
    });
    document.getElementById('difficulty-select').addEventListener('change', e => {
        state.settings.difficulty = e.target.value;
    });

    // Complete screen
    document.getElementById('btn-endless').addEventListener('click', () => {
        state.endlessMode = true;
        state.endlessRound = 0;
        startEndlessFight();
    });
    document.getElementById('btn-share').addEventListener('click', shareVictory);

    // Reset game
    document.getElementById('btn-reset-game').addEventListener('click', showResetConfirm);

    // Init audio on first interaction
    document.addEventListener('click', () => {
        try { audio.init(); } catch(e) {}
    }, { once: true });
}

// ── Title Screen ──
function onStartClick() {
    try { audio.init(); audio.stopMusic(); audio.playMenuSelect(); } catch(e) {}

    if (SaveSystem.hasSave()) {
        loadGame();
        applySettings();
        showScreen('map');
        try { audio.playMapMusic(); } catch(e) {}
    } else {
        showScreen('name_input');
    }
}

// ── Name Input ──
function onNameConfirm() {
    const input = document.getElementById('player-name-input');
    const name = input.value.trim() || 'Knight';
    state.playerName = name;
    try { audio.playMenuSelect(); } catch(e) {}

    // Tycoon skill: start new games with 50 bonus gold
    if (hasSkill('tycoon')) {
        state.gold += 50;
    }

    // Show tutorial screen before starting the intro cutscene
    showScreen('tutorial');
}

function onTutorialContinue() {
    try { audio.playMenuSelect(); } catch(e) {}
    // After tutorial, start the intro cutscene
    if (state.settings.skipCutscenes) {
        showScreen('map');
        try { audio.playMapMusic(); } catch(e) {}
    } else {
        playCutscene(INTRO_CUTSCENE, () => {
            showScreen('map');
            try { audio.playMapMusic(); } catch(e) {}
        });
    }
}

// ── Cutscene System ──
function playCutscene(cards, callback) {
    cutsceneQueue = cards;
    cutsceneIndex = 0;
    cutsceneCallback = callback;
    showScreen('cutscene');
    showCutsceneCard();
}

function showCutsceneCard() {
    if (cutsceneIndex >= cutsceneQueue.length) {
        endCutscene();
        return;
    }

    const card = cutsceneQueue[cutsceneIndex];
    const speakerEl = document.getElementById('cutscene-speaker');
    const textEl = document.getElementById('cutscene-text');
    const promptEl = document.getElementById('cutscene-prompt');

    // Replace {NAME} placeholder
    const text = card.text.replace('{NAME}', state.playerName);
    speakerEl.textContent = card.speaker || '';
    textEl.textContent = '';
    promptEl.style.opacity = '0';
    typewriterDone = false;

    // Draw cutscene background
    const cCanvas = document.getElementById('cutscene-canvas');
    const cCtx = cCanvas.getContext('2d');
    cCtx.imageSmoothingEnabled = false;
    drawCutsceneScene(cCtx, card.scene || '', cCanvas.width, cCanvas.height);

    // Typewriter effect
    let charIndex = 0;
    clearInterval(typewriterInterval);
    typewriterInterval = setInterval(() => {
        if (charIndex < text.length) {
            textEl.textContent += text[charIndex];
            charIndex++;
            try { audio.playTypewriter(); } catch(e) {}
        } else {
            clearInterval(typewriterInterval);
            typewriterDone = true;
            promptEl.style.opacity = '1';
        }
    }, 40);
}

function advanceCutscene(e) {
    // Don't advance if clicking skip button
    if (e.target.id === 'btn-skip-cutscene') return;

    if (!typewriterDone) {
        // Finish typing immediately
        clearInterval(typewriterInterval);
        const card = cutsceneQueue[cutsceneIndex];
        const text = card.text.replace('{NAME}', state.playerName);
        document.getElementById('cutscene-text').textContent = text;
        document.getElementById('cutscene-prompt').style.opacity = '1';
        typewriterDone = true;
        return;
    }

    cutsceneIndex++;
    showCutsceneCard();
}

function skipCutscene() {
    clearInterval(typewriterInterval);
    endCutscene();
}

function endCutscene() {
    clearInterval(typewriterInterval);
    if (cutsceneCallback) {
        cutsceneCallback();
        cutsceneCallback = null;
    }
}

// Pre-computed random positions for cutscene elements (avoids flicker from Math.random() in draw loop)
const _cutsceneRubble = Array.from({length: 12}, () => ({x: Math.random() * 300, y: Math.random() * 30, w: 8 + Math.random() * 15, h: 6 + Math.random() * 10}));
const _cutsceneSparkles = Array.from({length: 20}, () => ({x: Math.random() * 240, y: Math.random() * 200}));

function drawCutsceneScene(ctx, scene, w, h) {
    // Simple scene backgrounds
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    switch (scene) {
        case 'kingdom_peaceful':
            // Sky gradient
            const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
            skyGrad.addColorStop(0, '#1a3a6a');
            skyGrad.addColorStop(1, '#4a88cc');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, w, h * 0.6);
            // Sun
            ctx.fillStyle = '#ffdd44';
            ctx.beginPath(); ctx.arc(650, 60, 35, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,221,68,0.2)';
            ctx.beginPath(); ctx.arc(650, 60, 55, 0, Math.PI * 2); ctx.fill();
            // Clouds
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(80, 40, 80, 16); ctx.fillRect(90, 30, 60, 14); ctx.fillRect(100, 50, 40, 10);
            ctx.fillRect(500, 70, 70, 14); ctx.fillRect(510, 62, 50, 12);
            // Distant mountains
            ctx.fillStyle = '#3a6a3a';
            for (let i = 0; i < 8; i++) {
                const mx = i * 120 - 40;
                const mh = 50 + Math.sin(i * 1.2) * 30;
                ctx.beginPath(); ctx.moveTo(mx, h*0.6); ctx.lineTo(mx+60, h*0.6-mh); ctx.lineTo(mx+120, h*0.6); ctx.fill();
            }
            // Rolling green hills
            ctx.fillStyle = '#44aa44';
            ctx.fillRect(0, h * 0.6, w, h * 0.4);
            ctx.fillStyle = '#3a9a3a';
            ctx.beginPath(); ctx.ellipse(200, h*0.6, 200, 30, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(600, h*0.6, 180, 25, 0, 0, Math.PI*2); ctx.fill();
            // Castle - main keep
            ctx.fillStyle = '#9999bb';
            ctx.fillRect(310, 100, 180, 200);
            // Castle towers
            ctx.fillStyle = '#8888aa';
            ctx.fillRect(290, 60, 50, 240);
            ctx.fillRect(460, 60, 50, 240);
            // Tower roofs (triangular)
            ctx.fillStyle = '#cc3333';
            ctx.beginPath(); ctx.moveTo(290, 60); ctx.lineTo(315, 20); ctx.lineTo(340, 60); ctx.fill();
            ctx.beginPath(); ctx.moveTo(460, 60); ctx.lineTo(485, 20); ctx.lineTo(510, 60); ctx.fill();
            // Main roof
            ctx.fillStyle = '#aa2222';
            ctx.beginPath(); ctx.moveTo(310, 100); ctx.lineTo(400, 55); ctx.lineTo(490, 100); ctx.fill();
            // Castle walls texture
            ctx.fillStyle = '#8888aa';
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 6; col++) {
                    const bx = 315 + col * 28 + (row % 2) * 14;
                    const by = 105 + row * 24;
                    ctx.fillRect(bx, by, 26, 22);
                    ctx.fillStyle = '#777799';
                    ctx.fillRect(bx, by, 26, 1);
                    ctx.fillRect(bx, by, 1, 22);
                    ctx.fillStyle = '#8888aa';
                }
            }
            // Windows (lit golden)
            ctx.fillStyle = '#ffdd44';
            ctx.fillRect(350, 140, 20, 25); ctx.fillRect(430, 140, 20, 25);
            ctx.fillRect(350, 190, 20, 25); ctx.fillRect(430, 190, 20, 25);
            ctx.fillRect(385, 160, 30, 35);
            // Window glow
            ctx.fillStyle = 'rgba(255,221,68,0.3)';
            ctx.fillRect(345, 135, 30, 35); ctx.fillRect(425, 135, 30, 35);
            // Gate
            ctx.fillStyle = '#553311';
            ctx.fillRect(375, 240, 50, 60);
            ctx.fillStyle = '#442200';
            ctx.beginPath(); ctx.arc(400, 240, 25, Math.PI, 0); ctx.fill();
            // Flags on towers
            ctx.fillStyle = '#cc2222';
            ctx.fillRect(312, 20, 3, 40); ctx.fillRect(316, 22, 16, 10);
            ctx.fillRect(482, 20, 3, 40); ctx.fillRect(486, 22, 16, 10);
            // Path to castle
            ctx.fillStyle = '#ccaa66';
            ctx.fillRect(375, 300, 50, 60);
            ctx.fillRect(365, 330, 70, 30);
            // Trees
            ctx.fillStyle = '#2a7a2a';
            for (const tx of [120, 200, 580, 680]) {
                ctx.fillRect(tx+8, 250, 8, 50);
                ctx.fillStyle = '#228822';
                ctx.beginPath(); ctx.arc(tx+12, 240, 24, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#2a7a2a';
                ctx.beginPath(); ctx.arc(tx+12, 225, 18, 0, Math.PI*2); ctx.fill();
            }
            break;

        case 'kingdom_dark':
        case 'kingdom_ruins':
            // Dark red sky
            const darkSky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
            darkSky.addColorStop(0, '#0a0008');
            darkSky.addColorStop(1, '#2a0a0a');
            ctx.fillStyle = darkSky;
            ctx.fillRect(0, 0, w, h * 0.6);
            // Blood moon
            ctx.fillStyle = '#882222';
            ctx.beginPath(); ctx.arc(600, 70, 30, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(136,34,34,0.2)';
            ctx.beginPath(); ctx.arc(600, 70, 50, 0, Math.PI * 2); ctx.fill();
            // Dark clouds
            ctx.fillStyle = 'rgba(40,10,10,0.6)';
            ctx.fillRect(50, 30, 120, 20); ctx.fillRect(70, 20, 80, 16);
            ctx.fillRect(400, 50, 100, 18); ctx.fillRect(420, 40, 60, 14);
            // Scorched ground
            ctx.fillStyle = '#1a1008';
            ctx.fillRect(0, h * 0.6, w, h * 0.4);
            ctx.fillStyle = '#2a1a0a';
            for (let i = 0; i < 20; i++) {
                ctx.fillRect(i * 45, h * 0.6, 30, 8);
            }
            // Ruined castle - crumbling walls
            ctx.fillStyle = '#444444';
            ctx.fillRect(320, 130, 160, 170);
            // Left broken tower
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(295, 90, 45, 210);
            ctx.fillRect(295, 85, 30, 10); // broken top
            // Right tower - partially collapsed
            ctx.fillStyle = '#3a3a3a';
            ctx.fillRect(460, 120, 45, 180);
            ctx.fillRect(465, 115, 20, 10);
            // Cracks in walls
            ctx.fillStyle = '#222222';
            ctx.fillRect(340, 140, 4, 60);
            ctx.fillRect(340, 140, 30, 4);
            ctx.fillRect(370, 140, 4, 30);
            ctx.fillRect(420, 180, 4, 80);
            ctx.fillRect(400, 200, 40, 4);
            ctx.fillRect(350, 250, 50, 4);
            ctx.fillRect(460, 160, 30, 4);
            // Missing chunks
            ctx.fillStyle = '#1a0a1a';
            ctx.fillRect(470, 120, 20, 30);
            ctx.fillRect(440, 130, 15, 25);
            ctx.fillRect(310, 90, 15, 20);
            // Dark windows
            ctx.fillStyle = '#110008';
            ctx.fillRect(350, 160, 18, 22); ctx.fillRect(420, 160, 18, 22);
            ctx.fillRect(380, 200, 25, 30);
            // Fire/ember glow from windows
            ctx.fillStyle = 'rgba(255,80,20,0.4)';
            ctx.fillRect(348, 158, 22, 26); ctx.fillRect(418, 158, 22, 26);
            ctx.fillStyle = 'rgba(255,80,20,0.6)';
            ctx.fillRect(378, 198, 29, 34);
            // Rubble on ground (pre-computed positions to avoid flicker)
            ctx.fillStyle = '#555555';
            for (const r of _cutsceneRubble) {
                ctx.fillRect(260 + r.x, h * 0.6 + r.y, r.w, r.h);
            }
            // Dead trees
            ctx.fillStyle = '#2a1a0a';
            ctx.fillRect(130, 200, 6, 100);
            ctx.fillRect(120, 210, 20, 4); ctx.fillRect(140, 195, 15, 3);
            ctx.fillRect(650, 220, 6, 80);
            ctx.fillRect(640, 230, 18, 3); ctx.fillRect(655, 215, 12, 3);
            // Red atmospheric overlay
            ctx.fillStyle = 'rgba(150,20,20,0.15)';
            ctx.fillRect(0, 0, w, h);
            break;

        case 'throne_room':
            // Stone floor and walls
            ctx.fillStyle = '#1a1028';
            ctx.fillRect(0, 0, w, h);
            // Floor
            const floorGrad = ctx.createLinearGradient(0, h*0.65, 0, h);
            floorGrad.addColorStop(0, '#3a2a4a');
            floorGrad.addColorStop(1, '#2a1a3a');
            ctx.fillStyle = floorGrad;
            ctx.fillRect(0, h * 0.65, w, h * 0.35);
            // Floor tiles
            ctx.fillStyle = '#332244';
            for (let i = 0; i < 16; i++) {
                ctx.fillRect(i * 55, h * 0.65, 1, h * 0.35);
            }
            // Red carpet
            ctx.fillStyle = '#881122';
            ctx.fillRect(350, h * 0.65, 100, h * 0.35);
            ctx.fillStyle = '#771020';
            ctx.fillRect(360, h * 0.65, 80, h * 0.35);
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(355, h * 0.65, 2, h * 0.35);
            ctx.fillRect(443, h * 0.65, 2, h * 0.35);
            // Back wall details
            ctx.fillStyle = '#2a1a3a';
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 14; col++) {
                    const bx = col * 60 + (row % 2) * 30;
                    const by = row * 50;
                    ctx.strokeStyle = '#1a1028';
                    ctx.strokeRect(bx, by, 60, 50);
                }
            }
            // Pillars with detail
            ctx.fillStyle = '#555577';
            for (const px of [80, 180, 580, 680]) {
                ctx.fillStyle = '#555577';
                ctx.fillRect(px, 30, 40, h * 0.65);
                ctx.fillStyle = '#666688';
                ctx.fillRect(px + 5, 30, 30, h * 0.65);
                // Pillar caps
                ctx.fillStyle = '#777799';
                ctx.fillRect(px - 5, 25, 50, 12);
                ctx.fillRect(px - 5, h * 0.63, 50, 12);
                // Pillar grooves
                ctx.fillStyle = '#444466';
                ctx.fillRect(px + 12, 40, 3, h * 0.6);
                ctx.fillRect(px + 25, 40, 3, h * 0.6);
            }
            // Throne - ornate
            ctx.fillStyle = '#6B3510';
            ctx.fillRect(345, 80, 110, 200);
            // Throne back (tall, carved)
            ctx.fillStyle = '#7B4520';
            ctx.fillRect(355, 50, 90, 160);
            ctx.fillStyle = '#8B5530';
            ctx.fillRect(365, 60, 70, 140);
            // Throne cushion
            ctx.fillStyle = '#cc1133';
            ctx.fillRect(355, 170, 90, 40);
            ctx.fillStyle = '#dd2244';
            ctx.fillRect(360, 175, 80, 30);
            // Throne armrests
            ctx.fillStyle = '#6B3510';
            ctx.fillRect(340, 170, 20, 60);
            ctx.fillRect(440, 170, 20, 60);
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(345, 172, 10, 8);
            ctx.fillRect(445, 172, 10, 8);
            // Crown on throne back
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(375, 55, 50, 20);
            ctx.fillRect(380, 45, 8, 15);
            ctx.fillRect(396, 40, 8, 20);
            ctx.fillRect(412, 45, 8, 15);
            // Gems on crown
            ctx.fillStyle = '#cc2222';
            ctx.fillRect(382, 48, 4, 4);
            ctx.fillStyle = '#2244cc';
            ctx.fillRect(398, 43, 4, 4);
            ctx.fillStyle = '#cc2222';
            ctx.fillRect(414, 48, 4, 4);
            // King figure sitting on throne
            // Body/robe
            ctx.fillStyle = '#881133';
            ctx.fillRect(370, 155, 60, 70);
            // Robe trim
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(370, 155, 60, 4);
            ctx.fillRect(370, 155, 4, 70);
            ctx.fillRect(426, 155, 4, 70);
            // Head
            ctx.fillStyle = '#ffcc99';
            ctx.fillRect(382, 120, 36, 35);
            // Crown on head
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(378, 110, 44, 14);
            ctx.fillRect(382, 104, 8, 10);
            ctx.fillRect(396, 100, 8, 14);
            ctx.fillRect(410, 104, 8, 10);
            // Gem
            ctx.fillStyle = '#ff2222';
            ctx.fillRect(398, 103, 4, 4);
            // Eyes
            ctx.fillStyle = '#000000';
            ctx.fillRect(388, 130, 5, 5);
            ctx.fillRect(406, 130, 5, 5);
            // Beard
            ctx.fillStyle = '#cccccc';
            ctx.fillRect(386, 142, 28, 15);
            ctx.fillRect(390, 155, 20, 6);
            ctx.fillRect(394, 159, 12, 4);
            // Scepter
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(438, 130, 5, 90);
            ctx.fillStyle = '#ffdd44';
            ctx.fillRect(434, 124, 14, 10);
            ctx.fillStyle = '#44aaff';
            ctx.fillRect(438, 126, 6, 6);
            // Torches on pillars
            for (const tx of [90, 690]) {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(tx + 10, 80, 8, 30);
                ctx.fillStyle = '#ff6600';
                ctx.fillRect(tx + 6, 65, 16, 18);
                ctx.fillStyle = '#ffaa00';
                ctx.fillRect(tx + 9, 60, 10, 12);
                ctx.fillStyle = '#ffdd44';
                ctx.fillRect(tx + 11, 56, 6, 8);
                // Torch glow
                ctx.fillStyle = 'rgba(255,150,50,0.15)';
                ctx.beginPath(); ctx.arc(tx + 14, 70, 60, 0, Math.PI * 2); ctx.fill();
            }
            // Banners on walls
            for (const bx of [260, 500]) {
                ctx.fillStyle = '#881133';
                ctx.fillRect(bx, 40, 40, 100);
                ctx.fillStyle = '#ffcc00';
                ctx.fillRect(bx + 12, 60, 16, 16);
                ctx.fillRect(bx, 40, 40, 5);
                // Banner bottom point
                ctx.beginPath();
                ctx.fillStyle = '#881133';
                ctx.moveTo(bx, 140); ctx.lineTo(bx + 20, 160); ctx.lineTo(bx + 40, 140);
                ctx.fill();
            }
            break;

        case 'knight_departure':
        case 'knight_sunset':
            // Sunset sky
            const sunset = ctx.createLinearGradient(0, 0, 0, h * 0.55);
            sunset.addColorStop(0, '#1a0a2a');
            sunset.addColorStop(0.3, '#cc4422');
            sunset.addColorStop(0.6, '#ff8833');
            sunset.addColorStop(1, '#ffcc44');
            ctx.fillStyle = sunset;
            ctx.fillRect(0, 0, w, h * 0.55);
            // Setting sun
            ctx.fillStyle = '#ffdd44';
            ctx.beginPath(); ctx.arc(400, h * 0.5, 45, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,221,68,0.3)';
            ctx.beginPath(); ctx.arc(400, h * 0.5, 70, 0, Math.PI * 2); ctx.fill();
            // Ground
            ctx.fillStyle = '#2a3a2a';
            ctx.fillRect(0, h * 0.55, w, h * 0.45);
            ctx.fillStyle = '#1a2a1a';
            ctx.fillRect(0, h * 0.55, w, 6);
            // Path
            ctx.fillStyle = '#aa8844';
            ctx.beginPath();
            ctx.moveTo(370, h); ctx.lineTo(395, h * 0.55);
            ctx.lineTo(405, h * 0.55); ctx.lineTo(430, h);
            ctx.fill();
            // Knight walking on path
            drawKnight(ctx, 365, h * 0.55 - 30, 4, state.equipment, 0);
            // Castle silhouette in background
            ctx.fillStyle = 'rgba(20,15,30,0.6)';
            ctx.fillRect(100, h * 0.35, 80, 80);
            ctx.fillRect(90, h * 0.3, 30, 100);
            ctx.fillRect(170, h * 0.32, 25, 95);
            break;

        case 'ledger_complete':
            ctx.fillStyle = '#0a0a2a';
            ctx.fillRect(0, 0, w, h);
            // Stars
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 40; i++) {
                ctx.fillRect((i * 97) % w, (i * 53) % h, 2, 2);
            }
            // Glowing ledger book
            ctx.fillStyle = 'rgba(255,221,68,0.15)';
            ctx.beginPath(); ctx.arc(400, 170, 120, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,221,68,0.25)';
            ctx.beginPath(); ctx.arc(400, 170, 80, 0, Math.PI * 2); ctx.fill();
            // Book
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(340, 110, 120, 140);
            ctx.fillStyle = '#a0522d';
            ctx.fillRect(345, 115, 110, 130);
            // Pages
            ctx.fillStyle = '#ffeedd';
            ctx.fillRect(350, 120, 100, 120);
            // Writing lines
            ctx.fillStyle = '#886633';
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(360, 135 + i * 13, 80, 2);
            }
            // Gold emblem on cover showing through
            ctx.fillStyle = '#ffcc00';
            ctx.font = '16px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('THE LEDGER', 400, 290);
            ctx.fillStyle = '#ffdd44';
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.fillText('OF WEALTH', 400, 310);
            break;

        case 'kingdom_restored':
            // Bright blue sky
            const happySky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
            happySky.addColorStop(0, '#2266cc');
            happySky.addColorStop(1, '#66aaee');
            ctx.fillStyle = happySky;
            ctx.fillRect(0, 0, w, h * 0.6);
            // Sun
            ctx.fillStyle = '#ffdd44';
            ctx.beginPath(); ctx.arc(650, 55, 32, 0, Math.PI * 2); ctx.fill();
            // Clouds
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.fillRect(80, 35, 90, 16); ctx.fillRect(95, 25, 60, 14);
            ctx.fillRect(450, 60, 80, 14); ctx.fillRect(465, 50, 50, 14);
            // Green hills
            ctx.fillStyle = '#44bb44';
            ctx.fillRect(0, h * 0.6, w, h * 0.4);
            ctx.fillStyle = '#3aaa3a';
            ctx.beginPath(); ctx.ellipse(250, h*0.6, 200, 30, 0, 0, Math.PI*2); ctx.fill();
            // Restored castle (same as peaceful but brighter)
            ctx.fillStyle = '#aaaacc';
            ctx.fillRect(310, 100, 180, 200);
            ctx.fillStyle = '#9999bb';
            ctx.fillRect(290, 60, 50, 240); ctx.fillRect(460, 60, 50, 240);
            ctx.fillStyle = '#cc3333';
            ctx.beginPath(); ctx.moveTo(290, 60); ctx.lineTo(315, 20); ctx.lineTo(340, 60); ctx.fill();
            ctx.beginPath(); ctx.moveTo(460, 60); ctx.lineTo(485, 20); ctx.lineTo(510, 60); ctx.fill();
            ctx.fillStyle = '#aa2222';
            ctx.beginPath(); ctx.moveTo(310, 100); ctx.lineTo(400, 55); ctx.lineTo(490, 100); ctx.fill();
            // Golden lit windows
            ctx.fillStyle = '#ffdd44';
            ctx.fillRect(350, 140, 20, 25); ctx.fillRect(430, 140, 20, 25);
            ctx.fillRect(350, 190, 20, 25); ctx.fillRect(430, 190, 20, 25);
            ctx.fillRect(385, 160, 30, 35);
            // Flags
            ctx.fillStyle = '#cc2222';
            ctx.fillRect(312, 20, 3, 40); ctx.fillRect(316, 22, 18, 10);
            ctx.fillRect(482, 20, 3, 40); ctx.fillRect(486, 22, 18, 10);
            // Celebration - golden sparkles (pre-computed positions)
            ctx.fillStyle = '#ffdd44';
            for (const s of _cutsceneSparkles) {
                ctx.fillRect(280 + s.x, 50 + s.y, 3, 3);
            }
            // People celebrating (tiny pixel figures)
            ctx.fillStyle = '#cc8866';
            for (let i = 0; i < 6; i++) {
                const px = 300 + i * 35;
                ctx.fillRect(px, 280, 6, 10);
                ctx.fillRect(px + 1, 275, 4, 5);
            }
            break;
        default:
            // Boss stage backgrounds - draw the stage background + boss sprite
            const stageMap = { cave:1, volcano:2, beach:3, graveyard:4, swamp:5, forest:6, hellscape:7, dungeon:8, sky:9, castle:10 };
            const stageId = stageMap[scene];
            if (stageId) {
                drawBackground(ctx, w, h, stageId);
                drawBoss(ctx, w/2 - 30, h/2 - 40, 3, stageId, Date.now() * 0.01);
            } else {
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(0, 0, w, h);
            }
            break;
    }
}

// ── Map ──
function onMapClick(e) {
    // Don't process clicks on buttons
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SPAN') return;

    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    for (let i = 1; i <= 10; i++) {
        const pos = getMapNodePos(i);
        const dist = Math.sqrt((clickX - pos.x) ** 2 + (clickY - pos.y) ** 2);
        if (dist < 30 && i <= state.currentStage) {
            try { audio.playMenuSelect(); } catch(er) {}
            launchStage(i);
            return;
        }
    }
}

let pendingStage = null;

function launchStage(stageNum) {
    const boss = BOSS_DATA[stageNum];
    if (!boss) return;

    // Check for random map event (40% chance, only if not seen this stage)
    if (state.lastEventStage !== stageNum && Math.random() < 0.4) {
        const eligible = MAP_EVENTS.filter(ev => ev.minStage <= stageNum);
        if (eligible.length > 0) {
            const event = eligible[Math.floor(Math.random() * eligible.length)];
            state.lastEventStage = stageNum;
            pendingStage = stageNum;
            showMapEvent(event);
            return;
        }
    }

    proceedToFight(stageNum);
}

function proceedToFight(stageNum) {
    const boss = BOSS_DATA[stageNum];
    if (!boss) return;

    try { audio.stopMusic(); } catch(e) {}

    if (state.settings.skipCutscenes) {
        startFight(stageNum);
    } else {
        // Boss intro cutscene
        playCutscene([
            { speaker: '', text: boss.intro, scene: boss.background },
            { speaker: boss.name, text: boss.taunt, scene: boss.background }
        ], () => startFight(stageNum));
    }
}

// ── Random Map Events ──
function showMapEvent(event) {
    showScreen('event');

    document.getElementById('event-scenario').textContent = event.scenario;

    const choicesContainer = document.getElementById('event-choices');
    choicesContainer.innerHTML = '';

    const resultDiv = document.getElementById('event-result');
    resultDiv.classList.add('hidden');
    resultDiv.className = 'event-result hidden';

    const continueBtn = document.getElementById('btn-event-continue');
    continueBtn.classList.add('hidden');

    // Shuffle choice order but track correctness
    const shuffled = event.choices.map((c, i) => ({ ...c, origIndex: i }));
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    shuffled.forEach((choice) => {
        const btn = document.createElement('button');
        btn.className = 'event-choice-btn';
        btn.textContent = choice.text;
        btn.addEventListener('click', () => {
            handleEventChoice(btn, choice.correct, event, choicesContainer);
        });
        choicesContainer.appendChild(btn);
    });
}

function handleEventChoice(selectedBtn, isCorrect, event, container) {
    // Disable all buttons
    const allBtns = container.querySelectorAll('.event-choice-btn');
    allBtns.forEach(btn => {
        btn.style.pointerEvents = 'none';
        // Find if this button's text matches the correct choice
        const matchingChoice = event.choices.find(c => c.text === btn.textContent);
        if (matchingChoice && matchingChoice.correct) {
            btn.classList.add('correct');
        } else if (btn === selectedBtn && !isCorrect) {
            btn.classList.add('wrong');
        }
    });

    const resultDiv = document.getElementById('event-result');
    resultDiv.classList.remove('hidden');

    if (isCorrect) {
        resultDiv.className = 'event-result success';
        state.gold += event.reward.gold;
        state.xp += event.reward.xp;
        state.totalXp += event.reward.xp;
        resultDiv.innerHTML = `✓ CORRECT! +${event.reward.gold} Gold, +${event.reward.xp} XP<br><br>${event.explanation}`;
        try { audio.playGoldPickup(); } catch(e) {}
    } else {
        resultDiv.className = 'event-result failure';
        resultDiv.innerHTML = `✗ WRONG<br><br>${event.explanation}`;
        try { audio.playHit(); } catch(e) {}
    }

    saveGame();

    const continueBtn = document.getElementById('btn-event-continue');
    continueBtn.classList.remove('hidden');
}

function onEventContinue() {
    try { audio.playMenuSelect(); } catch(e) {}
    if (pendingStage) {
        const stage = pendingStage;
        pendingStage = null;
        proceedToFight(stage);
    } else {
        showScreen('map');
    }
}

// ── Victory Continue ──
function onVictoryContinue() {
    try { audio.playMenuSelect(); } catch(e) {}

    if (state.endlessMode) {
        startEndlessFight();
        return;
    }

    // Check if game complete (all 10 stages)
    if (state.completedStages.size >= 10 && !state.endlessMode) {
        if (state.settings.skipCutscenes) {
            showComplete();
        } else {
            playCutscene(ENDING_CUTSCENE, showComplete);
        }
    } else {
        openShop();
    }
}

function showComplete() {
    recordScore();
    document.getElementById('complete-name').textContent = state.playerName;

    // Draw trophy on canvas
    const tc = document.getElementById('trophy-canvas');
    if (tc) {
        const t = tc.getContext('2d');
        t.clearRect(0, 0, 120, 120);
        // Glow
        t.fillStyle = 'rgba(255,200,44,0.15)';
        t.beginPath();
        t.arc(60, 55, 50, 0, Math.PI * 2);
        t.fill();
        // Trophy base
        t.fillStyle = '#8a6a2a';
        t.fillRect(40, 90, 40, 8);
        t.fillRect(46, 82, 28, 10);
        // Trophy stem
        t.fillStyle = '#aa8833';
        t.fillRect(54, 60, 12, 24);
        // Trophy cup
        t.fillStyle = '#ffcc44';
        t.beginPath();
        t.moveTo(30, 20);
        t.lineTo(30, 50);
        t.quadraticCurveTo(30, 65, 60, 65);
        t.quadraticCurveTo(90, 65, 90, 50);
        t.lineTo(90, 20);
        t.closePath();
        t.fill();
        // Cup shine
        t.fillStyle = '#ffe888';
        t.beginPath();
        t.moveTo(38, 24);
        t.lineTo(38, 45);
        t.quadraticCurveTo(38, 55, 50, 58);
        t.lineTo(50, 24);
        t.closePath();
        t.fill();
        // Handles
        t.strokeStyle = '#ffcc44';
        t.lineWidth = 5;
        t.beginPath();
        t.arc(25, 38, 10, -Math.PI * 0.5, Math.PI * 0.5);
        t.stroke();
        t.beginPath();
        t.arc(95, 38, 10, Math.PI * 0.5, -Math.PI * 0.5);
        t.stroke();
        // Star on cup
        t.fillStyle = '#aa8833';
        t.font = '18px "Press Start 2P", monospace';
        t.textAlign = 'center';
        t.textBaseline = 'middle';
        t.fillText('★', 60, 42);
    }

    // Victory stats
    const statsDiv = document.getElementById('victory-stats');
    if (statsDiv) {
        const accuracy = Math.round(state.totalCorrect / Math.max(1, state.totalAnswered) * 100);
        statsDiv.innerHTML = `
            <p>Bosses Slain: <span class="stat-value">${state.totalKills}</span></p>
            <p>Accuracy: <span class="stat-value">${accuracy}%</span></p>
            <p>Best Combo: <span class="stat-value">${state.bestCombo}x</span></p>
            <p>Gold Earned: <span class="stat-value">${state.gold}</span></p>
        `;
    }

    showScreen('complete');
}

// ── Death / Retry ──
function onRetry() {
    try { audio.playMenuSelect(); } catch(e) {}
    if (state.endlessMode) {
        state.endlessMode = false;
        state.endlessRound = 0;
        showScreen('map');
        try { audio.playMapMusic(); } catch(e) {}
    } else {
        startFight(combat.bossStage);
    }
}

// ── Return to Map ──
function onReturnToMap() {
    try { audio.playMenuSelect(); } catch(e) {}
    showScreen('map');
    try { audio.playMapMusic(); } catch(e) {}
}

// ── Flee ──
function onFlee() {
    fleeFight();
    try { audio.playMenuSelect(); } catch(e) {}
    if (state.endlessMode) {
        state.endlessMode = false;
        state.endlessRound = 0;
    }
    showScreen('map');
    try { audio.playMapMusic(); } catch(e) {}
    saveGame();
}

// ── Shop ──
function openShop() {
    try { audio.stopMusic(); audio.playShopMusic(); } catch(e) {}
    shopkeeperClicks = 0;
    document.getElementById('shopkeeper-quote').textContent = `"${getRandomQuote('enter')}"`;
    document.getElementById('shop-gold').textContent = `Gold: ${state.gold}`;
    showScreen('shop');
    switchShopTab('weapons');
    startShopPreview();
    drawShopkeeperPortrait();
}

function drawShopkeeperPortrait() {
    const canvas = document.getElementById('shopkeeper-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 80, 80);
    drawShopkeeper(ctx, 15, 10, 2.5, 0);
}

function leaveShop() {
    try { audio.stopMusic(); audio.playMenuSelect(); audio.playMapMusic(); } catch(e) {}
    stopShopPreview();
    // Max HP is always 5
    state.persistentMaxHp = 5;
    if (state.persistentHp > state.persistentMaxHp) {
        state.persistentHp = state.persistentMaxHp;
    }
    saveGame();
    showScreen('map');
    document.getElementById('map-gold').textContent = `Gold: ${state.gold}`;
}

function switchShopTab(tab) {
    document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.shop-tab[data-tab="${tab}"]`).classList.add('active');
    renderShopGrid(tab);
}

function renderShopGrid(tab) {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    const items = SHOP_ITEMS[tab] || [];

    items.forEach(item => {
        const owned = state.ownedItems.has(item.id);
        const equipped = isEquipped(item);
        const displayPrice = getItemPrice(item);
        const canAfford = state.gold >= displayPrice;
        const discounted = displayPrice < item.price;

        const el = document.createElement('div');
        el.className = `shop-item${owned && !item.consumable ? ' owned' : ''}${equipped ? ' equipped' : ''}`;

        const statsLine = hasSkill('merchants_eye') ? getItemStats(item) : '';
        el.innerHTML = `
            <div class="item-name">${item.name}</div>
            <div class="item-desc">${item.description}</div>
            ${statsLine ? `<div class="item-stats">${statsLine}</div>` : ''}
            <div class="item-price">${item.price === 0 ? 'FREE' : (discounted ? `<s>${item.price}</s> ${displayPrice}` : displayPrice) + ' G'}</div>
            ${owned && !item.consumable ? '<div class="item-badge">OWNED</div>' : ''}
            ${equipped ? '<div class="item-badge equipped-badge">EQUIPPED</div>' : ''}
            ${item.consumable ? `<div class="item-count">Owned: ${state.inventory[item.id] || 0}</div>` : ''}
        `;

        el.addEventListener('click', () => onShopItemClick(item));

        // Preview on hover
        el.addEventListener('mouseenter', () => previewItem(item));
        el.addEventListener('mouseleave', () => previewItem(null));

        grid.appendChild(el);
    });
}

function onShopItemClick(item) {
    // Equip already-owned item (no confirmation needed)
    if (!item.consumable && state.ownedItems.has(item.id)) {
        state.equipment[item.slot] = item.value;
        try { audio.playMenuSelect(); } catch(e) {}
        document.getElementById('shop-gold').textContent = `Gold: ${state.gold}`;
        const activeTab = document.querySelector('.shop-tab.active').dataset.tab;
        renderShopGrid(activeTab);
        return;
    }

    // Check if can afford (with Haggler discount)
    if (state.gold < getItemPrice(item)) {
        document.getElementById('shopkeeper-quote').textContent = `"${getRandomQuote('tooExpensive')}"`;
        return;
    }

    // Show confirmation dialog
    showPurchaseConfirm(item);
}

function showPurchaseConfirm(item) {
    // Remove any existing confirm dialog
    const existing = document.getElementById('purchase-confirm');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'purchase-confirm';
    dialog.className = 'purchase-confirm-overlay';
    dialog.innerHTML = `
        <div class="purchase-confirm-box">
            <p class="confirm-title">CONFIRM PURCHASE</p>
            <p class="confirm-item">${item.name}</p>
            <p class="confirm-price">${getItemPrice(item)} Gold</p>
            <p class="confirm-desc">${item.description}</p>
            <div class="confirm-buttons">
                <button class="pixel-btn confirm-yes">BUY</button>
                <button class="pixel-btn confirm-no">CANCEL</button>
            </div>
        </div>
    `;

    document.getElementById('shop-screen').appendChild(dialog);

    dialog.querySelector('.confirm-yes').addEventListener('click', () => {
        dialog.remove();
        confirmPurchase(item);
    });

    dialog.querySelector('.confirm-no').addEventListener('click', () => {
        dialog.remove();
        try { audio.playMenuSelect(); } catch(e) {}
    });
}

function getItemPrice(item) {
    if (item.price === 0) return 0;
    return hasSkill('haggler') ? Math.floor(item.price * 0.9) : item.price;
}

function getItemStats(item) {
    const stats = {
        sword_basic: 'DMG: 1 | Crit: 2',
        sword_flame: 'DMG: 1 | Crit: 3 | +1 crit dmg',
        sword_ice: 'DMG: 1 | Crit: 3 | +1 crit dmg',
        sword_golden: 'DMG: 1 | Crit: 2 | +10% gold',
        helmet_iron: 'Cosmetic only',
        helmet_gold: 'Cosmetic only',
        helmet_horned: '+1 max HP',
        armor_basic: 'No bonus',
        armor_chain: 'Cosmetic only',
        armor_plate: '+1 max HP',
        armor_golden: '+1 max HP | Golden set piece',
        potion_hp: 'Heal 1 HP mid-fight (use in combat)',
        potion_time: '+5 sec timer for entire fight',
        scroll_hint: '+1 hint for next fight',
        shield_block: 'Block 1 wrong answer next fight',
        gold_charm: '+25% gold for 1 fight',
    };
    return stats[item.id] || '';
}

function confirmPurchase(item) {
    const price = getItemPrice(item);
    if (state.gold < price) return;

    state.gold -= price;

    if (item.consumable) {
        state.inventory[item.id] = (state.inventory[item.id] || 0) + 1;
    } else {
        state.ownedItems.add(item.id);
        state.equipment[item.slot] = item.value;
    }

    try { audio.playPurchase(); } catch(e) {}
    document.getElementById('shopkeeper-quote').textContent = `"${getRandomQuote('purchase')}"`;
    document.getElementById('shop-gold').textContent = `Gold: ${state.gold}`;
    const activeTab = document.querySelector('.shop-tab.active').dataset.tab;
    renderShopGrid(activeTab);
    saveGame();
}

function isEquipped(item) {
    if (item.consumable) return false;
    return state.equipment[item.slot] === item.value;
}

function previewItem(item) {
    // Preview will show on the shop canvas via the animation loop
    if (item && !item.consumable) {
        state._previewEquipment = { ...state.equipment, [item.slot]: item.value };
    } else {
        state._previewEquipment = null;
    }
}

function startShopPreview() {
    const canvas = document.getElementById('shop-preview-canvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    shopPreviewFrame = 0;

    stopShopPreview();
    shopPreviewInterval = setInterval(() => {
        shopPreviewFrame++;
        ctx.clearRect(0, 0, 200, 250);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 200, 250);

        const eq = state._previewEquipment || state.equipment;
        drawKnight(ctx, 60, 60, 4, eq, shopPreviewFrame);
    }, 50);
}

function stopShopPreview() {
    clearInterval(shopPreviewInterval);
}

// ── Mute Toggle ──
function toggleMute() {
    try {
        if (audio.isMuted()) {
            audio.unmute();
            document.getElementById('btn-mute').textContent = '🔊';
        } else {
            audio.mute();
            document.getElementById('btn-mute').textContent = '🔇';
        }
    } catch(e) {}
}

// ── Codex ──
function openCodex() {
    try { audio.playMenuSelect(); } catch(e) {}
    state.codexViewed = new Set(state.codexUnlocked);
    const content = document.getElementById('codex-content');
    content.innerHTML = '';

    for (let i = 1; i <= 10; i++) {
        const entry = CODEX_ENTRIES[i];
        const unlocked = state.codexUnlocked.has(i);
        const div = document.createElement('div');
        div.className = `codex-entry${unlocked ? '' : ' locked'}`;

        if (unlocked) {
            div.innerHTML = `<h3>${entry.title}</h3><p>${entry.content}</p>`;
        } else {
            div.innerHTML = `<h3>Fragment ${i}: ???</h3><p>Defeat ${BOSS_DATA[i].name} to unlock this knowledge.</p>`;
        }
        content.appendChild(div);
    }

    const count = state.codexUnlocked.size;
    const header = document.createElement('p');
    header.className = 'codex-count';
    header.textContent = `Fragments Recovered: ${count}/10`;
    content.prepend(header);

    showScreen('codex');
}

// ── Settings ──
function applySettings() {
    document.getElementById('master-volume').value = state.settings.masterVolume * 100;
    document.getElementById('music-volume').value = state.settings.musicVolume * 100;
    document.getElementById('sfx-volume').value = state.settings.sfxVolume * 100;
    document.getElementById('skip-cutscenes').checked = state.settings.skipCutscenes;
    document.getElementById('difficulty-select').value = state.settings.difficulty || 'normal';
    try {
        audio.setMasterVolume(state.settings.masterVolume);
        audio.setMusicVolume(state.settings.musicVolume);
        audio.setSfxVolume(state.settings.sfxVolume);
    } catch(e) {}
}

function closeSettings() {
    try { audio.playMenuSelect(); } catch(e) {}
    saveGame();
    showScreen('map');
}

// ── Reset Game ──
function showResetConfirm() {
    const existing = document.getElementById('reset-confirm');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'reset-confirm';
    dialog.className = 'purchase-confirm-overlay';
    dialog.innerHTML = `
        <div class="purchase-confirm-box">
            <p class="confirm-title">⚠ RESET GAME ⚠</p>
            <p class="confirm-desc">This will erase ALL progress, gold, items, and unlocks.</p>
            <p class="confirm-desc">Type <strong>YES</strong> to confirm:</p>
            <input type="text" id="reset-confirm-input" class="pixel-input" autocomplete="off" placeholder="Type YES...">
            <div class="confirm-buttons">
                <button class="pixel-btn confirm-yes" id="btn-confirm-reset">RESET</button>
                <button class="pixel-btn confirm-no" id="btn-cancel-reset">CANCEL</button>
            </div>
        </div>
    `;

    document.getElementById('settings-screen').appendChild(dialog);

    const resetBtn = dialog.querySelector('#btn-confirm-reset');
    const cancelBtn = dialog.querySelector('#btn-cancel-reset');
    const input = dialog.querySelector('#reset-confirm-input');

    input.focus();

    resetBtn.addEventListener('click', () => {
        if (input.value.trim().toUpperCase() === 'YES') {
            dialog.remove();
            executeReset();
        } else {
            input.value = '';
            input.placeholder = 'You must type YES!';
            input.classList.add('shake-input');
            setTimeout(() => input.classList.remove('shake-input'), 400);
        }
    });

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') resetBtn.click();
    });

    cancelBtn.addEventListener('click', () => {
        dialog.remove();
        try { audio.playMenuSelect(); } catch(e) {}
    });
}

function executeReset() {
    SaveSystem.deleteSave();
    state.playerName = 'Knight';
    state.gold = 0;
    state.currentStage = 1;
    state.completedStages = new Set();
    state.equipment = { helmet: 'none', armor: 'basic', sword: 'basic', cape: 'none' };
    state.ownedItems = new Set(['helmet_none', 'armor_basic', 'sword_basic', 'cape_none']);
    state.inventory = { potion_hp: 0, potion_time: 0, scroll_hint: 0, shield_block: 0, gold_charm: 0 };
    state.codexUnlocked = new Set();
    state.totalKills = 0;
    state.totalCorrect = 0;
    state.totalAnswered = 0;
    state.bestCombo = 0;
    state.endlessHighScore = 0;
    state.titles = [];
    state.deathsPerStage = {};
    state.endlessMode = false;
    state.endlessRound = 0;
    state.skills = new Set();
    state.xp = 0;
    state.totalXp = 0;
    state.mistakeJournal = [];
    state.completedDeals = new Set();
    state.scoreSubmitted = false;
    state.persistentHp = 5;
    state.persistentMaxHp = 5;
    state.totalPlaytime = 0;
    document.getElementById('btn-start').textContent = 'PRESS START';
    showScreen('title');
    try { audio.stopMusic(); } catch(e) {}
}

// ── Stats & Achievements ──
const ALL_ACHIEVEMENTS = [
    { id: 'The Flawless', icon: '💎', desc: 'Beat a boss with no wrong answers' },
    { id: 'The Unstoppable', icon: '🔥', desc: 'Reach a 10x combo streak' },
    { id: 'Speed Demon', icon: '⚡', desc: 'Answer a question in under 3 seconds' },
    { id: 'Lightning Reflexes', icon: '🌩️', desc: 'Answer a question in under 1.5 seconds' },
    { id: 'Moneybags', icon: '💰', desc: 'Accumulate 500 gold' },
    { id: 'The Wealthy', icon: '👑', desc: 'Accumulate 1000 gold' },
    { id: 'The Scholar', icon: '📖', desc: 'Unlock all 10 codex entries' },
    { id: 'The Survivor', icon: '💀', desc: 'Win a fight with only 1 HP' },
    { id: 'Dragon Slayer', icon: '🐉', desc: 'Defeat the ARV Dragon' },
    { id: 'Shopaholic', icon: '🛒', desc: 'Own 8 or more items' },
    { id: 'The Persistent', icon: '🛡️', desc: 'Die 5 times and keep going' },
    { id: 'Golden Knight', icon: '✨', desc: 'Equip full golden gear set' },
    { id: 'Combo Master', icon: '🎯', desc: 'Reach 7x combo in a single fight' },
    { id: 'Endless Warrior', icon: '♾️', desc: 'Reach round 5 in endless mode' },
];

function openStats() {
    try { audio.playMenuSelect(); } catch(e) {}
    const content = document.getElementById('stats-content');
    const accuracy = Math.round(state.totalCorrect / Math.max(1, state.totalAnswered) * 100);
    const totalDeaths = Object.values(state.deathsPerStage).reduce((a, b) => a + b, 0);
    const stagesCleared = state.completedStages.size;

    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-box"><div class="stat-label">Accuracy</div><div class="stat-val">${accuracy}%</div></div>
            <div class="stat-box"><div class="stat-label">Best Combo</div><div class="stat-val">${state.bestCombo}x</div></div>
            <div class="stat-box"><div class="stat-label">Bosses Slain</div><div class="stat-val">${state.totalKills}</div></div>
            <div class="stat-box"><div class="stat-label">Total Gold</div><div class="stat-val">${state.gold}</div></div>
            <div class="stat-box"><div class="stat-label">Stages Cleared</div><div class="stat-val">${stagesCleared}/10</div></div>
            <div class="stat-box"><div class="stat-label">Total Deaths</div><div class="stat-val">${totalDeaths}</div></div>
            <div class="stat-box"><div class="stat-label">Questions Answered</div><div class="stat-val">${state.totalAnswered}</div></div>
            <div class="stat-box"><div class="stat-label">Endless High</div><div class="stat-val">Rd ${state.endlessHighScore}</div></div>
            <div class="stat-box"><div class="stat-label">Difficulty</div><div class="stat-val">${(state.settings.difficulty || 'normal').toUpperCase()}</div></div>
            <div class="stat-box"><div class="stat-label">Titles Earned</div><div class="stat-val">${state.titles.length}/${ALL_ACHIEVEMENTS.length}</div></div>
        </div>
    `;

    // Achievements
    const grid = document.getElementById('achievements-grid');
    grid.innerHTML = '';
    ALL_ACHIEVEMENTS.forEach(ach => {
        const unlocked = state.titles.includes(ach.id);
        const el = document.createElement('div');
        el.className = `achievement-card${unlocked ? ' unlocked' : ''}`;
        el.innerHTML = `
            <div class="ach-icon">${unlocked ? ach.icon : '🔒'}</div>
            <div class="ach-info">
                <div class="ach-name">${unlocked ? ach.id : '???'}</div>
                <div class="ach-desc">${ach.desc}</div>
            </div>
        `;
        grid.appendChild(el);
    });

    showScreen('stats');
}

// ── Leaderboard ──
const LEADERBOARD_KEY = 'ledger_and_sword_leaderboard';
const LEADERBOARD_API = 'https://script.google.com/macros/s/AKfycbwZ5zTYKgZEa0OB7aXUQ3u_WsUfNWVtWELmtXz6sf0remx4P4-CcBaSS0jAevLSNKgl/exec';
let leaderboardReturnScreen = 'map';
let publicScores = null;

function getLeaderboard() {
    try {
        const raw = localStorage.getItem(LEADERBOARD_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
}

function saveLeaderboardEntry(entry) {
    const board = getLeaderboard();
    board.push(entry);
    board.sort((a, b) => b.score - a.score);
    const top = board.slice(0, 10);
    try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(top)); } catch(e) {}
}

export function recordScore() {
    const accuracy = Math.round(state.totalCorrect / Math.max(1, state.totalAnswered) * 100);
    const entry = {
        name: state.playerName,
        score: state.gold,
        accuracy: accuracy,
        combo: state.bestCombo,
        kills: state.totalKills,
        date: new Date().toLocaleDateString()
    };
    saveLeaderboardEntry(entry);

    // Submit to public leaderboard (only on campaign complete, once per run)
    if (!state.scoreSubmitted) {
        state.scoreSubmitted = true;
        saveGame();
        submitPublicScore(entry);
    }
}

function submitPublicScore(entry) {
    const payload = {
        name: entry.name,
        gold: entry.score,
        accuracy: entry.accuracy + '%',
        deaths: Object.values(state.deathsPerStage || {}).reduce((a, b) => a + b, 0),
        time: formatPlaytime(state.totalPlaytime || 0)
    };
    fetch(LEADERBOARD_API, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(() => {});
}

function formatPlaytime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
}

function fetchPublicScores() {
    return fetch(LEADERBOARD_API)
        .then(r => r.json())
        .then(data => { publicScores = data; return data; })
        .catch(() => { publicScores = null; return null; });
}

function openLeaderboard(returnTo) {
    try { audio.playMenuSelect(); } catch(e) {}
    leaderboardReturnScreen = returnTo || 'map';
    const content = document.getElementById('leaderboard-content');
    content.innerHTML = '<p class="codex-empty">Loading scores...</p>';
    showScreen('leaderboard');

    fetchPublicScores().then(scores => {
        if (!scores || scores.length === 0) {
            // Fall back to local scores
            const board = getLeaderboard();
            if (board.length === 0) {
                content.innerHTML = '<p class="codex-empty">No scores yet. Complete the campaign to earn your place!</p>';
            } else {
                renderScoreTable(content, board, true);
            }
        } else {
            renderScoreTable(content, scores, false);
        }
    });
}

function renderScoreTable(content, scores, isLocal) {
    let html = `<p style="font-size:8px; color:var(--gold); margin-bottom:6px;">${isLocal ? 'LOCAL SCORES' : 'GLOBAL LEADERBOARD'}</p>`;
    html += '<table class="leaderboard-table"><thead><tr><th>#</th><th>NAME</th><th>GOLD</th><th>ACC</th><th>DEATHS</th><th>TIME</th></tr></thead><tbody>';
    scores.forEach((entry, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`;
        const name = entry.name || 'Unknown';
        const gold = isLocal ? entry.score : entry.gold;
        const acc = isLocal ? entry.accuracy + '%' : entry.accuracy;
        const deaths = entry.deaths ?? '-';
        const time = entry.time || '-';
        html += `<tr${i < 3 ? ' class="top-score"' : ''}>
            <td>${medal}</td>
            <td>${name}</td>
            <td>${gold}G</td>
            <td>${acc}</td>
            <td>${deaths}</td>
            <td>${time}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    content.innerHTML = html;
}

function closeLeaderboard() {
    try { audio.playMenuSelect(); } catch(e) {}
    showScreen(leaderboardReturnScreen);
}


// ── Share ──
function shareVictory() {
    const text = `⚔️ Sir ${state.playerName} defeated The ARV Dragon and restored the Kingdom of Capitalon in "The Ledger & The Sword"! 🏰\n\nCan you master hard money lending?\n\nBest Combo: ${state.bestCombo}x | Bosses Slain: ${state.totalKills} | Accuracy: ${Math.round(state.totalCorrect / Math.max(1, state.totalAnswered) * 100)}%`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            document.getElementById('btn-share').textContent = 'COPIED!';
            setTimeout(() => {
                document.getElementById('btn-share').textContent = 'SHARE VICTORY';
            }, 2000);
        });
    }
}

// ══════════════════════════════════════════════════════════════
//  STUDY MODE
// ══════════════════════════════════════════════════════════════
let studyQuestions = [];
let studyIndex = 0;
let studyTopic = 0;
let studyCorrect = 0;
let studyTotal = 0;

function openStudyMode() {
    try { audio.playMenuSelect(); audio.playStudyMusic(); } catch(e) {}
    // Reset study area
    document.getElementById('study-area').classList.add('hidden');
    document.getElementById('btn-study-next').classList.add('hidden');

    // Build topic selection grid
    const container = document.getElementById('study-topic-select');
    container.innerHTML = '<p class="study-intro">Choose a topic to practice. No timer, no combat — just learning.</p>';

    for (let i = 1; i <= 10; i++) {
        const topicName = STAGE_TOPICS[i];
        const count = QUESTIONS.filter(q => q.stage === i).length;
        const btn = document.createElement('button');
        btn.className = 'pixel-btn study-topic-btn';
        btn.innerHTML = `<span class="study-topic-num">Stage ${i}</span> ${topicName} <span class="study-topic-count">(${count} questions)</span>`;
        btn.addEventListener('click', () => startStudyTopic(i));
        container.appendChild(btn);
    }

    showScreen('study');
}

function startStudyTopic(stageNum) {
    try { audio.playMenuSelect(); } catch(e) {}
    studyTopic = stageNum;
    studyQuestions = shuffleStudy(QUESTIONS.filter(q => q.stage === stageNum));
    studyIndex = 0;
    studyCorrect = 0;
    studyTotal = 0;

    document.getElementById('study-topic-select').innerHTML = '';
    document.getElementById('study-area').classList.remove('hidden');
    document.getElementById('study-topic-label').textContent = STAGE_TOPICS[stageNum];
    showStudyQuestion();
}

function showStudyQuestion() {
    studyAnswered = false;

    if (studyIndex >= studyQuestions.length) {
        // All questions done — show summary
        const pct = studyTotal > 0 ? Math.round((studyCorrect / studyTotal) * 100) : 0;
        document.getElementById('study-question').textContent = `Topic complete! You got ${studyCorrect}/${studyTotal} correct (${pct}%).`;
        document.getElementById('study-answers').innerHTML = '';
        document.getElementById('study-feedback').classList.add('hidden');
        document.getElementById('study-progress').textContent = `${studyTotal}/${studyQuestions.length}`;
        const nextBtn = document.getElementById('btn-study-next');
        nextBtn.textContent = 'PICK ANOTHER TOPIC';
        nextBtn.classList.remove('hidden');
        nextBtn.onclick = () => openStudyMode();
        return;
    }

    const q = studyQuestions[studyIndex];
    document.getElementById('study-progress').textContent = `${studyIndex + 1}/${studyQuestions.length}`;
    document.getElementById('study-question').textContent = q.question;
    document.getElementById('study-feedback').classList.add('hidden');
    document.getElementById('btn-study-next').classList.add('hidden');

    const container = document.getElementById('study-answers');
    container.innerHTML = '';
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => onStudyAnswer(i, q));
        container.appendChild(btn);
    });
}

let studyAnswered = false;

function onStudyAnswer(index, q) {
    if (studyAnswered) return; // prevent double-clicks
    studyAnswered = true;

    const correct = index === q.correctIndex;
    studyTotal++;
    if (correct) studyCorrect++;

    // Highlight answers
    const buttons = document.querySelectorAll('#study-answers .answer-btn');
    buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === q.correctIndex) btn.classList.add('correct');
        if (i === index && !correct) btn.classList.add('wrong');
    });

    // Show feedback
    const feedback = document.getElementById('study-feedback');
    feedback.classList.remove('hidden');
    feedback.innerHTML = correct
        ? `<span class="study-correct-text">✓ Correct!</span><br><span class="study-explain">${q.explanation}</span>`
        : `<span class="study-wrong-text">✗ Incorrect.</span><br><span class="study-explain">${q.explanation}</span>`;

    // Show next button
    const nextBtn = document.getElementById('btn-study-next');
    nextBtn.textContent = 'NEXT QUESTION';
    nextBtn.classList.remove('hidden');
    nextBtn.onclick = () => { studyIndex++; showStudyQuestion(); };
}

function shuffleStudy(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ══════════════════════════════════════════════════════════════
//  GLOSSARY
// ══════════════════════════════════════════════════════════════
const GLOSSARY_TERMS = [
    { term: 'Hard Money Loan', def: 'A short-term loan secured by real property, funded by private investors rather than banks.' },
    { term: 'Principal', def: 'The original amount of money borrowed, before interest is added.' },
    { term: 'Interest Rate', def: 'The percentage charged by the lender for borrowing money, usually expressed annually.' },
    { term: 'APR (Annual Percentage Rate)', def: 'The total yearly cost of borrowing, including interest and fees.' },
    { term: 'Points', def: 'Upfront fees charged by the lender. One point equals 1% of the loan amount.' },
    { term: 'Term', def: 'The length of time the borrower has to repay the loan.' },
    { term: 'Collateral', def: 'An asset (usually real property) pledged to secure a loan. The lender can seize it if the borrower defaults.' },
    { term: 'Lien', def: 'A legal claim on a property used as security for a debt.' },
    { term: 'First Lien / Second Lien', def: 'Priority order of claims on a property. First lien gets paid first in a foreclosure sale.' },
    { term: 'Deed of Trust', def: 'A legal document that secures a loan by giving the lender a claim on the property until the loan is repaid.' },
    { term: 'LTV (Loan-to-Value)', def: 'The ratio of the loan amount to the property value. LTV = Loan ÷ Value. Lower LTV = less risk for lenders.' },
    { term: 'ARV (After Repair Value)', def: 'The estimated value of a property after renovations are complete.' },
    { term: 'The 70% Rule', def: 'A guideline: Max purchase price = (ARV × 70%) - Repair costs. Helps investors avoid overpaying.' },
    { term: 'Appraisal', def: 'A professional assessment of a property\'s market value.' },
    { term: 'BPO (Broker Price Opinion)', def: 'A less formal property valuation performed by a real estate broker instead of a licensed appraiser.' },
    { term: 'Comparable Sales (Comps)', def: 'Recent sales of similar properties used to estimate a property\'s value.' },
    { term: 'Escrow', def: 'A neutral third party that holds funds and documents during a real estate transaction until all conditions are met.' },
    { term: 'Title', def: 'Legal ownership of a property. A "clean title" means no liens or disputes.' },
    { term: 'Title Insurance', def: 'Insurance that protects against losses from defects in the title (unknown liens, ownership disputes).' },
    { term: 'Closing Costs', def: 'Fees paid at the end of a real estate transaction — includes title fees, escrow fees, recording fees, etc.' },
    { term: 'Default', def: 'Failure to meet the terms of a loan, typically by missing payments.' },
    { term: 'Foreclosure', def: 'The legal process where a lender seizes a property after the borrower defaults.' },
    { term: 'REO (Real Estate Owned)', def: 'Property owned by the lender after an unsuccessful foreclosure auction.' },
    { term: 'Judicial Foreclosure', def: 'Foreclosure that requires going through the court system. Slower but offers more borrower protections.' },
    { term: 'Non-Judicial Foreclosure', def: 'Foreclosure handled outside the courts using a power of sale clause. Faster for lenders.' },
    { term: 'Deficiency Judgment', def: 'A court order requiring the borrower to pay the remaining debt if the foreclosure sale doesn\'t cover the full loan balance.' },
    { term: 'Underwriting', def: 'The process of evaluating a borrower and property to determine loan risk and terms.' },
    { term: 'Exit Strategy', def: 'The borrower\'s plan to repay the loan — usually selling the property or refinancing.' },
    { term: 'Skin in the Game', def: 'The borrower\'s own money invested in the deal (down payment + cash reserves). More skin = less lender risk.' },
    { term: 'Liquidity', def: 'The amount of cash or easily accessible funds a borrower has available.' },
    { term: 'Draw Schedule', def: 'A plan for disbursing renovation funds in stages as work is completed and inspected.' },
    { term: 'Prepayment Penalty', def: 'A fee charged when a borrower pays off the loan before the agreed term ends.' },
    { term: 'Promissory Note', def: 'A written promise by the borrower to repay the loan under specified terms.' },
    { term: 'Bridge Loan', def: 'A short-term loan used to "bridge" the gap between buying a new property and selling an existing one.' },
    { term: 'Holding Costs', def: 'Ongoing expenses while owning a property — mortgage payments, taxes, insurance, utilities, maintenance.' },
    { term: 'Capital Stack', def: 'The layers of financing used in a real estate deal — from senior debt to mezzanine debt to equity.' },
    { term: 'Equity', def: 'The difference between a property\'s value and what is owed on it. Equity = Value - Debt.' },
    { term: 'Private Lender', def: 'An individual or company that lends money using private capital, not bank deposits.' },
    { term: 'Maturity Date', def: 'The date when the loan must be fully repaid.' },
    { term: 'Extension Fee', def: 'A fee charged to extend the loan term beyond the original maturity date.' },
];

let glossaryFiltered = [...GLOSSARY_TERMS];

function openGlossary() {
    try { audio.playMenuSelect(); } catch(e) {}
    document.getElementById('glossary-search').value = '';
    glossaryFiltered = [...GLOSSARY_TERMS];
    renderGlossary();
    showScreen('glossary');
}

function renderGlossary() {
    const list = document.getElementById('glossary-list');
    list.innerHTML = glossaryFiltered.map(g =>
        `<div class="glossary-item">` +
        `<div class="glossary-term">${g.term}</div>` +
        `<div class="glossary-def">${g.def}</div>` +
        `</div>`
    ).join('');
}

function filterGlossary() {
    const query = document.getElementById('glossary-search').value.toLowerCase().trim();
    if (!query) {
        glossaryFiltered = [...GLOSSARY_TERMS];
    } else {
        glossaryFiltered = GLOSSARY_TERMS.filter(g =>
            g.term.toLowerCase().includes(query) || g.def.toLowerCase().includes(query)
        );
    }
    renderGlossary();
}

// ══════════════════════════════════════════════════════════════
//  MISTAKE JOURNAL
// ══════════════════════════════════════════════════════════════
let journalQuestions = [];
let journalIndex = 0;
let journalCorrect = 0;
let journalTotal = 0;
let journalAnswered = false;

function openJournal() {
    try { audio.playMenuSelect(); } catch(e) {}
    const journal = state.mistakeJournal;

    document.getElementById('journal-quiz-area').classList.add('hidden');
    document.getElementById('btn-journal-next').classList.add('hidden');

    // Build stats summary
    const statsEl = document.getElementById('journal-stats');
    const listEl = document.getElementById('journal-list');

    if (journal.length === 0) {
        statsEl.innerHTML = '<p class="journal-empty">No mistakes yet! Keep playing to track your learning.</p>';
        listEl.innerHTML = '';
        document.getElementById('btn-journal-quiz').classList.add('hidden');
        showScreen('journal');
        return;
    }

    // Topic breakdown
    const topicStats = {};
    for (let i = 1; i <= 10; i++) topicStats[i] = { wrong: 0, corrected: 0, topic: STAGE_TOPICS[i] };
    journal.forEach(e => {
        if (!topicStats[e.stage]) return;
        topicStats[e.stage].wrong += e.reviewedWrong;
        topicStats[e.stage].corrected += e.reviewedCorrect;
    });

    const weakTopics = Object.entries(topicStats)
        .filter(([_, v]) => v.wrong > 0)
        .sort((a, b) => (b[1].wrong - b[1].corrected) - (a[1].wrong - a[1].corrected));

    statsEl.innerHTML = `
        <div class="journal-summary">
            <span class="journal-stat">Total Mistakes: <strong>${journal.length}</strong></span>
            <span class="journal-stat">Weakest Topic: <strong>${weakTopics.length > 0 ? weakTopics[0][1].topic : 'None'}</strong></span>
        </div>
        <div class="journal-topics">
            ${weakTopics.map(([stage, s]) => `
                <div class="journal-topic-row">
                    <span class="journal-topic-name">Stage ${stage}: ${s.topic}</span>
                    <span class="journal-topic-count">${s.wrong} missed / ${s.corrected} corrected</span>
                </div>
            `).join('')}
        </div>
    `;

    // List recent mistakes (newest first, max 20)
    const recent = [...journal].sort((a, b) => b.lastMissed - a.lastMissed).slice(0, 20);
    listEl.innerHTML = recent.map(e => `
        <div class="journal-entry">
            <div class="journal-q">${e.question}</div>
            <div class="journal-wrong">Your answer: ${e.yourAnswer}</div>
            <div class="journal-right">Correct: ${e.correctAnswer}</div>
            <div class="journal-explain">${e.explanation}</div>
        </div>
    `).join('');

    document.getElementById('btn-journal-quiz').classList.remove('hidden');
    document.getElementById('btn-journal-quiz').onclick = startJournalQuiz;

    showScreen('journal');
}

function startJournalQuiz() {
    try { audio.playMenuSelect(); } catch(e) {}
    // Get questions from the journal - find matching QUESTIONS entries
    const journalIds = state.mistakeJournal.map(e => e.questionId);
    journalQuestions = shuffleStudy(QUESTIONS.filter(q => journalIds.includes(q.id)));

    if (journalQuestions.length === 0) return;

    journalIndex = 0;
    journalCorrect = 0;
    journalTotal = 0;

    document.getElementById('journal-stats').innerHTML = '';
    document.getElementById('journal-list').innerHTML = '';
    document.getElementById('btn-journal-quiz').classList.add('hidden');
    document.getElementById('journal-quiz-area').classList.remove('hidden');

    showJournalQuestion();
}

function showJournalQuestion() {
    journalAnswered = false;

    if (journalIndex >= journalQuestions.length) {
        const pct = journalTotal > 0 ? Math.round((journalCorrect / journalTotal) * 100) : 0;
        document.getElementById('journal-quiz-question').textContent =
            `Review complete! ${journalCorrect}/${journalTotal} correct (${pct}%).`;
        document.getElementById('journal-quiz-answers').innerHTML = '';
        document.getElementById('journal-quiz-feedback').classList.add('hidden');
        document.getElementById('journal-quiz-progress').textContent = `${journalTotal}/${journalQuestions.length}`;

        const nextBtn = document.getElementById('btn-journal-next');
        nextBtn.textContent = 'BACK TO JOURNAL';
        nextBtn.classList.remove('hidden');
        nextBtn.onclick = () => openJournal();
        return;
    }

    const q = journalQuestions[journalIndex];
    document.getElementById('journal-quiz-progress').textContent = `${journalIndex + 1}/${journalQuestions.length}`;
    document.getElementById('journal-quiz-question').textContent = q.question;
    document.getElementById('journal-quiz-feedback').classList.add('hidden');
    document.getElementById('btn-journal-next').classList.add('hidden');

    const container = document.getElementById('journal-quiz-answers');
    container.innerHTML = '';
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => onJournalAnswer(i, q));
        container.appendChild(btn);
    });
}

function onJournalAnswer(index, q) {
    if (journalAnswered) return;
    journalAnswered = true;

    const correct = index === q.correctIndex;
    journalTotal++;
    if (correct) journalCorrect++;

    // Update journal entry
    const entry = state.mistakeJournal.find(e => e.questionId === q.id);
    if (entry) {
        if (correct) {
            entry.reviewedCorrect++;
        } else {
            entry.reviewedWrong++;
            entry.lastMissed = Date.now();
        }
    }

    // Highlight answers
    const buttons = document.querySelectorAll('#journal-quiz-answers .answer-btn');
    buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === q.correctIndex) btn.classList.add('correct');
        if (i === index && !correct) btn.classList.add('wrong');
    });

    // Show feedback
    const feedback = document.getElementById('journal-quiz-feedback');
    feedback.classList.remove('hidden');
    feedback.innerHTML = correct
        ? `<span class="study-correct-text">&#10003; Correct! You've improved on this one.</span><br><span class="study-explain">${q.explanation}</span>`
        : `<span class="study-wrong-text">&#10007; Still tricky. Review the explanation.</span><br><span class="study-explain">${q.explanation}</span>`;

    const nextBtn = document.getElementById('btn-journal-next');
    nextBtn.textContent = 'NEXT QUESTION';
    nextBtn.classList.remove('hidden');
    nextBtn.onclick = () => { journalIndex++; showJournalQuestion(); };

    // Auto-save progress
    saveGame();
}

// ══════════════════════════════════════════════════════════════
//  SKILL TREE
// ══════════════════════════════════════════════════════════════
const SKILL_TREE = {
    knowledge: {
        name: 'Knowledge', color: '#4488ff',
        skills: [
            { id: 'scholars_focus', name: "Scholar's Focus", cost: 50, desc: 'Timer +2 seconds on all questions', requires: null },
            { id: 'quick_study', name: 'Quick Study', cost: 100, desc: '+5% gold from correct answers', requires: 'scholars_focus' },
            { id: 'appraisers_eye', name: "Appraiser's Eye", cost: 150, desc: 'Timer +3 sec on Stage 4+ questions', requires: 'quick_study' },
            { id: 'master_lender', name: 'Master Lender', cost: 250, desc: 'Questions show topic hint', requires: 'appraisers_eye' },
            { id: 'sage_wisdom', name: 'Sage Wisdom', cost: 400, desc: 'Start each fight with 1 free hint', requires: 'master_lender' },
        ]
    },
    combat: {
        name: 'Combat', color: '#ff4444',
        skills: [
            { id: 'iron_will', name: 'Iron Will', cost: 50, desc: 'Take 1 less damage per hit (min 1)', requires: null },
            { id: 'battle_hardened', name: 'Battle Hardened', cost: 100, desc: 'First wrong answer deals 0 damage', requires: 'iron_will' },
            { id: 'berserker', name: 'Berserker', cost: 150, desc: '3+ combo deals double boss damage', requires: 'battle_hardened' },
            { id: 'phoenix_heart', name: 'Phoenix Heart', cost: 250, desc: 'Survive death once per fight with 1 HP', requires: 'berserker' },
            { id: 'legendary_knight', name: 'Legendary Knight', cost: 400, desc: '+1 shield per fight', requires: 'phoenix_heart' },
        ]
    },
    wealth: {
        name: 'Wealth', color: '#f5c842',
        skills: [
            { id: 'haggler', name: 'Haggler', cost: 50, desc: '10% shop discount', requires: null },
            { id: 'treasure_hunter', name: 'Treasure Hunter', cost: 100, desc: '+15% gold from fights', requires: 'haggler' },
            { id: 'merchants_eye', name: "Merchant's Eye", cost: 150, desc: 'See detailed item stats', requires: 'treasure_hunter' },
            { id: 'golden_touch', name: 'Golden Touch', cost: 250, desc: '+25% gold from fights (stacks)', requires: 'merchants_eye' },
            { id: 'tycoon', name: 'Tycoon', cost: 400, desc: 'Start new games with 50 gold', requires: 'golden_touch' },
        ]
    }
};

function canUnlock(skill) {
    if (hasSkill(skill.id)) return false;
    if (state.xp < skill.cost) return false;
    if (skill.requires && !hasSkill(skill.requires)) return false;
    return true;
}

function unlockSkill(skill) {
    if (!canUnlock(skill)) return;
    state.xp -= skill.cost;
    state.skills[skill.id] = true;
    try { audio.playPurchase(); } catch(e) {}
    saveGame();
    renderSkillTree();
}

function openSkillTree() {
    try { audio.playMenuSelect(); } catch(e) {}
    renderSkillTree();
    showScreen('skills');
}

function renderSkillTree() {
    const container = document.getElementById('skill-tree-content');
    container.innerHTML = `
        <div class="skill-xp-display">Available XP: <strong>${state.xp}</strong> | Total Earned: ${state.totalXp}</div>
    `;

    for (const [branchKey, branch] of Object.entries(SKILL_TREE)) {
        const branchEl = document.createElement('div');
        branchEl.className = 'skill-branch';
        branchEl.innerHTML = `<h3 class="skill-branch-title" style="color: ${branch.color}">${branch.name}</h3>`;

        const skillsRow = document.createElement('div');
        skillsRow.className = 'skill-branch-row';

        branch.skills.forEach((skill, i) => {
            const owned = hasSkill(skill.id);
            const available = canUnlock(skill);
            const locked = !owned && !available;

            const node = document.createElement('div');
            node.className = `skill-node ${owned ? 'skill-owned' : ''} ${available ? 'skill-available' : ''} ${locked ? 'skill-locked' : ''}`;
            node.style.borderColor = owned ? branch.color : '';
            node.innerHTML = `
                <div class="skill-name">${skill.name}</div>
                <div class="skill-desc">${skill.desc}</div>
                <div class="skill-cost">${owned ? 'UNLOCKED' : `${skill.cost} XP`}</div>
            `;

            if (available) {
                node.addEventListener('click', () => unlockSkill(skill));
            }

            skillsRow.appendChild(node);

            // Add connector arrow between skills
            if (i < branch.skills.length - 1) {
                const arrow = document.createElement('div');
                arrow.className = 'skill-arrow';
                arrow.textContent = '\u2192';
                skillsRow.appendChild(arrow);
            }
        });

        branchEl.appendChild(skillsRow);
        container.appendChild(branchEl);
    }
}

// ── Deal Simulator ──
let currentDeal = null;
let dealQuestionIndex = 0;
let dealScore = 0;
let dealTotal = 0;
let dealAnswered = false;

function openDealSimulator() {
    try { audio.playMenuSelect(); } catch(e) {}
    showScreen('deals');
    currentDeal = null;
    dealQuestionIndex = 0;
    dealScore = 0;
    dealTotal = 0;
    dealAnswered = false;
    const list = document.getElementById('deals-list');
    const active = document.getElementById('deal-active');
    const summary = document.getElementById('deal-summary');
    list.classList.remove('hidden');
    active.classList.add('hidden');
    summary.classList.add('hidden');
    list.innerHTML = '';

    DEAL_SCENARIOS.forEach(deal => {
        const completed = state.completedDeals.includes(deal.id);
        const card = document.createElement('div');
        card.className = `deal-card${completed ? ' completed' : ''}`;
        card.innerHTML = `
            <span class="deal-difficulty ${deal.difficulty}">${deal.difficulty.toUpperCase()}</span>
            ${completed ? '<span style="color:var(--green); float:right; font-size:10px;">✓</span>' : ''}
            <div class="deal-card-title">${deal.title}</div>
            <div class="deal-card-type">${deal.property.type}</div>
        `;
        card.addEventListener('click', () => startDeal(deal));
        list.appendChild(card);
    });
}

function startDeal(deal) {
    try { audio.playMenuSelect(); } catch(e) {}
    currentDeal = deal;
    dealQuestionIndex = 0;
    dealScore = 0;
    dealTotal = deal.questions.length;
    dealAnswered = false;

    document.getElementById('deals-list').classList.add('hidden');
    document.getElementById('deal-summary').classList.add('hidden');
    const active = document.getElementById('deal-active');
    active.classList.remove('hidden');

    const fmt = n => '$' + n.toLocaleString();

    document.getElementById('deal-property').innerHTML = `
        <div class="deal-label">PROPERTY</div>
        <div class="deal-value">
            <strong>${deal.property.address}</strong><br>
            Type: ${deal.property.type}<br>
            Current Value: ${fmt(deal.property.currentValue)}<br>
            ARV: ${fmt(deal.property.arv)}<br>
            Repair Cost: ${fmt(deal.property.repairCost)}<br>
            Condition: ${deal.property.condition}
        </div>
    `;

    document.getElementById('deal-borrower').innerHTML = `
        <div class="deal-label">BORROWER</div>
        <div class="deal-value">
            <strong>${deal.borrower.name}</strong><br>
            Experience: ${deal.borrower.experience}<br>
            Credit Score: ${deal.borrower.creditScore}<br>
            Cash Reserves: ${fmt(deal.borrower.cashReserves)}<br>
            Skin in the Game: ${fmt(deal.borrower.skinInTheGame)}
        </div>
    `;

    document.getElementById('deal-loan').innerHTML = `
        <div class="deal-label">LOAN REQUEST</div>
        <div class="deal-value">
            Amount: ${fmt(deal.loanRequest.amount)}<br>
            Purpose: ${deal.loanRequest.purpose}<br>
            Exit Strategy: ${deal.loanRequest.exitStrategy}<br>
            Term: ${deal.loanRequest.term} months
        </div>
    `;

    showDealQuestion();
}

function showDealQuestion() {
    const q = currentDeal.questions[dealQuestionIndex];
    dealAnswered = false;

    document.getElementById('deal-progress').textContent = `Question ${dealQuestionIndex + 1} / ${dealTotal}`;
    document.getElementById('deal-question').textContent = q.question;

    const answersDiv = document.getElementById('deal-answers');
    answersDiv.innerHTML = '';
    const feedback = document.getElementById('deal-feedback');
    feedback.classList.add('hidden');
    feedback.textContent = '';
    document.getElementById('btn-deal-next').classList.add('hidden');

    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'study-answer-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => onDealAnswer(i));
        answersDiv.appendChild(btn);
    });
}

function onDealAnswer(index) {
    if (dealAnswered) return;
    dealAnswered = true;

    const q = currentDeal.questions[dealQuestionIndex];
    const isCorrect = index === q.correctIndex;
    if (isCorrect) dealScore++;

    const btns = document.getElementById('deal-answers').querySelectorAll('.study-answer-btn');
    btns.forEach((btn, i) => {
        btn.style.pointerEvents = 'none';
        if (i === q.correctIndex) {
            btn.style.background = 'rgba(39,174,96,0.4)';
            btn.style.borderColor = '#27ae60';
        } else if (i === index && !isCorrect) {
            btn.style.background = 'rgba(231,76,60,0.4)';
            btn.style.borderColor = '#e74c3c';
        }
    });

    const feedback = document.getElementById('deal-feedback');
    feedback.classList.remove('hidden');
    feedback.style.color = isCorrect ? 'var(--green)' : 'var(--red)';
    feedback.textContent = (isCorrect ? '✓ CORRECT! ' : '✗ WRONG. ') + q.explanation;

    try { isCorrect ? audio.playGoldPickup() : audio.playHit(); } catch(e) {}

    document.getElementById('btn-deal-next').classList.remove('hidden');
}

function onDealNext() {
    dealQuestionIndex++;
    if (dealQuestionIndex < dealTotal) {
        showDealQuestion();
    } else {
        completeDeal();
    }
}

function completeDeal() {
    document.getElementById('deal-active').classList.add('hidden');
    const summary = document.getElementById('deal-summary');
    summary.classList.remove('hidden');

    const pct = Math.round((dealScore / dealTotal) * 100);
    const passed = pct >= 70;
    const xpReward = passed ? 30 + (currentDeal.difficulty === 'hard' ? 30 : currentDeal.difficulty === 'medium' ? 15 : 0) : 10;
    const goldReward = passed ? 20 + (currentDeal.difficulty === 'hard' ? 20 : currentDeal.difficulty === 'medium' ? 10 : 0) : 0;

    if (passed && !state.completedDeals.includes(currentDeal.id)) {
        state.completedDeals.push(currentDeal.id);
    }

    state.xp += xpReward;
    state.totalXp += xpReward;
    state.gold += goldReward;
    saveGame();

    summary.innerHTML = `
        <h2 class="screen-title" style="font-size:14px; margin-bottom:12px;">${passed ? 'DEAL COMPLETE!' : 'NEEDS REVIEW'}</h2>
        <div style="font-size:24px; color:${passed ? 'var(--green)' : 'var(--red)'}; margin-bottom:8px;">${dealScore}/${dealTotal}</div>
        <div style="font-size:10px; color:var(--gray); margin-bottom:12px;">${pct}% Accuracy</div>
        ${goldReward > 0 ? `<div style="color:var(--gold); margin-bottom:4px;">+${goldReward} Gold</div>` : ''}
        <div style="color:var(--blue); margin-bottom:12px;">+${xpReward} XP</div>
        <div style="font-size:9px; color:var(--white); line-height:1.8; margin-bottom:16px;">${currentDeal.summary}</div>
        <button class="pixel-btn" id="btn-deal-back">BACK TO DEALS</button>
    `;

    document.getElementById('btn-deal-back').addEventListener('click', openDealSimulator);
}
