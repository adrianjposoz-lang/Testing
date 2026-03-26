// Sprite Rendering System - Pixel Art for The Ledger & The Sword
// All art drawn procedurally on Canvas

function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

export function drawKnight(ctx, x, y, scale, equipment = {}, frame = 0) {
    const s = scale || 2;
    const p = (dx, dy, w, h, c) => px(ctx, x + dx * s, y + dy * s, w * s, h * s, c);
    const bounce = Math.sin(frame * 0.1) * 2;
    const by = bounce;

    // Cape
    const capeColors = { red: '#cc2222', blue: '#2244cc', purple: '#8822cc', rainbow: '#ff6600', none: null };
    const capeColor = capeColors[equipment.cape] || null;
    if (capeColor) {
        p(-8, 8 + by, 4, 14, capeColor);
        p(-6, 22 + by, 3, 4, capeColor);
        if (equipment.cape === 'rainbow') {
            p(-8, 8 + by, 4, 4, '#ff0000');
            p(-8, 12 + by, 4, 3, '#ff8800');
            p(-8, 15 + by, 4, 3, '#ffff00');
            p(-8, 18 + by, 4, 3, '#00cc00');
            p(-6, 21 + by, 3, 3, '#0000ff');
        }
    }

    // Body/Armor
    const armorColors = { basic: '#888888', chain: '#aaaacc', plate: '#4466aa', golden: '#ddaa22' };
    const armorColor = armorColors[equipment.armor] || '#888888';
    p(0, 10 + by, 12, 12, armorColor);
    p(2, 10 + by, 8, 12, shadeColor(armorColor, -20));

    // Legs
    p(1, 22 + by, 4, 8, '#666666');
    p(7, 22 + by, 4, 8, '#666666');
    // Boots
    p(0, 28 + by, 5, 2, '#553311');
    p(6, 28 + by, 5, 2, '#553311');

    // Arms
    p(-3, 12 + by, 3, 8, armorColor);
    p(12, 12 + by, 3, 8, armorColor);

    // Head
    p(2, 0 + by, 8, 10, '#ffcc99');
    // Eyes
    p(3, 4 + by, 2, 2, '#000000');
    p(7, 4 + by, 2, 2, '#000000');
    // Mouth
    p(4, 7 + by, 4, 1, '#cc6644');

    // Helmet
    const helmColors = { none: null, iron: '#999999', gold: '#ddaa22', horned: '#555555' };
    const helmColor = helmColors[equipment.helmet];
    if (helmColor) {
        p(1, -1 + by, 10, 5, helmColor);
        p(2, -2 + by, 8, 2, helmColor);
        if (equipment.helmet === 'horned') {
            p(0, -4 + by, 2, 4, '#777777');
            p(10, -4 + by, 2, 4, '#777777');
        }
        // Visor slit
        p(3, 3 + by, 6, 2, '#333333');
    }

    // Sword
    const swordColors = { basic: '#cccccc', flame: '#ff6600', ice: '#44aaff', golden: '#ffdd00' };
    const swordColor = swordColors[equipment.sword] || '#cccccc';
    p(14, 6 + by, 2, 14, swordColor);
    p(13, 4 + by, 4, 2, swordColor);
    // Sword handle
    p(13, 18 + by, 4, 3, '#8B4513');
    // Glow effect for special swords
    if (equipment.sword === 'flame') {
        ctx.globalAlpha = 0.3 + Math.sin(frame * 0.2) * 0.15;
        p(12, 4 + by, 6, 14, '#ff4400');
        ctx.globalAlpha = 1;
    } else if (equipment.sword === 'ice') {
        ctx.globalAlpha = 0.3 + Math.sin(frame * 0.2) * 0.15;
        p(12, 4 + by, 6, 14, '#88ccff');
        ctx.globalAlpha = 1;
    }

    // Shield
    p(-6, 12 + by, 5, 8, '#4444aa');
    p(-5, 13 + by, 3, 6, '#6666cc');
    p(-4, 15 + by, 1, 2, '#ffdd00');
}

function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

