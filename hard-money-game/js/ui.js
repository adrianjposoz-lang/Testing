// UI System - Shop, Map, Cutscenes, Codex, Settings, event wiring
import { state, combat, showScreen, saveGame, loadGame, getMapNodePos, init as engineInit } from './engine.js';
import { startFight, useHint, useHealthPotion, selectAnswer, startEndlessFight } from './combat.js';
import { BOSS_DATA, INTRO_CUTSCENE, ENDING_CUTSCENE, CODEX_ENTRIES } from './cutscenes.js';
import { SHOP_ITEMS, getRandomQuote } from './shop.js';
import { drawKnight, drawShopkeeper } from './sprites.js';
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
            ctx.fillStyle = '#2a4a6a';
            ctx.fillRect(0, 0, w, h * 0.6);
            ctx.fillStyle = '#3a8a3a';
            ctx.fillRect(0, h * 0.6, w, h * 0.4);
            // Castle
            ctx.fillStyle = '#8888aa';
            ctx.fillRect(300, 100, 200, 200);
            ctx.fillRect(340, 60, 40, 60);
            ctx.fillRect(420, 60, 40, 60);
            ctx.fillStyle = '#ffdd44';
            for (let i = 0; i < 5; i++) {
                ctx.fillRect(320 + i * 40, 160, 15, 20);
            }
            break;
        case 'kingdom_dark':
        case 'kingdom_ruins':
            ctx.fillStyle = '#1a0a1a';
            ctx.fillRect(0, 0, w, h * 0.6);
            ctx.fillStyle = '#2a1a0a';
            ctx.fillRect(0, h * 0.6, w, h * 0.4);
            ctx.fillStyle = '#444444';
            ctx.fillRect(300, 120, 200, 180);
            ctx.fillRect(340, 80, 40, 60);
            // Cracks
            ctx.fillStyle = '#222222';
            ctx.fillRect(350, 150, 30, 5);
            ctx.fillRect(420, 180, 20, 40);
            // Red glow
            ctx.fillStyle = 'rgba(200,50,50,0.3)';
            ctx.fillRect(0, 0, w, h);
            break;
        case 'throne_room':
            ctx.fillStyle = '#2a1a3a';
            ctx.fillRect(0, 0, w, h);
            // Throne
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(340, 100, 120, 180);
            ctx.fillStyle = '#cc2222';
            ctx.fillRect(350, 110, 100, 80);
            ctx.fillStyle = '#ffdd00';
            ctx.fillRect(380, 80, 40, 30);
            // Pillars
            ctx.fillStyle = '#666688';
            ctx.fillRect(100, 50, 40, 280);
            ctx.fillRect(660, 50, 40, 280);
            break;
        case 'knight_departure':
        case 'knight_sunset':
            ctx.fillStyle = '#ff6633';
            ctx.fillRect(0, 0, w, h * 0.5);
            ctx.fillStyle = '#cc4422';
            ctx.fillRect(0, h * 0.3, w, h * 0.2);
            ctx.fillStyle = '#2a3a2a';
            ctx.fillRect(0, h * 0.5, w, h * 0.5);
            drawKnight(ctx, 380, 200, 4, state.equipment, 0);
            break;
        case 'ledger_complete':
            ctx.fillStyle = '#1a1a3a';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#ffdd44';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(300, 80, 200, 240);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('THE LEDGER', 400, 200);
            break;
        case 'kingdom_restored':
            ctx.fillStyle = '#4488cc';
            ctx.fillRect(0, 0, w, h * 0.6);
            ctx.fillStyle = '#44aa44';
            ctx.fillRect(0, h * 0.6, w, h * 0.4);
            ctx.fillStyle = '#aaaacc';
            ctx.fillRect(300, 100, 200, 200);
            ctx.fillRect(340, 60, 40, 60);
            ctx.fillRect(420, 60, 40, 60);
            ctx.fillStyle = '#ffdd44';
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(310 + i * 25, 160, 12, 20);
            }
            break;
        default:
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, w, h);
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
    if (item.consumable) {
        // Buy consumable
        if (state.gold < item.price) {
            document.getElementById('shopkeeper-quote').textContent = `"${getRandomQuote('tooExpensive')}"`;
            return;
        }
        state.gold -= item.price;
        state.inventory[item.id] = (state.inventory[item.id] || 0) + 1;
        try { audio.playPurchase(); } catch(e) {}
        document.getElementById('shopkeeper-quote').textContent = `"${getRandomQuote('purchase')}"`;
    } else if (state.ownedItems.has(item.id)) {
        // Equip owned item
        state.equipment[item.slot] = item.value;
        try { audio.playMenuSelect(); } catch(e) {}
    } else {
        // Buy new item
        if (state.gold < item.price) {
            document.getElementById('shopkeeper-quote').textContent = `"${getRandomQuote('tooExpensive')}"`;
            return;
        }
        state.gold -= item.price;
        state.ownedItems.add(item.id);
        state.equipment[item.slot] = item.value;
        try { audio.playPurchase(); } catch(e) {}
        document.getElementById('shopkeeper-quote').textContent = `"${getRandomQuote('purchase')}"`;
    }

    document.getElementById('shop-gold').textContent = `Gold: ${state.gold}`;
    // Re-render current tab
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
