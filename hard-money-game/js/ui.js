// UI System - Shop, Map, Cutscenes, Codex, Settings, event wiring
import { state, combat, showScreen, saveGame, loadGame, getMapNodePos, init as engineInit } from './engine.js';
import { startFight, useHint, useHealthPotion, selectAnswer, startEndlessFight } from './combat.js';
import { BOSS_DATA, INTRO_CUTSCENE, ENDING_CUTSCENE, CODEX_ENTRIES } from './cutscenes.js';
import { SHOP_ITEMS, getRandomQuote } from './shop.js';
import { drawKnight, drawShopkeeper, drawBoss, drawBackground } from './sprites.js';
import { audio } from './audio.js';
import { SaveSystem } from './save.js';

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

    // Cutscene
    document.getElementById('cutscene-overlay').addEventListener('click', advanceCutscene);
    document.getElementById('btn-skip-cutscene').addEventListener('click', skipCutscene);

    // Map
    document.getElementById('btn-shop-from-map').addEventListener('click', () => openShop());
    document.getElementById('btn-codex').addEventListener('click', openCodex);
    document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings'));

    // Map node clicks - use canvas click
    document.getElementById('map-screen').addEventListener('click', onMapClick);

    // Combat
    document.getElementById('btn-hint').addEventListener('click', useHint);

    // Victory
    document.getElementById('btn-victory-continue').addEventListener('click', onVictoryContinue);

    // Death
    document.getElementById('btn-retry').addEventListener('click', onRetry);

    // Shop
    document.getElementById('btn-leave-shop').addEventListener('click', leaveShop);
    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.addEventListener('click', () => switchShopTab(tab.dataset.tab));
    });

    // Codex
    document.getElementById('btn-close-codex').addEventListener('click', () => showScreen('map'));

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
    try { audio.init(); audio.playMenuSelect(); } catch(e) {}

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
            // Rubble on ground
            ctx.fillStyle = '#555555';
            for (let i = 0; i < 12; i++) {
                const rx = 260 + Math.random() * 300;
                const ry = h * 0.6 + Math.random() * 30;
                ctx.fillRect(rx, ry, 8 + Math.random() * 15, 6 + Math.random() * 10);
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
            ctx.fillStyle = '#5555775';
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
            // Celebration - golden sparkles
            ctx.fillStyle = '#ffdd44';
            for (let i = 0; i < 20; i++) {
                const sx = 280 + Math.random() * 240;
                const sy = 50 + Math.random() * 200;
                ctx.fillRect(sx, sy, 3, 3);
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

function launchStage(stageNum) {
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
    document.getElementById('complete-name').textContent = state.playerName;
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

// ── Shop ──
function openShop() {
    try { audio.stopMusic(); audio.playShopMusic(); } catch(e) {}
    shopkeeperClicks = 0;
    document.getElementById('shopkeeper-quote').textContent = `"${getRandomQuote('enter')}"`;
    document.getElementById('shop-gold').textContent = `Gold: ${state.gold}`;
    showScreen('shop');
    switchShopTab('weapons');
    startShopPreview();
}

function leaveShop() {
    try { audio.stopMusic(); audio.playMenuSelect(); audio.playMapMusic(); } catch(e) {}
    stopShopPreview();
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
        const canAfford = state.gold >= item.price;

        const el = document.createElement('div');
        el.className = `shop-item${owned && !item.consumable ? ' owned' : ''}${equipped ? ' equipped' : ''}`;

        el.innerHTML = `
            <div class="item-name">${item.name}</div>
            <div class="item-desc">${item.description}</div>
            <div class="item-price">${item.price === 0 ? 'FREE' : item.price + ' G'}</div>
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

    // Check if can afford
    if (state.gold < item.price) {
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
            <p class="confirm-price">${item.price} Gold</p>
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

function confirmPurchase(item) {
    if (state.gold < item.price) return;

    state.gold -= item.price;

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

// ── Codex ──
function openCodex() {
    try { audio.playMenuSelect(); } catch(e) {}
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
    state.inventory = { potion_hp: 0, potion_time: 0, scroll_hint: 0, shield_block: 0 };
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
    document.getElementById('btn-start').textContent = 'PRESS START';
    showScreen('title');
    try { audio.stopMusic(); } catch(e) {}
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