export function drawBoss(ctx, x, y, scale, bossId, frame = 0) {
    const s = scale || 2;
    const p = (dx, dy, w, h, c) => px(ctx, x + dx * s, y + dy * s, w * s, h * s, c);
    const bob = Math.sin(frame * 0.08) * 3;

    switch (bossId) {
        case 1: drawLoanGoblin(p, bob, frame); break;
        case 2: drawInterestRateImp(p, bob, frame); break;
        case 3: drawCollateralCrab(p, bob, frame); break;
        case 4: drawAppraisalGhost(p, bob, frame, ctx, x, y, s); break;
        case 5: drawEscrowOgre(p, bob, frame); break;
        case 6: drawLTVWerewolf(p, bob, frame); break;
        case 7: drawDefaultDemon(p, bob, frame); break;
        case 8: drawUnderwritingHydra(p, bob, frame); break;
        case 9: drawForeclosurePhoenix(p, bob, frame, ctx, x, y, s); break;
        case 10: drawARVDragon(p, bob, frame, ctx, x, y, s); break;
    }
}

function drawLoanGoblin(p, bob, frame) {
    // Body - small green goblin
    p(4, 10 + bob, 16, 14, '#44aa33');
    p(6, 8 + bob, 12, 4, '#44aa33');
    // Eyes - big yellow
    p(6, 10 + bob, 4, 4, '#ffff00');
    p(14, 10 + bob, 4, 4, '#ffff00');
    p(7, 11 + bob, 2, 2, '#000000');
    p(15, 11 + bob, 2, 2, '#000000');
    // Pointy ears
    p(0, 8 + bob, 4, 3, '#44aa33');
    p(20, 8 + bob, 4, 3, '#44aa33');
    // Mouth/teeth
    p(8, 18 + bob, 8, 3, '#220000');
    p(9, 18 + bob, 2, 2, '#ffffff');
    p(13, 18 + bob, 2, 2, '#ffffff');
    // Legs
    p(6, 24 + bob, 4, 6, '#44aa33');
    p(14, 24 + bob, 4, 6, '#44aa33');
    // Money bag
    p(22, 14 + bob, 10, 10, '#ccaa44');
    p(24, 12 + bob, 6, 3, '#ccaa44');
    p(25, 17 + bob, 4, 4, '#ffdd00');
}

function drawInterestRateImp(p, bob, frame) {
    // Body - red imp
    p(6, 12 + bob, 14, 12, '#cc2222');
    p(8, 8 + bob, 10, 6, '#cc2222');
    // Horns shaped like % signs
    p(6, 2 + bob, 3, 6, '#ff4444');
    p(17, 2 + bob, 3, 6, '#ff4444');
    p(5, 1 + bob, 2, 2, '#ffaa00');
    p(18, 1 + bob, 2, 2, '#ffaa00');
    // Eyes
    p(9, 10 + bob, 3, 3, '#ffff00');
    p(14, 10 + bob, 3, 3, '#ffff00');
    p(10, 11 + bob, 1, 1, '#000000');
    p(15, 11 + bob, 1, 1, '#000000');
    // Grin
    p(9, 16 + bob, 8, 2, '#880000');
    // Wings
    p(-2, 10 + bob, 6, 8, '#aa1111');
    p(22, 10 + bob, 6, 8, '#aa1111');
    // Tail
    p(20, 22 + bob, 6, 2, '#cc2222');
    p(24, 20 + bob, 3, 3, '#ff4444');
    // Legs
    p(8, 24 + bob, 4, 6, '#cc2222');
    p(14, 24 + bob, 4, 6, '#cc2222');
}

function drawCollateralCrab(p, bob, frame) {
    const claw = Math.sin(frame * 0.15) * 3;
    // Shell
    p(6, 8 + bob, 20, 14, '#2288aa');
    p(10, 6 + bob, 12, 4, '#2288aa');
    // Gem on shell
    p(12, 10 + bob, 8, 6, '#44ddff');
    p(14, 12 + bob, 4, 2, '#aaffff');
    // Eyes on stalks
    p(8, 2 + bob, 3, 6, '#2288aa');
    p(21, 2 + bob, 3, 6, '#2288aa');
    p(8, 0 + bob, 3, 3, '#ffffff');
    p(21, 0 + bob, 3, 3, '#ffffff');
    p(9, 1 + bob, 1, 1, '#000000');
    p(22, 1 + bob, 1, 1, '#000000');
    // Claws
    p(-6, 10 + claw, 8, 4, '#cc4422');
    p(-8, 8 + claw, 4, 4, '#cc4422');
    p(-8, 14 + claw, 4, 4, '#cc4422');
    p(30, 10 - claw, 8, 4, '#cc4422');
    p(36, 8 - claw, 4, 4, '#cc4422');
    p(36, 14 - claw, 4, 4, '#cc4422');
    // Legs
    p(4, 20 + bob, 3, 6, '#1a6688');
    p(10, 22 + bob, 3, 6, '#1a6688');
    p(19, 22 + bob, 3, 6, '#1a6688');
    p(25, 20 + bob, 3, 6, '#1a6688');
}

