# The Ledger & The Sword - Game Design Document

## Overview
A retro 16-bit RPG combat game where players learn about hard money lending by answering questions to defeat bosses. Built as a web app (HTML/CSS/JS) with no backend dependencies.

---

## Story

**Setting:** The Kingdom of Capitalon — a once-thriving realm where prosperity was built on fair lending and honest deals.

**The Problem:** A dark force called **The Default** has corrupted the kingdom. Monsters now guard the ancient **Ledger of Wealth** — a sacred tome that holds all the lending knowledge that kept the kingdom prosperous. Without it, the economy has collapsed.

**Your Character:** You are a **Debt Knight** — a sworn protector of the kingdom's financial order. The king hands you a sword and sends you to recover the 10 fragments of the Ledger.

**Each Boss:** Guards a fragment of the Ledger. Defeating them restores lost financial knowledge. Bosses taunt with misinformation — they represent financial ignorance.

**Ending:** Reassemble the Ledger, vanquish The Default, Capitalon prospers. Endless mode unlocks.

---

## Core Gameplay Loop

```
Fight boss (2 min) → Win → Gold drops → Shop → "One more fight" → Repeat
```

### Combat System
- **3 multiple choice options** per question (some true/false)
- **15-second timer** per question — creates urgency
- **5 HP per fight** — survive up to 3 wrong answers
- **Bosses take 5-8 correct answers to kill** (scales by stage)
- **1 free hint per fight** — safety net
- Correct answer = player attacks boss
- Wrong answer / timeout = boss attacks player

### Combo System
- **3 correct in a row = COMBO** — bonus gold, bigger attack animation
- **5 in a row = CRITICAL HIT** — massive damage, screen shake, gold shower
- Combos are the secret sauce for dopamine

### Difficulty Philosophy
- **Make the player WIN** — they should feel smart, not frustrated
- Early stages very easy, later stages medium (never punishing)
- 3 multiple choice options (not 4) = ~33% guess chance + actual knowledge = high win rate
- Rubber banding: die twice on same boss = free hint for whole fight

---

## 10 Bosses & Stages

| Stage | Boss | Topic | HP |
|-------|------|-------|----|
| 1 | The Loan Goblin | Basic Lending Terms | 5 |
| 2 | The Interest Rate Imp | Interest Rates & APR | 5 |
| 3 | The Collateral Crab | Collateral & Secured Lending | 5 |
| 4 | The Appraisal Ghost | Property Appraisals & Valuations | 5 |
| 5 | The Escrow Ogre | Escrow, Closing & Title | 6 |
| 6 | The LTV Werewolf | LTV Ratios & Calculations | 6 |
| 7 | The Default Demon | Defaults, Foreclosure Basics & Risk | 6 |
| 8 | The Underwriting Hydra | Underwriting & Borrower Evaluation | 7 |
| 9 | The Foreclosure Phoenix | Foreclosure Process & REO | 7 |
| 10 | The ARV Dragon (Final Boss) | After Repair Value & Advanced Concepts | 8 |

---

## Progression System

- **No XP** — progression is purely gold → shop → cooler character
- **Linear stages** — 10 bosses on a world map
- **Every fight is a boss fight** — no wave/filler fights
- **Endless mode** unlocks after beating all 10 — random bosses, scaling difficulty

---

## Shop System ("Goldbottom's Emporium")

### Cosmetic Items
- **Swords:** Basic (free), Flame, Ice, Golden
- **Helmets:** None (free), Iron, Gold, Horned
- **Armor:** Cloth (free), Chainmail, Plate, Golden
- **Capes:** None (free), Red, Blue, Purple, Rainbow

### Consumable Items
- **Health Potion** — restore 1 HP in battle
- **Time Elixir** — +5 sec timer for 1 fight
- **Hint Scroll** — extra hint for 1 fight
- **Magic Shield** — block 1 wrong answer

### Economy
- Cheap items after every fight (dopamine loop)
- Tier the shop — cheap stuff early, expensive flashy stuff later
- Items immediately appear on character sprite

### Shopkeeper ("Goldbottom")
- Recurring character with personality
- Different quip every visit
- Reacts to purchases

---

## Cutscenes

- **Pixel art static scenes** with typewriter text
- 2-3 lines max per card, click to advance
- **Skippable** — never trap the player

