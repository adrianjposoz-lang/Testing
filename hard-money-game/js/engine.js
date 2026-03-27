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

// ── Animation State ──
export const anim = {
    bossHit: 0,        // frames remaining for boss hit flash
    playerHit: 0,      // frames remaining for player hit flash
    knightAttack: 0,   // frames remaining for knight lunge
    bossAttack: 0,     // frames remaining for boss lunge
    slashX: 0,         // slash effect position
    slashY: 0,
    slashFrame: 0,     // slash effect animation frame
    showSlash: false,
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
    // Background
    drawBackground(ctx, WIDTH, HEIGHT, combat.bossStage);

    // Knight position with attack lunge
    let knightX = 120;
    let knightY = 300;
    if (anim.knightAttack > 0) {
        // Lunge forward toward boss
        const progress = anim.knightAttack / 12;
        const lunge = Math.sin(progress * Math.PI) * 80;
        knightX += lunge;
        anim.knightAttack--;
    }

    // Boss position with attack lunge
    let bossX = 520;
    let bossY = 220;
    if (anim.bossAttack > 0) {
        // Lunge toward player
        const progress = anim.bossAttack / 12;
        const lunge = Math.sin(progress * Math.PI) * 60;
        bossX -= lunge;
        anim.bossAttack--;
    }

    // Draw knight (flash white when hit)
    if (anim.playerHit > 0) {
        // Flash: alternate visible/invisible every 3 frames
        if (Math.floor(anim.playerHit / 3) % 2 === 0) {
            drawKnight(ctx, knightX, knightY, 3, state.equipment, frame);
        }
        // Shake the knight position
        knightX += (Math.random() - 0.5) * 8;
        anim.playerHit--;
    } else {
        drawKnight(ctx, knightX, knightY, 3, state.equipment, frame);
    }

    // Draw boss (flash when hit)
    if (anim.bossHit > 0) {
        if (Math.floor(anim.bossHit / 3) % 2 === 0) {
            drawBoss(ctx, bossX, bossY, 3, combat.bossStage, frame);
        }
        anim.bossHit--;
    } else {
        drawBoss(ctx, bossX, bossY, 3, combat.bossStage, frame);
    }

    // Draw slash effect
    if (anim.showSlash && anim.slashFrame > 0) {
        drawSlashEffect(ctx, anim.slashX, anim.slashY, anim.slashFrame);
        anim.slashFrame--;
        if (anim.slashFrame <= 0) anim.showSlash = false;
    }
}

function drawSlashEffect(ctx, x, y, frame) {
    const progress = 1 - (frame / 10);
    const size = 40 + progress * 30;
    const alpha = frame / 10;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(-0.5 + progress * 0.3);

    // Slash lines - diagonal cuts
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4 - progress * 2;
    ctx.shadowColor = '#ffdd44';
    ctx.shadowBlur = 15;

    // Main slash
    ctx.beginPath();
    ctx.moveTo(-size, -size * 0.6);
    ctx.lineTo(size, size * 0.6);
    ctx.stroke();

    // Cross slash
    ctx.beginPath();
    ctx.moveTo(-size * 0.8, size * 0.4);
    ctx.lineTo(size * 0.8, -size * 0.4);
    ctx.stroke();

    // Sparkles
    ctx.fillStyle = '#ffff88';
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + progress * 3;
        const dist = size * 0.6 * progress;
        const sx = Math.cos(angle) * dist;
        const sy = Math.sin(angle) * dist;
        const sparkSize = (1 - progress) * 4;
        ctx.fillRect(sx - sparkSize/2, sy - sparkSize/2, sparkSize, sparkSize);
    }

    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.globalAlpha = 1;
}