function drawAppraisalGhost(p, bob, frame, ctx, x, y, s) {
    // Ghostly body with transparency
    ctx.globalAlpha = 0.6 + Math.sin(frame * 0.1) * 0.2;
    p(6, 6 + bob, 20, 20, '#ddddff');
    p(10, 2 + bob, 12, 6, '#ddddff');
    // Wavy bottom
    p(6, 24 + bob, 6, 4, '#ddddff');
    p(14, 26 + bob, 4, 4, '#ddddff');
    p(22, 24 + bob, 6, 4, '#ddddff');
    // Eyes
    p(10, 10 + bob, 4, 5, '#000000');
    p(18, 10 + bob, 4, 5, '#000000');
    p(11, 11 + bob, 2, 2, '#4444ff');
    p(19, 11 + bob, 2, 2, '#4444ff');
    // Mouth (O shape)
    p(13, 18 + bob, 6, 4, '#8888aa');
    p(14, 19 + bob, 4, 2, '#aaaacc');
    // Magnifying glass
    p(28, 8 + bob, 8, 8, '#aaaacc');
    p(30, 10 + bob, 4, 4, '#ccddff');
    p(26, 16 + bob, 3, 6, '#888888');
    ctx.globalAlpha = 1;
}

function drawEscrowOgre(p, bob, frame) {
    // Large body
    p(4, 10 + bob, 24, 18, '#668833');
    p(8, 4 + bob, 16, 8, '#668833');
    // Belly
    p(8, 14 + bob, 16, 10, '#7a9944');
    // Eyes
    p(10, 6 + bob, 4, 4, '#ffff88');
    p(18, 6 + bob, 4, 4, '#ffff88');
    p(11, 7 + bob, 2, 2, '#000000');
    p(19, 7 + bob, 2, 2, '#000000');
    // Mouth
    p(11, 14 + bob, 10, 3, '#333300');
    p(12, 14 + bob, 2, 2, '#ffffff');
    p(18, 14 + bob, 2, 2, '#ffffff');
    // Arms
    p(-4, 12 + bob, 6, 12, '#668833');
    p(30, 12 + bob, 6, 12, '#668833');
    // Padlock held
    p(30, 18 + bob, 8, 8, '#bbbb33');
    p(32, 16 + bob, 4, 3, '#bbbb33');
    p(33, 21 + bob, 2, 2, '#333333');
    // Legs
    p(8, 28 + bob, 6, 6, '#668833');
    p(18, 28 + bob, 6, 6, '#668833');
    // Feet
    p(6, 32 + bob, 8, 2, '#554422');
    p(16, 32 + bob, 8, 2, '#554422');
}

function drawLTVWerewolf(p, bob, frame) {
    // Body
    p(6, 10 + bob, 20, 16, '#777788');
    p(8, 4 + bob, 16, 8, '#777788');
    // Snout
    p(10, 10 + bob, 14, 6, '#666677');
    p(18, 10 + bob, 6, 4, '#999999');
    // Ears
    p(8, 0 + bob, 5, 5, '#777788');
    p(19, 0 + bob, 5, 5, '#777788');
    p(9, 1 + bob, 3, 3, '#aa7777');
    p(20, 1 + bob, 3, 3, '#aa7777');
    // Glowing eyes
    p(10, 6 + bob, 4, 3, '#ff4444');
    p(18, 6 + bob, 4, 3, '#ff4444');
    p(11, 7 + bob, 2, 1, '#ffff00');
    p(19, 7 + bob, 2, 1, '#ffff00');
    // Teeth
    p(16, 14 + bob, 2, 3, '#ffffff');
    p(20, 14 + bob, 2, 3, '#ffffff');
    // Claws
    p(-2, 14 + bob, 6, 10, '#777788');
    p(-4, 22 + bob, 2, 2, '#ffffff');
    p(-2, 23 + bob, 2, 2, '#ffffff');
    p(28, 14 + bob, 6, 10, '#777788');
    p(32, 22 + bob, 2, 2, '#ffffff');
    p(30, 23 + bob, 2, 2, '#ffffff');
    // Legs
    p(8, 26 + bob, 6, 8, '#777788');
    p(18, 26 + bob, 6, 8, '#777788');
}