### Where They Trigger
- **Game Start** — Kingdom overview, king gives you the sword (6 cards)
- **Before Each Boss** — Boss in their lair with a taunt (1-2 cards)
- **Boss Defeat** — Ledger fragment recovery (1 card)
- **Entering Shop** — Shopkeeper greeting (1 line)
- **Final Boss Intro** — Extended dramatic intro (4-5 cards)
- **Ending** — Ledger reassembled, kingdom restored (5 cards)

---

## World Map

- Kingdom map showing all 10 locations with paths
- Beaten bosses: checkmarked
- Next boss: glowing/pulsing
- Locked bosses: darkened
- Access shop, codex, and settings from map

---

## Codex (The Ledger)

- Each defeated boss adds a glossary entry about that stage's topic
- "Fragments Collected: X/10" — completionist drive
- Players can revisit and study what they learned
- Educational payoff disguised as a collectible

---

## Death & Retry

- **Keep all gold and items** — never punish the player
- **Retry same boss** with slightly easier question pool
- Funny death screen with boss-specific message
- **Die twice on same boss** → free hint for whole fight (rubber banding)

---

## Player Identity

- **Name input** at start — cutscenes personalized ("Sir Adrian, the king needs you")
- **Titles** earned through gameplay ("The Unstoppable" for 10-streak combo)
- Character visually changes with shop purchases

---

## Engagement & Addiction Mechanics

### Immediate Feedback
- Combo system with escalating visual/audio reward
- Floating damage numbers
- Screen shake on critical hits
- Gold shower animation on boss defeat
- HP bars draining/filling with animation

### Reward Loop
- Buy something after almost every fight
- Items immediately visible on character
- Boss defeat celebration with knowledge summary
- Shop shown between every fight (force the reward)

### Retention
- Save system (LocalStorage) — close browser, come back later
- Endless mode with high score for replayability
- Share card after victories — bragging rights
- Easter eggs (click shopkeeper 10 times = 5 free gold, etc.)

### Sound Design
- Sword slash on correct answer
- Thud on wrong answer
- Escalating combo chimes
- Heartbeat pulse on low timer
- Victory fanfare on boss defeat
- Chiptune battle/shop/map music

---

## Timer Tension

- Last 5 seconds: timer turns red, screen pulses, text shakes
- Heartbeat sound effect
- Makes correct answers feel clutch even on easy questions

---

## Question Bank

- **~100 questions** total, ~10 per stage
- **Multiple choice (3 options)** and **true/false**
- Questions randomize — replaying doesn't feel like memorization
- **Wrong answer shows correct answer + 1-sentence explanation** — learning happens mid-combat
- Difficulty: easy → medium across stages, never punishing

---

## Shareability

- After beating boss or final boss: "Share Your Victory" screen
- Generated card: "Sir Adrian defeated The ARV Dragon and restored Capitalon!"
- Copy-to-clipboard link
- Endless mode: "Sir Adrian survived 31 rounds!" — bragging rights

---

## Accessibility

- Large tap targets for mobile (min 48px)
- High contrast text
- Timer is visual AND numeric (not just color-based)
- Responsive design — works on phones

---

## Tech Stack

- **HTML5 + CSS3 + Vanilla JavaScript (ES Modules)**
- **Canvas API** for all game rendering (sprites, backgrounds)
- **Web Audio API** for procedural sound effects and music
- **LocalStorage** for save system
- **No external dependencies** — fully self-contained
- **No build step** — just open index.html

---

## File Structure

```
hard-money-game/
├── index.html          # Main HTML shell with all UI overlays
├── GAME_PLAN.md        # This document
├── css/
│   └── styles.css      # All styling, animations, responsive design
└── js/
    ├── game.js         # Main game engine (state machine, combat, rendering loop)
    ├── questions.js    # 100-question bank across 10 stages
    ├── sprites.js      # Pixel art sprite rendering (Canvas)
    ├── audio.js        # Web Audio API sound/music system
    ├── cutscenes.js    # Cutscene data, boss data, codex entries
    ├── shop.js         # Shop items, prices, shopkeeper quotes
    └── save.js         # LocalStorage save/load system
```

---

## Future Enhancements (Post-V1)

- **Azure Static Web App** hosting
- **Embed in hard money lending website** via iframe or subdomain
- **Lead capture** CTA at end: "Want to learn more? Talk to us."
- **Google Analytics** — track play time, drop-off points, hardest questions
- **More bosses/stages** — expand question bank
- **Multiplayer** — compete on streaks/scores
- **Achievement system** — badges for milestones
- **Seasonal content** — holiday bosses, limited items
- **Mobile app wrapper** (PWA or Capacitor)
- **Chiptune soundtrack** — composed background music tracks
