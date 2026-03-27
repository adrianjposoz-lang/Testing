// Cutscene data and system

export const BOSS_DATA = [
    null, // index 0 unused
    {
        name: 'The Loan Goblin',
        stage: 1,
        hp: 5,
        baseDamage: 1,
        goldReward: 40,
        topic: 'Basic Lending Terms',
        background: 'cave',
        taunt: "Hehehe! You think you know lending? I've hoarded these terms for centuries!",
        defeat: "Nooo! My precious terms! Take them... take them all!",
        intro: "A small, green creature clutches a bag of stolen knowledge in a damp cave.",
        deathMessage: "The Loan Goblin scurries away... but you'll be back, right?",
        mechanic: { type: 'greedy_grab', description: 'Steals 5 gold on wrong answers' },
        mechanicAnnounce: "The Loan Goblin eyes your gold pouch greedily..."
    },
    {
        name: 'The Interest Rate Imp',
        stage: 2,
        hp: 5,
        baseDamage: 1,
        goldReward: 45,
        topic: 'Interest Rates & APR',
        background: 'volcano',
        taunt: "Your understanding of rates is about to COMPOUND into pain!",
        defeat: "My rates... they're dropping! This can't be!",
        intro: "Atop a smoldering hill, an imp juggles flaming percentage signs.",
        deathMessage: "The Imp cackles as your interest in survival... declines.",
        mechanic: { type: 'compounding_fury', description: 'Each wrong answer reduces timer by 1s' },
        mechanicAnnounce: "The Imp's fury compounds with every mistake..."
    },
    {
        name: 'The Collateral Crab',
        stage: 3,
        hp: 5,
        baseDamage: 1,
        goldReward: 50,
        topic: 'Collateral & Secured Lending',
        background: 'beach',
        taunt: "You want to pass? Put up some COLLATERAL first! *snip snip*",
        defeat: "My shell! My beautiful collateral! It's... it's worthless!",
        intro: "A massive crab guards a beach of treasures, its gem-encrusted shell gleaming.",
        deathMessage: "The Crab snips your confidence in half. Try again?",
        mechanic: { type: 'shell_shield', description: 'Takes 50% less damage on first 2 hits' },
        mechanicAnnounce: "The Crab retreats into its gem-encrusted shell!"
    },
    {
        name: 'The Appraisal Ghost',
        stage: 4,
        hp: 5,
        baseDamage: 1,
        goldReward: 55,
        topic: 'Property Appraisals & Valuations',
        background: 'graveyard',
        taunt: "I've appraised your chances... and they're BELOW market value!",
        defeat: "You've... you've seen right through me! I'm transparent anyway...",
        intro: "In a misty graveyard, a spectral figure peers through a ghostly magnifying glass.",
        deathMessage: "The Ghost appraises your defeat at exactly zero gold. Ouch.",
        mechanic: { type: 'phantom_shuffle', description: 'Answers re-shuffle after 3 seconds' },
        mechanicAnnounce: "The Ghost's spectral hands rearrange reality itself..."
    },
    {
        name: 'The Escrow Ogre',
        stage: 5,
        hp: 7,
        baseDamage: 1,
        goldReward: 60,
        topic: 'Escrow, Closing & Title',
        background: 'swamp',
        taunt: "NOBODY closes a deal in MY swamp! The title stays with ME!",
        defeat: "The deal... it's closed?! I hate closings!",
        intro: "A hulking ogre blocks the only bridge through a murky swamp, padlock in hand.",
        deathMessage: "The Ogre shoves you back into the swamp. Escrow THAT.",
        mechanic: { type: 'escrow_hold', description: 'Gold held in escrow until consecutive correct' },
        mechanicAnnounce: "The Ogre holds your gold in escrow... prove yourself!"
    },
    {
        name: 'The LTV Werewolf',
        stage: 6,
        hp: 7,
        baseDamage: 1,
        goldReward: 65,
        topic: 'LTV Ratios & Calculations',
        background: 'forest',
        taunt: "When the full moon rises, your loan-to-value ratio will be your DOOM!",
        defeat: "My ratios... they're perfectly balanced! How?!",
        intro: "Under a blood moon, a werewolf howls equations into the night sky.",
        deathMessage: "The Werewolf's bite ratio is 100%. You're lunch.",
        mechanic: { type: 'risk_frenzy', description: 'Timer speeds up 30% when boss HP below 30%' },
        mechanicAnnounce: "The Werewolf grows more frenzied as it weakens..."
    },
    {
        name: 'The Default Demon',
        stage: 7,
        hp: 8,
        baseDamage: 1,
        goldReward: 70,
        topic: 'Defaults, Foreclosure Basics & Risk',
        background: 'hellscape',
        taunt: "Everyone defaults eventually... especially YOU!",
        defeat: "I... I'm in default?! The irony BURNS!",
        intro: "Wings of shadow spread across a burning sky. The Demon of Default descends.",
        deathMessage: "The Demon marks your credit report. Permanently.",
        mechanic: { type: 'penalty_interest', description: 'Each wrong answer after the first deals +1 extra damage' },
        mechanicAnnounce: "The Demon's penalty interest accrues with each failure..."
    },
    {
        name: 'The Underwriting Hydra',
        stage: 8,
        hp: 9,
        baseDamage: 2,
        goldReward: 80,
        topic: 'Underwriting & Borrower Evaluation',
        background: 'dungeon',
        taunt: "Three heads! Three times the scrutiny! Your application is DENIED!",
        defeat: "All three heads... approved?! This has never happened!",
        intro: "Deep in a dungeon, three serpent heads argue over a stack of paperwork.",
        deathMessage: "APPLICATION DENIED. All three heads agree.",
        mechanic: { type: 'two_heads', description: 'Occasionally fires two questions in rapid succession' },
        mechanicAnnounce: "The Hydra's two heads attack in rapid succession!"
    },
    {
        name: 'The Foreclosure Phoenix',
        stage: 9,
        hp: 10,
        baseDamage: 2,
        goldReward: 90,
        topic: 'Foreclosure Process & REO',
        background: 'sky',
        taunt: "From the ashes of bad loans, I RISE! And I'll burn your portfolio too!",
        defeat: "I'll be back! I always come back! ...right?",
        intro: "A phoenix of flame and foreclosure notices circles above a ruined castle.",
        deathMessage: "The Phoenix's flames were too hot. Your portfolio is toast.",
        mechanic: { type: 'rising_ashes', description: 'Revives once with 2 HP when defeated' },
        mechanicAnnounce: "The Phoenix's flames flicker with an unnatural resilience..."
    },
    {
        name: 'The ARV Dragon',
        stage: 10,
        hp: 12,
        baseDamage: 2,
        goldReward: 120,
        topic: 'After Repair Value & Advanced Concepts',
        background: 'castle',
        taunt: "I am the FINAL obstacle! The After Repair Value of your LIFE is ZERO!",
        defeat: "The Ledger... it's complete. You've... actually done it. Impossible!",
        intro: "Atop a mountain of corrupted contracts, the great dragon awaits. The final fragment glows in its claws.",
        deathMessage: "The Dragon's fire was overwhelming. But legends say Debt Knights never truly fall...",
        mechanic: { type: 'market_crash', description: 'Randomly hides one answer for 4 seconds' },
        mechanicAnnounce: "The Dragon's market crash obscures your choices!"
    }
];