function drawDefaultDemon(p, bob, frame) {
    // Body
    p(6, 12 + bob, 20, 16, '#881111');
    p(8, 6 + bob, 16, 8, '#881111');
    // Horns
    p(6, 0 + bob, 3, 7, '#550000');
    p(23, 0 + bob, 3, 7, '#550000');
    p(5, -2 + bob, 2, 3, '#330000');
    p(25, -2 + bob, 2, 3, '#330000');
    // Wings
    p(-8, 6 + bob, 10, 16, '#661111');
    p(-12, 8 + bob, 6, 10, '#551111');
    p(30, 6 + bob, 10, 16, '#661111');
    p(36, 8 + bob, 6, 10, '#551111');
    // Eyes
    p(10, 8 + bob, 4, 4, '#ff0000');
    p(18, 8 + bob, 4, 4, '#ff0000');
    p(11, 9 + bob, 2, 2, '#ffff00');
    p(19, 9 + bob, 2, 2, '#ffff00');
    // Mouth
    p(11, 16 + bob, 10, 3, '#440000');
    p(12, 16 + bob, 2, 2, '#ffffff');
    p(16, 16 + bob, 2, 2, '#ffffff');
    p(20, 16 + bob, 1, 2, '#ffffff');
    // Tail
    p(26, 26 + bob, 8, 2, '#881111');
    p(32, 24 + bob, 4, 3, '#881111');
    p(34, 22 + bob, 3, 3, '#ff3333');
    // Legs
    p(8, 28 + bob, 6, 6, '#881111');
    p(18, 28 + bob, 6, 6, '#881111');
    p(7, 32 + bob, 3, 2, '#333333');
    p(22, 32 + bob, 3, 2, '#333333');
}

function drawUnderwritingHydra(p, bob, frame) {
    // Main body - serpentine
    p(8, 18 + bob, 20, 14, '#663399');
    p(6, 22 + bob, 24, 8, '#663399');
    // Three necks
    const sway1 = Math.sin(frame * 0.1) * 2;
    const sway2 = Math.sin(frame * 0.1 + 2) * 2;
    const sway3 = Math.sin(frame * 0.1 + 4) * 2;
    // Left head
    p(2 + sway1, 4 + bob, 8, 8, '#7744aa');
    p(2 + sway1, 8 + bob, 6, 12, '#663399');
    p(3 + sway1, 6 + bob, 2, 2, '#ff4444');
    p(7 + sway1, 6 + bob, 2, 2, '#ff4444');
    p(3 + sway1, 10 + bob, 6, 2, '#442266');
    // Center head
    p(12 + sway2, 0 + bob, 8, 8, '#7744aa');
    p(14 + sway2, 6 + bob, 6, 14, '#663399');
    p(13 + sway2, 2 + bob, 2, 2, '#ff4444');
    p(17 + sway2, 2 + bob, 2, 2, '#ff4444');
    p(13 + sway2, 6 + bob, 6, 2, '#442266');
    // Right head
    p(24 + sway3, 4 + bob, 8, 8, '#7744aa');
    p(26 + sway3, 8 + bob, 6, 12, '#663399');
    p(25 + sway3, 6 + bob, 2, 2, '#ff4444');
    p(29 + sway3, 6 + bob, 2, 2, '#ff4444');
    p(25 + sway3, 10 + bob, 6, 2, '#442266');
    // Tail
    p(28, 28 + bob, 8, 3, '#663399');
    p(34, 26 + bob, 4, 3, '#7744aa');
}

function drawForeclosurePhoenix(p, bob, frame, ctx, x, y, s) {
    const flicker = Math.sin(frame * 0.3) * 2;
    // Fire glow
    ctx.globalAlpha = 0.3 + Math.sin(frame * 0.2) * 0.1;
    p(2, 2 + bob + flicker, 28, 28, '#ff4400');
    ctx.globalAlpha = 1;
    // Body
    p(10, 12 + bob, 12, 14, '#ff6600');
    p(12, 8 + bob, 8, 6, '#ff6600');
    // Head
    p(12, 4 + bob, 8, 6, '#ff8800');
    p(14, 2 + bob, 4, 3, '#ffaa00');
    // Beak
    p(18, 6 + bob, 4, 2, '#ffcc00');
    p(18, 8 + bob, 3, 1, '#ffcc00');
    // Eye
    p(14, 5 + bob, 2, 2, '#ffffff');
    p(15, 5 + bob, 1, 1, '#000000');
    // Wings spread
    p(-4, 10 + bob + flicker, 14, 10, '#ff4400');
    p(-8, 12 + bob + flicker, 6, 6, '#ff2200');
    p(22, 10 + bob - flicker, 14, 10, '#ff4400');
    p(34, 12 + bob - flicker, 6, 6, '#ff2200');
    // Tail feathers
    p(12, 26 + bob, 3, 6, '#ff4400');
    p(16, 28 + bob, 3, 6, '#ff6600');
    p(10, 28 + bob, 3, 4, '#ff2200');
    p(18, 26 + bob, 3, 5, '#ffaa00');
    // Fire particles
    p(8 + flicker, 0 + bob, 2, 3, '#ffcc00');
    p(20 - flicker, 1 + bob, 2, 3, '#ffcc00');
    p(14, -2 + bob + flicker, 3, 3, '#ff6600');
}