// Terrain themes per stage
const TERRAIN_ZONES = {
    1:  { bg: '#1a3a1a', accent: '#2a5a2a', detail: '#3a6a3a', name: 'forest',    draw: drawForestTerrain },
    2:  { bg: '#3a1a0a', accent: '#5a2a0a', detail: '#ff6622', name: 'volcano',   draw: drawVolcanoTerrain },
    3:  { bg: '#1a3a5a', accent: '#2a5a7a', detail: '#cca866', name: 'beach',     draw: drawBeachTerrain },
    4:  { bg: '#1a1a2a', accent: '#2a2a3a', detail: '#6a6a8a', name: 'graveyard', draw: drawGraveyardTerrain },
    5:  { bg: '#1a2a1a', accent: '#2a4a2a', detail: '#5a7a3a', name: 'swamp',     draw: drawSwampTerrain },
    6:  { bg: '#0a2a1a', accent: '#0a3a2a', detail: '#1a5a3a', name: 'deepwoods', draw: drawDeepwoodsTerrain },
    7:  { bg: '#2a0a0a', accent: '#4a0a0a', detail: '#ff3300', name: 'hellscape', draw: drawHellTerrain },
    8:  { bg: '#1a1a1a', accent: '#2a2a3a', detail: '#4a4a5a', name: 'dungeon',   draw: drawDungeonTerrain },
    9:  { bg: '#2a1a3a', accent: '#4a2a5a', detail: '#aa66cc', name: 'sky',       draw: drawSkyTerrain },
    10: { bg: '#1a1a2a', accent: '#2a2a3a', detail: '#aa8844', name: 'castle',    draw: drawCastleTerrain },
};

