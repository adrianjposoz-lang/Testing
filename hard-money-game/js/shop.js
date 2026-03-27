// Shop System - Goldbottom's Emporium

export const SHOP_ITEMS = {
    weapons: [
        { id: 'sword_basic', name: 'Iron Sword', description: 'A sturdy blade.', price: 0, equipped: true, slot: 'sword', value: 'basic' },
        { id: 'sword_flame', name: 'Flame Sword', description: 'Burns with fury! +1 crit damage.', price: 60, slot: 'sword', value: 'flame' },
        { id: 'sword_ice', name: 'Frost Blade', description: 'Cold as a denied loan. +1 crit damage.', price: 80, slot: 'sword', value: 'ice' },
        { id: 'sword_golden', name: 'Golden Sword', description: 'Pure financial power. +10% gold.', price: 150, slot: 'sword', value: 'golden' },
    ],
    helmets: [
        { id: 'helmet_none', name: 'No Helmet', description: 'Living dangerously.', price: 0, equipped: true, slot: 'helmet', value: 'none' },
        { id: 'helmet_iron', name: 'Iron Helm', description: 'Basic protection.', price: 40, slot: 'helmet', value: 'iron' },
        { id: 'helmet_gold', name: 'Gold Helm', description: 'Shiny and protective.', price: 100, slot: 'helmet', value: 'gold' },
        { id: 'helmet_horned', name: 'Horned Helm', description: 'Intimidation factor. +1 max HP.', price: 120, slot: 'helmet', value: 'horned' },
    ],
    armor: [
        { id: 'armor_basic', name: 'Cloth Armor', description: 'Better than nothing.', price: 0, equipped: true, slot: 'armor', value: 'basic' },
        { id: 'armor_chain', name: 'Chainmail', description: 'Linked for strength.', price: 50, slot: 'armor', value: 'chain' },
        { id: 'armor_plate', name: 'Plate Armor', description: 'Solid steel defense. +1 max HP.', price: 90, slot: 'armor', value: 'plate' },
        { id: 'armor_golden', name: 'Golden Armor', description: 'The ultimate flex. +1 max HP.', price: 200, slot: 'armor', value: 'golden' },
    ],
    capes: [
        { id: 'cape_none', name: 'No Cape', description: 'No capes!', price: 0, equipped: true, slot: 'cape', value: 'none' },
        { id: 'cape_red', name: 'Red Cape', description: 'Classic hero look.', price: 30, slot: 'cape', value: 'red' },
        { id: 'cape_blue', name: 'Blue Cape', description: 'Cool and collected.', price: 30, slot: 'cape', value: 'blue' },
        { id: 'cape_purple', name: 'Purple Cape', description: 'Royal vibes.', price: 50, slot: 'cape', value: 'purple' },
        { id: 'cape_rainbow', name: 'Rainbow Cape', description: 'Maximum flair!', price: 100, slot: 'cape', value: 'rainbow' },
    ],
    consumables: [
        { id: 'potion_hp', name: 'Health Potion', description: 'Restore 2 HP in battle.', price: 25, slot: 'consumable', consumable: true, effect: 'heal', stackable: true },
        { id: 'potion_time', name: 'Time Elixir', description: '+5 sec timer for 1 fight.', price: 20, slot: 'consumable', consumable: true, effect: 'time', stackable: true },
        { id: 'scroll_hint', name: 'Hint Scroll', description: 'Extra hint for 1 fight.', price: 25, slot: 'consumable', consumable: true, effect: 'hint', stackable: true },
        { id: 'shield_block', name: 'Magic Shield', description: 'Block 1 wrong answer.', price: 35, slot: 'consumable', consumable: true, effect: 'shield', stackable: true },
        { id: 'gold_charm', name: 'Gold Charm', description: '+25% gold for 1 fight.', price: 40, slot: 'consumable', consumable: true, effect: 'goldboost', stackable: true },
    ]
};

export const SHOPKEEPER_QUOTES = {
    enter: [
        "Welcome, Debt Knight! Spend wisely... or don't. I get paid either way.",
        "Ah, back so soon? Business is BOOMING!",
        "My favorite customer! Well, my ONLY customer lately...",
        "Come in, come in! Everything's fairly priced. Mostly.",
        "The Debt Knight returns! What catches your eye?",
        "You look like someone who needs a shiny new sword!",
        "Gold burns holes in pockets. Let me help with that!",
    ],
    purchase: [
        "Excellent choice! No refunds.",
        "That'll look GREAT on you!",
        "A wise investment, if I say so myself.",
        "Ka-ching! My favorite sound.",
        "You won't regret this! Probably.",
    ],
    tooExpensive: [
        "Your pockets seem a bit... light.",
        "Come back when you've slain more monsters!",
        "I don't do payment plans. Sorry!",
        "That costs more gold than you've got, friend.",
    ],
    alreadyOwned: [
        "You already own that! Check your inventory.",
        "I may be greedy, but I won't sell you what you have!",
    ],
    browse: [
        "Take your time! Actually, don't. Rent is due.",
        "See anything you like? Everything's top quality!",
        "That flaming sword is a bestseller. Well, it would be if I had more customers.",
    ]
};

export function getRandomQuote(category) {
    const quotes = SHOPKEEPER_QUOTES[category];
    return quotes[Math.floor(Math.random() * quotes.length)];
}
