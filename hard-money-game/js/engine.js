// Engine - Game state, init, game loop, rendering
import { BOSS_DATA, INTRO_CUTSCENE, ENDING_CUTSCENE, CODEX_ENTRIES } from './cutscenes.js';
import { QUESTIONS, STAGE_TOPICS } from './questions.js';
import { SHOP_ITEMS, getRandomQuote } from './shop.js';
import { SaveSystem } from './save.js';
import { drawKnight, drawBoss, drawBackground, drawGoldCoin, drawHeart } from './sprites.js';
import { audio } from './audio.js';

// ── Game State ──
export const state = {
    screen: 'title',
    playerName: 'Knight',
    gold: 0,
    currentStage: 1,
    completedStages: new Set(),
    equipment: { helmet: 'none', armor: 'basic', sword: 'basic', cape: 'none' },
    ownedItems: new Set(['helmet_none', 'armor_basic', 'sword_basic', 'cape_none']),
    inventory: { potion_hp: 0, potion_time: 0, scroll_hint: 0, shield_block: 0 },
    codexUnlocked: new Set(),
    totalKills: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    bestCombo: 0,
    endlessHighScore: 0,
    titles: [],
    deathsPerStage: {},
    settings: { masterVolume: 0.7, musicVolume: 0.5, sfxVolume: 0.8, skipCutscenes: false },
    endlessMode: false,
    endlessRound: 0
};

// ── Combat State ──
export const combat = {
    bossHp: 5,
    bossMaxHp: 5,
    playerHp: 5,
    playerMaxHp: 5,
    currentQuestion: null,
    questionsAnswered: 0,
    combo: 0,
    maxCombo: 0,
    goldEarned: 0,
    timerValue: 15,
    timerMax: 15,
    timerInterval: null,
    hintsRemaining: 1,
    shieldsRemaining: 0,
    bonusTime: 0,
    isAnswering: false,
    fightQuestions: [],
    questionIndex: 0,
    showingExplanation: false,
    eliminatedIndex: -1,
    bossStage: 1
};

// ── Rendering ──
let canvas, ctx, frame = 0;
let animationId;
const WIDTH = 800, HEIGHT = 600;

export function getCanvas() { return canvas; }
export function getCtx() { return ctx; }
export function getFrame() { return frame; }

export function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Scale canvas for display
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start game loop
    gameLoop();

    // Load settings if saved
    const saved = SaveSystem.load();
    if (saved) {
        document.getElementById('btn-start').textContent = 'CONTINUE';
    }
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    const ratio = WIDTH / HEIGHT;
    let w = container.clientWidth;
    let h = w / ratio;
    if (h > window.innerHeight) {
        h = window.innerHeight;
        w = h * ratio;
    }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
}

function gameLoop() {
    frame++;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    render();
    animationId = requestAnimationFrame(gameLoop);
}

function render() {
    switch (state.screen) {
        case 'title':
            renderTitle();
            break;
        case 'combat':
            renderCombat();
            break;
        case 'map':
            renderMap();
            break;
        default:
            // Other screens use DOM overlays; just draw a dark bg
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            break;
    }
}

function renderTitle() {
    // Animated dark background
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Stars
    for (let i = 0; i < 50; i++) {
        const sx = (i * 137 + frame * 0.1) % WIDTH;
        const sy = (i * 97) % HEIGHT;
        const bright = Math.sin(frame * 0.05 + i) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255,255,200,${bright * 0.8})`;
        ctx.fillRect(sx, sy, 2, 2);
    }
    // Silhouette knight
    drawKnight(ctx, 360, 350, 4, state.equipment, frame);
}

function renderCombat() {
    const bossData = BOSS_DATA[combat.bossStage];
    // Background
    drawBackground(ctx, WIDTH, HEIGHT, combat.bossStage);
    // Knight on left
    drawKnight(ctx, 120, 300, 3, state.equipment, frame);
    // Boss on right
    drawBoss(ctx, 520, 220, 3, combat.bossStage, frame);
}

function renderMap() {
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Map path
    ctx.strokeStyle = '#334455';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 1; i <= 10; i++) {
        const pos = getMapNodePos(i);
        if (i === 1) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
    }
    ctx.stroke();
    // Nodes
    for (let i = 1; i <= 10; i++) {
        const pos = getMapNodePos(i);
        const completed = state.completedStages.has(i);
        const current = i === state.currentStage;
        const locked = i > state.currentStage;

        // Node circle
        if (completed) {
            ctx.fillStyle = '#22aa44';
        } else if (current) {
            const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255,200,44,${pulse})`;
        } else {
            ctx.fillStyle = '#333344';
        }
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Stage number
        ctx.fillStyle = locked ? '#555555' : '#ffffff';
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i.toString(), pos.x, pos.y);

        // Boss name below
        if (!locked && BOSS_DATA[i]) {
            ctx.font = '8px "Press Start 2P", monospace';
            ctx.fillStyle = completed ? '#44cc66' : '#aaaaaa';
            ctx.fillText(BOSS_DATA[i].name, pos.x, pos.y + 32);
        }

        // Checkmark for completed
        if (completed) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px "Press Start 2P", monospace';
            ctx.fillText('✓', pos.x, pos.y - 28);
        }
    }
}