function drawForestTerrain(ctx, cx, cy, r) {
    // Trees around the node
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.sin(i * 3) * 0.3;
        const d = r * 0.5 + Math.sin(i * 5) * r * 0.2;
        const tx = cx + Math.cos(a) * d;
        const ty = cy + Math.sin(a) * d;
        // Trunk
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(tx - 2, ty, 4, 10);
        // Canopy
        ctx.fillStyle = '#2a6a2a';
        ctx.beginPath();
        ctx.arc(tx, ty - 2, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3a8a3a';
        ctx.beginPath();
        ctx.arc(tx + 2, ty - 4, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawVolcanoTerrain(ctx, cx, cy, r) {
    // Volcanic rocks and lava cracks
    ctx.fillStyle = '#3a2a1a';
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const d = r * 0.5 + Math.sin(i * 4) * r * 0.15;
        const rx = cx + Math.cos(a) * d;
        const ry = cy + Math.sin(a) * d;
        ctx.fillRect(rx - 4, ry - 3, 8, 6);
    }
    // Lava glow lines
    ctx.strokeStyle = `rgba(255,100,0,${0.4 + Math.sin(frame * 0.1) * 0.2})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.25, cy + Math.sin(a) * r * 0.25);
        ctx.lineTo(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55);
        ctx.stroke();
    }
}

function drawBeachTerrain(ctx, cx, cy, r) {
    // Sandy patches
    ctx.fillStyle = '#cca866';
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        const d = r * 0.45;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 12, 6, a, 0, Math.PI * 2);
        ctx.fill();
    }
    // Animated waves
    ctx.strokeStyle = `rgba(100,180,255,${0.5 + Math.sin(frame * 0.06) * 0.3})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        const wy = cy - r * 0.3 + i * 12;
        ctx.beginPath();
        for (let x = cx - r * 0.5; x < cx + r * 0.5; x += 4) {
            ctx.lineTo(x, wy + Math.sin((x + frame * 2) * 0.08) * 3);
        }
        ctx.stroke();
    }
}

function drawGraveyardTerrain(ctx, cx, cy, r) {
    // Tombstones
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        const d = r * 0.5;
        const gx = cx + Math.cos(a) * d;
        const gy = cy + Math.sin(a) * d;
        ctx.fillStyle = '#5a5a6a';
        ctx.fillRect(gx - 3, gy - 6, 6, 10);
        // Rounded top
        ctx.beginPath();
        ctx.arc(gx, gy - 6, 3, Math.PI, 0);
        ctx.fill();
        // Cross
        ctx.fillStyle = '#3a3a4a';
        ctx.fillRect(gx - 0.5, gy - 5, 1, 4);
        ctx.fillRect(gx - 2, gy - 4, 4, 1);
    }
    // Fog wisps
    ctx.fillStyle = `rgba(150,150,180,${0.1 + Math.sin(frame * 0.03) * 0.05})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.3, r * 0.6, 10, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawSwampTerrain(ctx, cx, cy, r) {
    // Murky water pools
    ctx.fillStyle = '#2a4a1a';
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.7;
        const d = r * 0.45;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 14, 8, a * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    // Bubbles
    const bubblePhase = (frame * 0.05) % (Math.PI * 2);
    ctx.fillStyle = `rgba(100,160,60,${0.4 + Math.sin(bubblePhase) * 0.3})`;
    for (let i = 0; i < 3; i++) {
        const bx = cx + Math.sin(i * 2.5 + frame * 0.02) * r * 0.3;
        const by = cy + Math.cos(i * 3.1 + frame * 0.015) * r * 0.2;
        ctx.beginPath();
        ctx.arc(bx, by, 2 + Math.sin(frame * 0.1 + i) * 1, 0, Math.PI * 2);
        ctx.fill();
    }
    // Reeds
    ctx.strokeStyle = '#4a6a2a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const rx = cx + Math.cos(a) * r * 0.5;
        const ry = cy + Math.sin(a) * r * 0.4;
        ctx.beginPath();
        ctx.moveTo(rx, ry + 5);
        ctx.lineTo(rx + Math.sin(frame * 0.04 + i) * 2, ry - 10);
        ctx.stroke();
    }
}

function drawDeepwoodsTerrain(ctx, cx, cy, r) {
    // Dense dark trees
    for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const d = r * 0.5 + Math.sin(i * 7) * r * 0.15;
        const tx = cx + Math.cos(a) * d;
        const ty = cy + Math.sin(a) * d;
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(tx - 2, ty - 2, 4, 14);
        ctx.fillStyle = '#0a3a1a';
        ctx.beginPath();
        ctx.moveTo(tx - 8, ty);
        ctx.lineTo(tx, ty - 14);
        ctx.lineTo(tx + 8, ty);
        ctx.fill();
        ctx.fillStyle = '#0a4a2a';
        ctx.beginPath();
        ctx.moveTo(tx - 6, ty - 5);
        ctx.lineTo(tx, ty - 16);
        ctx.lineTo(tx + 6, ty - 5);
        ctx.fill();
    }
    // Fireflies
    for (let i = 0; i < 4; i++) {
        const fx = cx + Math.sin(frame * 0.02 + i * 1.7) * r * 0.4;
        const fy = cy + Math.cos(frame * 0.025 + i * 2.3) * r * 0.3;
        const glow = 0.3 + Math.sin(frame * 0.1 + i * 3) * 0.3;
        ctx.fillStyle = `rgba(180,255,100,${glow})`;
        ctx.beginPath();
        ctx.arc(fx, fy, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawHellTerrain(ctx, cx, cy, r) {
    // Fire pillars
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.2;
        const d = r * 0.5;
        const fx = cx + Math.cos(a) * d;
        const fy = cy + Math.sin(a) * d;
        const flicker = Math.sin(frame * 0.15 + i * 2) * 3;
        // Fire base
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.moveTo(fx - 4, fy + 4);
        ctx.lineTo(fx + flicker * 0.5, fy - 10 + flicker);
        ctx.lineTo(fx + 4, fy + 4);
        ctx.fill();
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(fx - 2, fy + 2);
        ctx.lineTo(fx + flicker * 0.3, fy - 6 + flicker * 0.5);
        ctx.lineTo(fx + 2, fy + 2);
        ctx.fill();
    }
    // Cracks with glow
    ctx.strokeStyle = `rgba(255,60,0,${0.5 + Math.sin(frame * 0.08) * 0.2})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.15, cy + Math.sin(a) * r * 0.15);
        const ma = a + Math.sin(i * 3) * 0.3;
        ctx.lineTo(cx + Math.cos(ma) * r * 0.5, cy + Math.sin(ma) * r * 0.5);
        ctx.stroke();
    }
}

