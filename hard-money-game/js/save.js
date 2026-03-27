// Save/Load System - LocalStorage persistence
const SAVE_KEY = 'ledger_and_sword_save';

export const SaveSystem = {
    save(gameState) {
        try {
            const data = {
                playerName: gameState.playerName,
                gold: gameState.gold,
                currentStage: gameState.currentStage,
                completedStages: gameState.completedStages,
                equipment: gameState.equipment,
                ownedItems: gameState.ownedItems,
                inventory: gameState.inventory,
                codexUnlocked: gameState.codexUnlocked,
                totalKills: gameState.totalKills,
                totalCorrect: gameState.totalCorrect,
                totalAnswered: gameState.totalAnswered,
                bestCombo: gameState.bestCombo,
                endlessHighScore: gameState.endlessHighScore,
                titles: gameState.titles,
                deathsPerStage: gameState.deathsPerStage,
                settings: gameState.settings,
                persistentHp: gameState.persistentHp,
                persistentMaxHp: gameState.persistentMaxHp,
                savedAt: Date.now()
            };
            localStorage.setItem(SAVE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('Save failed:', e);
            return false;
        }
    },

    load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('Load failed:', e);
            return null;
        }
    },

    hasSave() {
        return localStorage.getItem(SAVE_KEY) !== null;
    },

    deleteSave() {
        localStorage.removeItem(SAVE_KEY);
    }
};
