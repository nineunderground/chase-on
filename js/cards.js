// Chase On - Card Definitions
// Based on Agent Avenue by Nerdlab Games

const CARD_TYPES = {
    DOUBLE_AGENT: {
        name: 'Double Agent',
        icon: '🎭',
        movement: [-1, 6, -1],
        count: 6,
        cssClass: 'double-agent',
        description: 'Risky! 2nd copy is powerful'
    },
    ENFORCER: {
        name: 'Enforcer',
        icon: '💪',
        movement: [1, 2, 3],
        count: 6,
        cssClass: 'enforcer',
        description: 'Steady forward progress'
    },
    CODEBREAKER: {
        name: 'Codebreaker',
        icon: '🔓',
        movement: [0, 0, 'WIN'],
        count: 6,
        cssClass: 'codebreaker',
        description: 'No movement, but 3 = WIN!'
    },
    SABOTEUR: {
        name: 'Saboteur',
        icon: '💣',
        movement: [-1, -1, -2],
        count: 6,
        cssClass: 'saboteur',
        description: 'Always moves backward'
    },
    DAREDEVIL: {
        name: 'Daredevil',
        icon: '🏍️',
        movement: [2, 3, 'LOSE'],
        count: 6,
        cssClass: 'daredevil',
        description: 'Fast but 3 = LOSE!'
    },
    SENTINEL: {
        name: 'Sentinel',
        icon: '🛡️',
        movement: [0, 2, 6],
        count: 6,
        cssClass: 'sentinel',
        description: 'Defensive, powerful at 3+'
    },
    SIDEKICK: {
        name: 'Sidekick',
        icon: '🦸',
        movement: [4, 4, 4],  // Always 4
        count: 1,
        cssClass: 'sidekick',
        description: 'Always moves 4'
    },
    MOLE: {
        name: 'Mole',
        icon: '🕳️',
        movement: [-3, -3, -3],  // Always -3
        count: 1,
        cssClass: 'mole',
        description: 'Always moves -3'
    }
};

// Create full deck (38 cards)
function createDeck() {
    const deck = [];
    let cardId = 0;
    
    for (const [type, config] of Object.entries(CARD_TYPES)) {
        for (let i = 0; i < config.count; i++) {
            deck.push({
                id: cardId++,
                type: type,
                name: config.name,
                icon: config.icon,
                movement: [...config.movement],
                cssClass: config.cssClass,
                description: config.description
            });
        }
    }
    
    return deck;
}

// Fisher-Yates shuffle
function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Create card HTML element
function createCardElement(card, options = {}) {
    const { mini = false, faceDown = false, clickable = false, highlightIndex = -1 } = options;
    
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.cssClass}`;
    if (mini) cardEl.classList.add('mini-card');
    if (faceDown) cardEl.classList.add('card-back');
    if (clickable) cardEl.classList.add('clickable');
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.cardType = card.type;
    
    if (!faceDown) {
        const movementHTML = card.movement.map((val, idx) => {
            let classes = '';
            if (idx === highlightIndex) classes = 'active';
            if (val === 'WIN') classes = 'win';
            if (val === 'LOSE') classes = 'lose';
            return `<span class="${classes}">${val}</span>`;
        }).join('');
        
        cardEl.innerHTML = `
            <div class="card-name">${card.name}</div>
            <div class="card-icon">${card.icon}</div>
            <div class="card-movement">${movementHTML}</div>
        `;
    }
    
    return cardEl;
}

// Get movement value based on collection count
function getMovementValue(card, collectionCount) {
    // Index: 0 for 1st copy, 1 for 2nd, 2 for 3rd+
    const index = Math.min(Math.max(collectionCount - 1, 0), 2);
    const value = card.movement[index];
    
    // Handle WIN/LOSE special values
    if (value === 'WIN' || value === 'LOSE') {
        return value;
    }
    
    return value;
}

// Count cards of a specific type in collection
function countCardType(collection, cardType) {
    return collection.filter(c => c.type === cardType).length;
}

// Check if collecting this card would trigger WIN/LOSE
function checkSpecialCondition(collection, newCard) {
    const currentCount = countCardType(collection, newCard.type);
    const newCount = currentCount + 1;
    
    if (newCard.type === 'CODEBREAKER' && newCount >= 3) {
        return 'WIN';
    }
    if (newCard.type === 'DAREDEVIL' && newCount >= 3) {
        return 'LOSE';
    }
    
    return null;
}