function drawARVDragon(p, bob, frame, ctx, x, y, s) {
    const breathe = Math.sin(frame * 0.06) * 2;
    // Large body
    p(8, 16 + bob, 28, 18, '#228833');
    p(10, 12 + bob, 24, 6, '#228833');
    // Belly
    p(12, 20 + bob, 20, 12, '#44aa55');
    // Head
    p(30, 4 + bob + breathe, 16, 12, '#228833');
    p(34, 2 + bob + breathe, 12, 6, '#228833');
    // Snout
    p(42, 6 + bob + breathe, 8, 6, '#33aa44');
    // Nostril
    p(46, 6 + bob + breathe, 2, 2, '#114422');
    // Eye
    p(34, 6 + bob + breathe, 4, 4, '#ffcc00');
    p(35, 7 + bob + breathe, 2, 2, '#ff0000');
    // Horns
    p(32, 0 + bob + breathe, 3, 4, '#aaaa44');
    p(38, -2 + bob + breathe, 3, 5, '#aaaa44');
    // Neck
    p(26, 10 + bob, 8, 8, '#228833');
    // Wings
    p(-6, 4 + bob, 16, 16, '#1a7733');
    p(-12, 6 + bob, 8, 10, '#116622');
    p(-16, 8 + bob, 6, 6, '#0d5519');
    // Tail
    p(0, 30 + bob, 10, 4, '#228833');
    p(-6, 28 + bob, 8, 4, '#228833');
    p(-10, 26 + bob, 6, 4, '#33aa44');
    p(-14, 25 + bob, 4, 3, '#44bb55');
    // Legs
    p(12, 34 + bob, 8, 8, '#228833');
    p(26, 34 + bob, 8, 8, '#228833');
    // Claws
    p(10, 40 + bob, 4, 2, '#aaaa44');
    p(14, 40 + bob, 4, 2, '#aaaa44');
    p(24, 40 + bob, 4, 2, '#aaaa44');
    p(28, 40 + bob, 4, 2, '#aaaa44');
    // Gold accents
    p(14, 22 + bob, 4, 2, '#ffdd00');
    p(20, 24 + bob, 4, 2, '#ffdd00');
    p(26, 22 + bob, 4, 2, '#ffdd00');
    // Fire breath (intermittent)
    if (Math.sin(frame * 0.1) > 0.3) {
        p(48, 6 + bob + breathe, 6, 3, '#ff6600');
        p(52, 5 + bob + breathe, 6, 4, '#ff4400');
        p(56, 4 + bob + breathe, 4, 5, '#ff2200');
    }
}

export function drawShopkeeper(ctx, x, y, scale, frame = 0) {
    const s = scale || 2;
    const p = (dx, dy, w, h, c) => px(ctx, x + dx * s, y + dy * s, w * s, h * s, c);
    const bob = Math.sin(frame * 0.06) * 1;

    // Body - stout
    p(2, 12 + bob, 16, 16, '#8B4513');
    // Apron
    p(4, 14 + bob, 12, 12, '#ddddcc');
    p(6, 16 + bob, 8, 8, '#ccccbb');
    // Head
    p(4, 2 + bob, 12, 10, '#ffcc99');
    // Big grin
    p(6, 8 + bob, 8, 3, '#cc6644');
    p(12, 8 + bob, 1, 1, '#ffdd00'); // gold tooth
    // Eyes
    p(6, 5 + bob, 3, 2, '#000000');
    p(11, 5 + bob, 3, 2, '#000000');
    // Hat
    p(3, 0 + bob, 14, 3, '#663311');
    p(6, -2 + bob, 8, 3, '#663311');
    // Arms
    p(-2, 14 + bob, 4, 8, '#ffcc99');
    p(18, 14 + bob, 4, 8, '#ffcc99');
    // Legs
    p(4, 28 + bob, 5, 4, '#553311');
    p(11, 28 + bob, 5, 4, '#553311');
}