function drawDungeonTerrain(ctx, cx, cy, r) {
    // Stone blocks
    ctx.fillStyle = '#3a3a4a';
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const d = r * 0.5;
        const bx = cx + Math.cos(a) * d - 5;
        const by = cy + Math.sin(a) * d - 4;
        ctx.fillRect(bx, by, 10, 8);
        ctx.strokeStyle = '#2a2a3a';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, 10, 8);
    }
    // Chains
    ctx.strokeStyle = '#5a5a6a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
        const cx2 = cx + (i === 0 ? -r * 0.35 : r * 0.35);
        for (let j = 0; j < 3; j++) {
            ctx.beginPath();
            ctx.ellipse(cx2, cy - r * 0.3 + j * 8, 3, 4, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

function drawSkyTerrain(ctx, cx, cy, r) {
    // Clouds
    ctx.fillStyle = `rgba(180,150,220,${0.25 + Math.sin(frame * 0.03) * 0.1})`;
    for (let i = 0; i < 4; i++) {
        const cloudX = cx + Math.sin(i * 2.5 + frame * 0.008) * r * 0.5;
        const cloudY = cy - r * 0.2 + i * 10;
        ctx.beginPath();
        ctx.ellipse(cloudX, cloudY, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cloudX + 10, cloudY + 2, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    // Lightning flicker
    if (Math.sin(frame * 0.2) > 0.95) {
        ctx.strokeStyle = 'rgba(200,180,255,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - r * 0.4);
        ctx.lineTo(cx + 3, cy - r * 0.2);
        ctx.lineTo(cx - 2, cy);
        ctx.lineTo(cx + 5, cy + r * 0.2);
        ctx.stroke();
    }
    // Stars
    for (let i = 0; i < 6; i++) {
        const sx = cx + Math.cos(i * 1.1) * r * 0.55;
        const sy = cy + Math.sin(i * 1.7) * r * 0.35;
        const twinkle = 0.3 + Math.sin(frame * 0.08 + i * 2) * 0.3;
        ctx.fillStyle = `rgba(220,200,255,${twinkle})`;
        ctx.fillRect(sx - 1, sy - 1, 2, 2);
    }
}

function drawCastleTerrain(ctx, cx, cy, r) {
    // Castle turrets
    ctx.fillStyle = '#4a4a5a';
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        const d = r * 0.5;
        const tx = cx + Math.cos(a) * d;
        const ty = cy + Math.sin(a) * d;
        // Tower body
        ctx.fillRect(tx - 4, ty - 8, 8, 16);
        // Battlements
        ctx.fillStyle = '#5a5a6a';
        ctx.fillRect(tx - 5, ty - 10, 3, 4);
        ctx.fillRect(tx + 2, ty - 10, 3, 4);
        ctx.fillStyle = '#4a4a5a';
        // Window
        ctx.fillStyle = '#ffcc44';
        ctx.fillRect(tx - 1, ty - 4, 2, 3);
        ctx.fillStyle = '#4a4a5a';
    }
    // Banner
    const bannerWave = Math.sin(frame * 0.06) * 2;
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.15, cy - r * 0.45);
    ctx.lineTo(cx + r * 0.15 + 10 + bannerWave, cy - r * 0.4);
    ctx.lineTo(cx + r * 0.15, cy - r * 0.35);
    ctx.fill();
}

function drawMapWorldBackground(ctx, w, h) {
    // Base green grassland
    ctx.fillStyle = '#1a3322';
    ctx.fillRect(0, 0, w, h);

    // Grass texture - subtle pixel variation
    for (let gx = 0; gx < w; gx += 8) {
        for (let gy = 0; gy < h; gy += 8) {
            const n = Math.sin(gx * 0.7 + gy * 0.5) * 0.5 + Math.sin(gx * 0.3 - gy * 0.8) * 0.5;
            const shade = Math.floor(n * 8);
            const g = 0x33 + shade;
            ctx.fillStyle = `rgb(${0x1a + shade},${g},${0x22 + shade})`;
            ctx.fillRect(gx, gy, 8, 8);
        }
    }

    // Lighter grass patches (meadows)
    const meadows = [
        { x: 150, y: 350, rx: 80, ry: 50 },
        { x: 500, y: 300, rx: 70, ry: 45 },
        { x: 350, y: 500, rx: 90, ry: 40 },
        { x: 650, y: 420, rx: 60, ry: 35 },
    ];
    for (const m of meadows) {
        ctx.fillStyle = 'rgba(40,70,35,0.6)';
        ctx.beginPath();
        ctx.ellipse(m.x, m.y, m.rx, m.ry, 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Dirt/brown patches (paths between areas)
    ctx.fillStyle = '#3a2a1a';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Main dirt road following the path
    ctx.beginPath();
    ctx.moveTo(80, 480);
    ctx.lineTo(200, 400);
    ctx.lineTo(320, 460);
    ctx.lineTo(440, 380);
    ctx.lineTo(400, 260);
    ctx.lineTo(280, 200);
    ctx.lineTo(400, 140);
    ctx.lineTo(540, 200);
    ctx.lineTo(620, 320);
    ctx.lineTo(700, 180);
    ctx.stroke();
    // Dirt road texture
    ctx.strokeStyle = '#4a3a2a';
    ctx.lineWidth = 6;
    ctx.setLineDash([4, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    // River flowing across the map (between stages 3-5 area)
    ctx.strokeStyle = '#1a4a6a';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, 520);
    ctx.bezierCurveTo(100, 530, 250, 490, 350, 520);
    ctx.bezierCurveTo(450, 550, 550, 480, 700, 500);
    ctx.bezierCurveTo(750, 490, 780, 510, 810, 500);
    ctx.stroke();
    // River highlight
    ctx.strokeStyle = '#2a6a8a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-10, 518);
    ctx.bezierCurveTo(100, 528, 250, 488, 350, 518);
    ctx.bezierCurveTo(450, 548, 550, 478, 700, 498);
    ctx.bezierCurveTo(750, 488, 780, 508, 810, 498);
    ctx.stroke();
    // Animated water shimmer
    ctx.strokeStyle = `rgba(100,180,220,${0.15 + Math.sin(frame * 0.04) * 0.1})`;
    ctx.lineWidth = 2;
    for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        for (let x = 0; x < w; x += 6) {
            const baseY = 520 + Math.sin(x * 0.01 + 1) * 30 - Math.sin(x * 0.005) * 20;
            const wy = baseY + j * 3 + Math.sin((x + frame * 3) * 0.1) * 2;
            if (x === 0) ctx.moveTo(x, wy);
            else ctx.lineTo(x, wy);
        }
        ctx.stroke();
    }

    // Mountain range across top of map
    ctx.fillStyle = '#2a2a3a';
    for (let i = 0; i < 12; i++) {
        const mx = i * 75 - 20;
        const mh = 40 + Math.sin(i * 1.8) * 25 + Math.sin(i * 0.7) * 15;
        const mw = 60 + Math.sin(i * 2.3) * 20;
        ctx.beginPath();
        ctx.moveTo(mx - mw / 2, 80);
        ctx.lineTo(mx, 80 - mh);
        ctx.lineTo(mx + mw / 2, 80);
        ctx.fill();
    }
    // Snow caps
    ctx.fillStyle = '#889999';
    for (let i = 0; i < 12; i++) {
        const mx = i * 75 - 20;
        const mh = 40 + Math.sin(i * 1.8) * 25 + Math.sin(i * 0.7) * 15;
        const mw = 60 + Math.sin(i * 2.3) * 20;
        ctx.beginPath();
        ctx.moveTo(mx - mw * 0.15, 80 - mh + mh * 0.25);
        ctx.lineTo(mx, 80 - mh);
        ctx.lineTo(mx + mw * 0.15, 80 - mh + mh * 0.25);
        ctx.fill();
    }

    // Hills (rolling bumps across terrain)
    const hills = [
        { x: 50, y: 380, rx: 60, ry: 20, c: '#1e3a25' },
        { x: 600, y: 450, rx: 70, ry: 18, c: '#1e3825' },
        { x: 720, y: 350, rx: 50, ry: 15, c: '#1c3622' },
        { x: 180, y: 280, rx: 55, ry: 16, c: '#1e3a28' },
        { x: 550, y: 140, rx: 45, ry: 14, c: '#1a3424' },
        { x: 130, y: 160, rx: 65, ry: 18, c: '#1c3826' },
    ];
    for (const h of hills) {
        ctx.fillStyle = h.c;
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, h.rx, h.ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Scattered trees in background (small pixel trees)
    const bgTrees = [
        { x: 30, y: 350 }, { x: 55, y: 360 }, { x: 140, y: 320 },
        { x: 170, y: 280 }, { x: 520, y: 450 }, { x: 580, y: 420 },
        { x: 650, y: 380 }, { x: 710, y: 400 }, { x: 130, y: 170 },
        { x: 160, y: 150 }, { x: 750, y: 280 }, { x: 770, y: 300 },
        { x: 10, y: 250 }, { x: 40, y: 230 }, { x: 580, y: 100 },
        { x: 200, y: 140 }, { x: 470, y: 460 }, { x: 690, y: 140 },
    ];
    for (const t of bgTrees) {
        ctx.fillStyle = '#3a2a15';
        ctx.fillRect(t.x - 1, t.y + 2, 2, 6);
        ctx.fillStyle = '#1a4a1a';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2a5a2a';
        ctx.beginPath();
        ctx.arc(t.x + 1, t.y - 1, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Rocky outcrops (small gray patches)
    const rocks = [
        { x: 460, y: 150 }, { x: 300, y: 350 }, { x: 680, y: 260 },
        { x: 100, y: 440 }, { x: 550, y: 350 }, { x: 370, y: 420 },
    ];
    for (const r of rocks) {
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(r.x - 4, r.y - 2, 8, 5);
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(r.x - 2, r.y - 3, 5, 3);
    }

    // Small flowers/grass tufts
    for (let i = 0; i < 30; i++) {
        const fx = (i * 127 + 33) % w;
        const fy = 100 + (i * 83 + 17) % (h - 150);
        ctx.fillStyle = i % 3 === 0 ? '#4a7a3a' : i % 3 === 1 ? '#5a8a4a' : '#3a6a2a';
        ctx.fillRect(fx, fy, 3, 3);
        if (i % 4 === 0) {
            ctx.fillStyle = '#cc8844';
            ctx.fillRect(fx + 1, fy - 1, 1, 1);
        }
    }
}

function renderMap() {
    // Rich world background
    drawMapWorldBackground(ctx, WIDTH, HEIGHT);

    // Draw terrain zones behind everything
    for (let i = 1; i <= 10; i++) {
        const pos = getMapNodePos(i);
        const zone = TERRAIN_ZONES[i];
        const radius = 55;

        // Terrain background circle (radial gradient feel)
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.clip();

        // Base fill
        ctx.fillStyle = zone.bg;
        ctx.fillRect(pos.x - radius, pos.y - radius, radius * 2, radius * 2);

        // Accent ring
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = zone.accent;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        // Draw terrain-specific details
        ctx.globalAlpha = 1;
        zone.draw(ctx, pos.x, pos.y, radius);

        ctx.restore();

        // Soft blended edge (feathered border)
        for (let r = radius + 6; r > radius - 2; r -= 2) {
            ctx.save();
            ctx.globalAlpha = 0.04;
            ctx.strokeStyle = zone.bg;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // Dirt road path connecting nodes
    ctx.strokeStyle = '#5a4a30';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);
    ctx.beginPath();
    for (let i = 1; i <= 10; i++) {
        const pos = getMapNodePos(i);
        if (i === 1) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
    }
    ctx.stroke();
    // Road detail lines
    ctx.strokeStyle = '#6a5a3a';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    for (let i = 1; i <= 10; i++) {
        const pos = getMapNodePos(i);
        if (i === 1) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Nodes
    for (let i = 1; i <= 10; i++) {
        const pos = getMapNodePos(i);
        const completed = state.completedStages.has(i);
        const current = i === state.currentStage;
        const locked = i > state.currentStage;

        // Node outer glow
        if (current) {
            const glowPulse = 0.2 + Math.sin(frame * 0.08) * 0.15;
            ctx.fillStyle = `rgba(255,200,44,${glowPulse})`;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2);
            ctx.fill();
        }

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
        ctx.strokeStyle = completed ? '#44dd66' : current ? '#ffcc44' : '#666677';
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
            // Dark background for readability
            ctx.font = '8px "Press Start 2P", monospace';
            const nameWidth = ctx.measureText(BOSS_DATA[i].name).width;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(pos.x - nameWidth / 2 - 3, pos.y + 25, nameWidth + 6, 14);
            ctx.fillStyle = completed ? '#44cc66' : '#ddddcc';
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