export const INTRO_CUTSCENE = [
    {
        speaker: '',
        text: 'The Kingdom of Capitalon once thrived on fair deals and honest lending...',
        scene: 'kingdom_peaceful'
    },
    {
        speaker: '',
        text: 'But a dark force called The Default has corrupted the land. Monsters now guard the sacred Ledger of Wealth.',
        scene: 'kingdom_dark'
    },
    {
        speaker: '',
        text: 'Without it, the economy has collapsed. Towns are broke. The king is desperate.',
        scene: 'kingdom_ruins'
    },
    {
        speaker: 'The King',
        text: 'Sir {NAME}, the Ledger has been torn into 10 pieces, each guarded by a creature of The Default.',
        scene: 'throne_room'
    },
    {
        speaker: 'The King',
        text: 'Recover them all, and you will restore this kingdom. Fail... and Capitalon falls.',
        scene: 'throne_room'
    },
    {
        speaker: '',
        text: 'And so the Debt Knight sets forth...',
        scene: 'knight_departure'
    }
];

export const ENDING_CUTSCENE = [
    {
        speaker: '',
        text: 'The last fragment flies into place. The Ledger of Wealth glows with restored power.',
        scene: 'ledger_complete'
    },
    {
        speaker: '',
        text: 'Across Capitalon, the darkness lifts. Markets reopen. Merchants celebrate.',
        scene: 'kingdom_restored'
    },
    {
        speaker: 'The King',
        text: 'Sir {NAME}, you have done what no one else could. The kingdom owes you everything.',
        scene: 'throne_room'
    },
    {
        speaker: 'The King',
        text: 'But remember... a true Debt Knight never stops learning.',
        scene: 'throne_room'
    },
    {
        speaker: '',
        text: 'THE END... or is it?',
        scene: 'knight_sunset'
    }
];

