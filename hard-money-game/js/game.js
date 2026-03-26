// The Ledger & The Sword - Main Entry Point
import { bootGame } from './ui.js';

// Boot the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootGame);
} else {
    bootGame();
}