export function getMapNodePos(stage) {
    // Winding path across the map
    const positions = [
        null,
        { x: 80, y: 480 },
        { x: 200, y: 400 },
        { x: 320, y: 460 },
        { x: 440, y: 380 },
        { x: 400, y: 260 },
        { x: 280, y: 200 },
        { x: 400, y: 140 },
        { x: 540, y: 200 },
        { x: 620, y: 320 },
        { x: 700, y: 180 }
    ];
    return positions[stage] || { x: 400, y: 300 };
}

// ── Screen Management ──
export function showScreen(screenName) {
    state.screen = screenName;
    // Hide all overlays
    const overlays = document.querySelectorAll('.overlay');
    overlays.forEach(o => o.classList.add('hidden'));
    // Hide combat-specific UI
    document.getElementById('combat-hud').classList.add('hidden');
    document.getElementById('question-panel').classList.add('hidden');

    switch (screenName) {
        case 'title':
            document.getElementById('title-screen').classList.remove('hidden');
            break;
        case 'name_input':
            document.getElementById('name-screen').classList.remove('hidden');
            document.getElementById('player-name-input').focus();
            break;
        case 'cutscene':
            document.getElementById('cutscene-overlay').classList.remove('hidden');
            break;
        case 'map':
            document.getElementById('map-screen').classList.remove('hidden');
            document.getElementById('map-gold').textContent = `Gold: ${state.gold}`;
            break;
        case 'combat':
            document.getElementById('combat-hud').classList.remove('hidden');
            document.getElementById('question-panel').classList.remove('hidden');
            break;
        case 'shop':
            document.getElementById('shop-screen').classList.remove('hidden');
            break;
        case 'codex':
            document.getElementById('codex-screen').classList.remove('hidden');
            break;
        case 'settings':
            document.getElementById('settings-screen').classList.remove('hidden');
            break;
        case 'victory':
            document.getElementById('victory-screen').classList.remove('hidden');
            break;
        case 'death':
            document.getElementById('death-screen').classList.remove('hidden');
            break;
        case 'complete':
            document.getElementById('complete-screen').classList.remove('hidden');
            break;
    }
}

// ── Save/Load Helpers ──
export function saveGame() {
    const data = {
        ...state,
        completedStages: [...state.completedStages],
        ownedItems: [...state.ownedItems],
        codexUnlocked: [...state.codexUnlocked]
    };
    SaveSystem.save(data);
}

export function loadGame() {
    const data = SaveSystem.load();
    if (!data) return false;
    state.playerName = data.playerName || 'Knight';
    state.gold = data.gold || 0;
    state.currentStage = data.currentStage || 1;
    state.completedStages = new Set(data.completedStages || []);
    state.equipment = data.equipment || { helmet: 'none', armor: 'basic', sword: 'basic', cape: 'none' };
    state.ownedItems = new Set(data.ownedItems || ['helmet_none', 'armor_basic', 'sword_basic', 'cape_none']);
    state.inventory = data.inventory || { potion_hp: 0, potion_time: 0, scroll_hint: 0, shield_block: 0 };
    state.codexUnlocked = new Set(data.codexUnlocked || []);
    state.totalKills = data.totalKills || 0;
    state.totalCorrect = data.totalCorrect || 0;
    state.totalAnswered = data.totalAnswered || 0;
    state.bestCombo = data.bestCombo || 0;
    state.endlessHighScore = data.endlessHighScore || 0;
    state.titles = data.titles || [];
    state.deathsPerStage = data.deathsPerStage || {};
    state.settings = data.settings || state.settings;
    return true;
}