export const CODEX_ENTRIES = [
    null,
    { title: 'Fragment I: Basic Lending Terms', content: 'Hard money loans are short-term loans secured by real property. They are funded by private investors rather than banks, typically with higher interest rates but faster approval. Key terms include principal (amount borrowed), interest (cost of borrowing), and term (loan duration).' },
    { title: 'Fragment II: Interest Rates & APR', content: 'Hard money loans typically carry interest rates of 8-15%. APR (Annual Percentage Rate) includes interest plus fees, giving the true cost of borrowing. Points are upfront fees charged as a percentage of the loan amount — 1 point = 1% of the loan.' },
    { title: 'Fragment III: Collateral & Secured Lending', content: 'Hard money loans are secured by real property as collateral. If the borrower defaults, the lender can take ownership of the property. The property itself is the primary basis for the loan, not the borrower\'s credit score.' },
    { title: 'Fragment IV: Appraisals & Valuations', content: 'Property appraisals determine fair market value. Lenders use appraisals to ensure the property is worth enough to cover the loan. Comparable sales (comps) from nearby properties are used to determine value.' },
    { title: 'Fragment V: Escrow, Closing & Title', content: 'Escrow is a neutral third party that holds funds and documents during a transaction. Title insurance protects against ownership disputes. Closing costs include fees for processing, title search, and recording the deed.' },
    { title: 'Fragment VI: LTV Ratios', content: 'Loan-to-Value (LTV) ratio = Loan Amount / Property Value. Most hard money lenders cap LTV at 60-75%. A lower LTV means less risk for the lender. Example: $300K loan on a $400K property = 75% LTV.' },
    { title: 'Fragment VII: Defaults & Risk', content: 'Default occurs when a borrower fails to meet loan obligations. Hard money lenders mitigate risk through low LTV ratios and property-backed security. Understanding risk assessment is crucial for both lenders and borrowers.' },
    { title: 'Fragment VIII: Underwriting', content: 'Underwriting evaluates loan risk. Hard money underwriting focuses primarily on the property value and deal viability rather than borrower creditworthiness. Key factors: property condition, exit strategy, borrower experience.' },
    { title: 'Fragment IX: Foreclosure & REO', content: 'Foreclosure is the legal process of taking property from a defaulted borrower. REO (Real Estate Owned) properties are bank/lender-owned after unsuccessful foreclosure auctions. Judicial and non-judicial foreclosure processes vary by state.' },
    { title: 'Fragment X: After Repair Value', content: 'ARV (After Repair Value) estimates property value after renovations. The 70% rule: investors should pay no more than 70% of ARV minus repair costs. ARV = Current Value + Value of Improvements. This is the cornerstone of fix-and-flip investing.' }
];