export function drawGoldCoin(ctx, x, y, size, frame = 0) {
    const w = Math.abs(Math.cos(frame * 0.15)) * size;
    ctx.fillStyle = '#ffdd00';
    ctx.fillRect(x - w / 2, y - size / 2, Math.max(w, 2), size);
    ctx.fillStyle = '#ccaa00';
    ctx.fillRect(x - w / 4, y - size / 4, Math.max(w / 2, 1), size / 2);
}

export function drawHeart(ctx, x, y, size, filled) {
    ctx.fillStyle = filled ? '#ff2222' : '#442222';
    const s = size / 10;
    // Simple pixel heart
    px(ctx, x + 1 * s, y, 3 * s, s, ctx.fillStyle);
    px(ctx, x + 6 * s, y, 3 * s, s, ctx.fillStyle);
    px(ctx, x, y + 1 * s, 10 * s, s, ctx.fillStyle);
    px(ctx, x, y + 2 * s, 10 * s, s, ctx.fillStyle);
    px(ctx, x + 1 * s, y + 3 * s, 8 * s, s, ctx.fillStyle);
    px(ctx, x + 2 * s, y + 4 * s, 6 * s, s, ctx.fillStyle);
    px(ctx, x + 3 * s, y + 5 * s, 4 * s, s, ctx.fillStyle);
    px(ctx, x + 4 * s, y + 6 * s, 2 * s, s, ctx.fillStyle);
}

export function drawLedgerFragment(ctx, x, y, size, frame = 0) {
    const glow = Math.sin(frame * 0.1) * 0.3 + 0.7;
    ctx.globalAlpha = glow;
    // Page shape
    ctx.fillStyle = '#ffeecc';
    ctx.fillRect(x, y, size, size * 1.3);
    // Writing lines
    ctx.fillStyle = '#886633';
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(x + size * 0.15, y + size * 0.2 + i * size * 0.25, size * 0.7, size * 0.08);
    }
    // Glow
    ctx.fillStyle = '#ffdd44';
    ctx.globalAlpha = glow * 0.3;
    ctx.fillRect(x - 4, y - 4, size + 8, size * 1.3 + 8);
    ctx.globalAlpha = 1;
}

export function drawBackground(ctx, width, height, stageId) {
    const bgs = {
        1: { sky: '#1a1a3a', ground: '#3a2a1a', mid: '#2a2a2a' },     // cave
        2: { sky: '#3a1a0a', ground: '#4a2a0a', mid: '#5a2a1a' },     // volcano
        3: { sky: '#1a3a5a', ground: '#cca866', mid: '#2a6a8a' },     // beach
        4: { sky: '#1a1a2a', ground: '#2a2a3a', mid: '#222233' },     // graveyard
        5: { sky: '#1a2a1a', ground: '#3a4a2a', mid: '#2a3a1a' },     // swamp
        6: { sky: '#0a1a2a', ground: '#1a3a1a', mid: '#0a2a0a' },     // forest
        7: { sky: '#2a0a0a', ground: '#3a1a0a', mid: '#4a0a0a' },     // hellscape
        8: { sky: '#1a1a1a', ground: '#2a2a2a', mid: '#1a1a2a' },     // dungeon
        9: { sky: '#2a1a3a', ground: '#3a2a1a', mid: '#4a3a5a' },     // sky
        10: { sky: '#1a1a2a', ground: '#3a3a3a', mid: '#2a2a3a' },    // castle
    };
    const bg = bgs[stageId] || bgs[1];

    // Sky
    ctx.fillStyle = bg.sky;
    ctx.fillRect(0, 0, width, height);
    // Mountains/structures in mid
    ctx.fillStyle = bg.mid;
    for (let i = 0; i < 6; i++) {
        const mx = i * (width / 5) - 40;
        const mh = 60 + Math.sin(i * 1.5) * 40;
        ctx.fillRect(mx, height * 0.5 - mh, width / 4, mh + height * 0.2);
    }
    // Ground
    ctx.fillStyle = bg.ground;
    ctx.fillRect(0, height * 0.7, width, height * 0.3);
    // Ground detail
    ctx.fillStyle = shadeColor(bg.ground, -15);
    for (let i = 0; i < width; i += 20) {
        ctx.fillRect(i, height * 0.7, 10, 4);
    }
}
