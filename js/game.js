// Chase On - Main Game Logic

class ChaseOnGame {
    constructor() {
        // Board configuration - circular with 14 spots
        this.BOARD_SIZE = 14;
        this.PLAYER_START = 1;  // Green starts at position 1
        this.AI_START = 8;      // Blue starts at position 8
        
        // Game state
        this.deck = [];
        this.playerHand = [];
        this.aiHand = [];
        this.playerRecruited = [];
        this.aiRecruited = [];
        this.playerPosition = this.PLAYER_START;
        this.aiPosition = this.AI_START;
        this.playerRedraws = 4;
        this.aiRedraws = 4;
        this.isPlayerTurn = true;
        this.faceUpCard = null;
        this.faceDownCard = null;
        this.gameOver = false;
        this.draggedCard = null;
        
        this.ai = new AIPlayer(this);
        
        this.bindEvents();
        this.showCoinFlip();
    }

    showCoinFlip() {
        const modal = document.getElementById('coin-modal');
        const coin = document.getElementById('coin');
        const result = document.getElementById('coin-result');
        
        modal.classList.remove('hidden');
        result.textContent = '';
        coin.className = 'coin';
        
        // Random result
        this.isPlayerTurn = Math.random() < 0.5;
        
        // Start flip animation after a moment
        setTimeout(() => {
            coin.classList.add(this.isPlayerTurn ? 'result-green' : 'result-blue');
            
            // Show result after animation
            setTimeout(() => {
                if (this.isPlayerTurn) {
                    result.textContent = '🟢 You go first!';
                    result.style.color = '#27ae60';
                } else {
                    result.textContent = '🔵 AI goes first!';
                    result.style.color = '#3498db';
                }
                
                // Start game after showing result
                setTimeout(() => {
                    modal.classList.add('hidden');
                    this.initBoard();
                    this.initGame();
                    
                    if (!this.isPlayerTurn) {
                        this.startAITurn();
                    }
                }, 1500);
            }, 2000);
        }, 500);
    }

    initBoard() {
        const board = document.getElementById('board');
        board.innerHTML = '';
        
        const centerX = 160;
        const centerY = 160;
        const radius = 130;
        
        // Create 14 circular positions
        for (let i = 1; i <= this.BOARD_SIZE; i++) {
            const angle = ((i - 1) / this.BOARD_SIZE) * 2 * Math.PI - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle) - 22;
            const y = centerY + radius * Math.sin(angle) - 22;
            
            const space = document.createElement('div');
            space.className = 'board-space';
            space.dataset.position = i;
            space.style.left = x + 'px';
            space.style.top = y + 'px';
            
            if (i === this.PLAYER_START) {
                space.classList.add('home-green');
                space.innerHTML = '🏠';
            } else if (i === this.AI_START) {
                space.classList.add('home-blue');
                space.innerHTML = '🏠';
            } else {
                space.textContent = i;
            }
            
            board.appendChild(space);
        }
        
        // Create meeples
        const playerMeeple = document.createElement('div');
        playerMeeple.id = 'player-meeple';
        playerMeeple.className = 'meeple green';
        board.appendChild(playerMeeple);
        
        const aiMeeple = document.createElement('div');
        aiMeeple.id = 'ai-meeple';
        aiMeeple.className = 'meeple blue';
        board.appendChild(aiMeeple);
        
        this.updateMeeplePositions();
    }

    initGame() {
        this.deck = shuffleDeck(createDeck());
        
        // Deal 4 cards to each player
        for (let i = 0; i < 4; i++) {
            this.playerHand.push(this.deck.pop());
            this.aiHand.push(this.deck.pop());
        }
        
        this.renderPlayerHand();
        this.renderAIHand();
        this.updateStatus();
        this.updateTurnIndicator();
        
        if (this.isPlayerTurn) {
            this.setMessage('Your turn! Drag 2 cards with different names to the slots.');
        }
    }

    bindEvents() {
        document.getElementById('confirm-play-btn').addEventListener('click', () => this.confirmPlay());
        document.getElementById('close-gameover-btn').addEventListener('click', () => this.closeGameOver());
        document.getElementById('play-again-btn').addEventListener('click', () => this.restart());
        
        // Drop zone events
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.addEventListener('dragover', (e) => this.handleDragOver(e));
            zone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
            zone.addEventListener('drop', (e) => this.handleDrop(e));
        });
        
        // Allow dropping back to player hand area
        document.getElementById('player-hand').addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        document.getElementById('player-hand').addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.draggedCard) {
                this.returnCardToHand(this.draggedCard);
            }
        });
    }

    renderPlayerHand() {
        const handEl = document.getElementById('player-hand');
        handEl.innerHTML = '';
        
        this.playerHand.forEach(card => {
            const count = countCardType(this.playerRecruited, card.type);
            const cardEl = createCardElement(card, { highlightIndex: Math.min(count, 2) });
            
            // Make draggable if it's player's turn
            if (this.isPlayerTurn && !this.gameOver) {
                cardEl.draggable = true;
                cardEl.addEventListener('dragstart', (e) => this.handleDragStart(e, card));
                cardEl.addEventListener('dragend', (e) => this.handleDragEnd(e));
            }
            
            handEl.appendChild(cardEl);
        });
        
        this.updateConfirmButton();
    }

    handleDragStart(e, card) {
        this.draggedCard = card;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.id);
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        if (!this.draggedCard) return;
        
        const slot = e.currentTarget.dataset.slot;
        const card = this.draggedCard;
        
        // Check if this card type conflicts with the other slot
        const otherCard = slot === 'faceup' ? this.faceDownCard : this.faceUpCard;
        if (otherCard && otherCard.type === card.type) {
            this.setMessage('Cards must have different names!');
            return;
        }
        
        // If this slot already has a card, return it to hand
        if (slot === 'faceup' && this.faceUpCard) {
            this.playerHand.push(this.faceUpCard);
        } else if (slot === 'facedown' && this.faceDownCard) {
            this.playerHand.push(this.faceDownCard);
        }
        
        // Remove card from hand
        this.playerHand = this.playerHand.filter(c => c.id !== card.id);
        
        // Place in slot
        if (slot === 'faceup') {
            this.faceUpCard = card;
        } else {
            this.faceDownCard = card;
        }
        
        this.renderPlayerHand();
        this.renderPlaySlots();
        this.updateConfirmButton();
        this.draggedCard = null;
    }

    returnCardToHand(card) {
        // Check if card is in a slot
        if (this.faceUpCard && this.faceUpCard.id === card.id) {
            this.playerHand.push(this.faceUpCard);
            this.faceUpCard = null;
        } else if (this.faceDownCard && this.faceDownCard.id === card.id) {
            this.playerHand.push(this.faceDownCard);
            this.faceDownCard = null;
        }
        
        this.renderPlayerHand();
        this.renderPlaySlots();
        this.updateConfirmButton();
        this.draggedCard = null;
    }

    renderPlaySlots() {
        const faceUpSlot = document.querySelector('#face-up-slot .slot-content');
        const faceDownSlot = document.querySelector('#face-down-slot .slot-content');
        
        faceUpSlot.innerHTML = '';
        faceDownSlot.innerHTML = '';
        
        if (this.faceUpCard) {
            const cardEl = createCardElement(this.faceUpCard);
            cardEl.draggable = true;
            cardEl.addEventListener('dragstart', (e) => this.handleDragStart(e, this.faceUpCard));
            cardEl.addEventListener('dragend', (e) => this.handleDragEnd(e));
            faceUpSlot.appendChild(cardEl);
        }
        
        if (this.faceDownCard) {
            // Show as card back in Face Down slot
            const cardEl = document.createElement('div');
            cardEl.className = 'card card-back';
            cardEl.draggable = true;
            cardEl.dataset.cardId = this.faceDownCard.id;
            cardEl.addEventListener('dragstart', (e) => this.handleDragStart(e, this.faceDownCard));
            cardEl.addEventListener('dragend', (e) => this.handleDragEnd(e));
            faceDownSlot.appendChild(cardEl);
        }
    }

    updateConfirmButton() {
        const btn = document.getElementById('confirm-play-btn');
        btn.disabled = !(this.faceUpCard && this.faceDownCard);
    }

    renderAIHand() {
        const handEl = document.getElementById('ai-hand');
        handEl.innerHTML = '';
        
        for (let i = 0; i < this.aiHand.length; i++) {
            const cardEl = document.createElement('div');
            cardEl.className = 'card card-back';
            handEl.appendChild(cardEl);
        }
    }

    renderRecruited(collection, elementId) {
        const container = document.getElementById(elementId);
        container.innerHTML = '';
        
        // Group by type for display
        const grouped = {};
        collection.forEach(card => {
            if (!grouped[card.type]) grouped[card.type] = [];
            grouped[card.type].push(card);
        });
        
        for (const type in grouped) {
            const cards = grouped[type];
            cards.forEach((card, idx) => {
                const highlightIdx = Math.min(idx, 2);
                const cardEl = createCardElement(card, { mini: true, highlightIndex: highlightIdx });
                container.appendChild(cardEl);
            });
        }
    }

    confirmPlay() {
        if (!this.faceUpCard || !this.faceDownCard) return;
        
        // Remove cards from hand (already done during drag)
        // Draw new cards
        this.drawCards('player', 2);
        this.renderPlayerHand();
        
        // Show played cards (face-down is shown to player but will be hidden text)
        this.showPlayedCardsForAI();
        
        // AI chooses
        this.setMessage('AI is choosing...');
        setTimeout(() => this.aiChoosesCard(), 1200);
    }

    showPlayedCardsForAI() {
        const faceUpSlot = document.querySelector('#face-up-slot .slot-content');
        const faceDownSlot = document.querySelector('#face-down-slot .slot-content');
        
        faceUpSlot.innerHTML = '';
        faceDownSlot.innerHTML = '';
        
        faceUpSlot.appendChild(createCardElement(this.faceUpCard));
        faceDownSlot.appendChild(createCardElement(this.faceDownCard, { faceDown: true }));
    }

    aiChoosesCard() {
        const result = this.ai.chooseCard(this.faceUpCard, this.faceDownCard);
        const aiChoice = result.chosen;
        const playerGets = result.remaining;
        
        // Reveal face-down
        const faceDownSlot = document.querySelector('#face-down-slot .slot-content');
        faceDownSlot.innerHTML = '';
        faceDownSlot.appendChild(createCardElement(this.faceDownCard));
        
        this.setMessage(`AI took: ${aiChoice.name}. You get: ${playerGets.name}`);
        
        // Add to collections
        this.aiRecruited.push(aiChoice);
        this.playerRecruited.push(playerGets);
        
        this.renderRecruited(this.aiRecruited, 'ai-recruited');
        this.renderRecruited(this.playerRecruited, 'player-recruited');
        
        // Move meeples
        setTimeout(() => this.resolveMoves(playerGets, aiChoice, true), 1200);
    }

    resolveMoves(playerCard, aiCard, wasPlayerTurn) {
        const playerCount = countCardType(this.playerRecruited, playerCard.type);
        const aiCount = countCardType(this.aiRecruited, aiCard.type);
        
        // Check for instant WIN/LOSE before moving
        const playerCondition = checkSpecialCondition(
            this.playerRecruited.slice(0, -1), playerCard
        );
        const aiCondition = checkSpecialCondition(
            this.aiRecruited.slice(0, -1), aiCard
        );
        
        if (playerCondition === 'WIN') {
            this.endGame('You collected 3 Codebreakers! YOU WIN! 🎉', true);
            return;
        }
        if (playerCondition === 'LOSE') {
            this.endGame('You collected 3 Daredevils! YOU LOSE! 💀', false);
            return;
        }
        if (aiCondition === 'WIN') {
            this.endGame('AI collected 3 Codebreakers! YOU LOSE! 💀', false);
            return;
        }
        if (aiCondition === 'LOSE') {
            this.endGame('AI collected 3 Daredevils! YOU WIN! 🎉', true);
            return;
        }
        
        // Calculate movements
        const playerMove = getMovementValue(playerCard, playerCount);
        const aiMove = getMovementValue(aiCard, aiCount);
        
        // Move positions (positive = toward opponent)
        this.playerPosition = this.wrapPosition(this.playerPosition + playerMove);
        this.aiPosition = this.wrapPosition(this.aiPosition - aiMove);
        
        this.updateMeeplePositions();
        this.updatePositionDisplays();
        
        const playerMoveText = playerMove >= 0 ? `+${playerMove}` : `${playerMove}`;
        const aiMoveText = aiMove >= 0 ? `+${aiMove}` : `${aiMove}`;
        this.setMessage(`You moved ${playerMoveText}. AI moved ${aiMoveText}.`);
        
        // Check catch conditions
        setTimeout(() => {
            if (this.checkCatchCondition(wasPlayerTurn)) return;
            
            this.clearPlayArea();
            
            if (wasPlayerTurn) {
                this.startAITurn();
            } else {
                this.startPlayerTurn();
            }
        }, 1000);
    }

    wrapPosition(pos) {
        while (pos < 1) pos += this.BOARD_SIZE;
        while (pos > this.BOARD_SIZE) pos -= this.BOARD_SIZE;
        return pos;
    }

    getDistance(from) {
        if (from === 'player') {
            let dist = this.aiPosition - this.playerPosition;
            if (dist < 0) dist += this.BOARD_SIZE;
            return dist;
        } else {
            let dist = this.playerPosition - this.aiPosition;
            if (dist < 0) dist += this.BOARD_SIZE;
            return dist;
        }
    }

    checkCatchCondition(wasPlayerTurn) {
        if (this.playerPosition === this.aiPosition) {
            this.endGame('Spies collided! Active player wins! 🎉', wasPlayerTurn);
            return true;
        }
        
        const playerDist = this.getDistance('player');
        const aiDist = this.getDistance('ai');
        
        if (playerDist > 10) {
            this.endGame('You caught the AI spy! YOU WIN! 🎉', true);
            return true;
        }
        if (aiDist > 10) {
            this.endGame('AI caught you! YOU LOSE! 💀', false);
            return true;
        }
        
        if (this.deck.length === 0) {
            if (this.playerHand.length < 2 || this.aiHand.length < 2) {
                const playerCloser = playerDist < aiDist;
                if (playerCloser) {
                    this.endGame('Deck empty - You are closer! YOU WIN! 🎉', true);
                } else if (aiDist < playerDist) {
                    this.endGame('Deck empty - AI is closer! YOU LOSE! 💀', false);
                } else {
                    this.endGame('Deck empty - Tie goes to active player!', wasPlayerTurn);
                }
                return true;
            }
        }
        
        return false;
    }

    updateMeeplePositions() {
        const board = document.getElementById('board');
        const spaces = board.querySelectorAll('.board-space');
        
        spaces.forEach(s => {
            s.classList.remove('has-green', 'has-blue');
        });
        
        let playerSpace, aiSpace;
        spaces.forEach(space => {
            const pos = parseInt(space.dataset.position);
            if (pos === this.playerPosition) {
                playerSpace = space;
                space.classList.add('has-green');
            }
            if (pos === this.aiPosition) {
                aiSpace = space;
                space.classList.add('has-blue');
            }
        });
        
        const playerMeeple = document.getElementById('player-meeple');
        const aiMeeple = document.getElementById('ai-meeple');
        
        if (playerSpace) {
            playerMeeple.style.left = (playerSpace.offsetLeft + 10) + 'px';
            playerMeeple.style.top = (playerSpace.offsetTop + 10) + 'px';
        }
        
        if (aiSpace) {
            aiMeeple.style.left = (aiSpace.offsetLeft + 10) + 'px';
            aiMeeple.style.top = (aiSpace.offsetTop + 10) + 'px';
        }
    }

    updatePositionDisplays() {
        document.getElementById('player-position').textContent = this.playerPosition;
        document.getElementById('ai-position').textContent = this.aiPosition;
    }

    updateTurnIndicator() {
        const indicator = document.getElementById('turn-indicator');
        const instruction = document.getElementById('play-instruction');
        
        if (this.isPlayerTurn) {
            indicator.textContent = "Your Turn";
            indicator.classList.remove('ai-turn');
            instruction.textContent = 'Drag 2 different cards to the slots';
        } else {
            indicator.textContent = "AI's Turn";
            indicator.classList.add('ai-turn');
            instruction.textContent = 'AI is playing...';
        }
    }

    startAITurn() {
        this.isPlayerTurn = false;
        this.updateTurnIndicator();
        this.setMessage('AI is thinking...');
        this.renderPlayerHand();
        
        setTimeout(() => this.aiPlaysTurn(), 1500);
    }

    aiPlaysTurn() {
        const play = this.ai.playTurn();
        
        if (!play) {
            this.checkCatchCondition(false);
            return;
        }
        
        this.faceUpCard = play.faceUpCard;
        this.faceDownCard = play.faceDownCard;
        
        // Remove from AI hand
        this.aiHand = this.aiHand.filter(c => 
            c.id !== this.faceUpCard.id && c.id !== this.faceDownCard.id
        );
        
        this.drawCards('ai', 2);
        this.renderAIHand();
        
        // Show only face-up card, face-down remains hidden
        this.showAIPlayedCards();
        
        this.setMessage(`AI played ${this.faceUpCard.name} face-up. Choose one card!`);
        
        setTimeout(() => this.playerChoosesCard(), 1000);
    }

    showAIPlayedCards() {
        const faceUpSlot = document.querySelector('#face-up-slot .slot-content');
        const faceDownSlot = document.querySelector('#face-down-slot .slot-content');
        
        faceUpSlot.innerHTML = '';
        faceDownSlot.innerHTML = '';
        
        // Show face-up card
        faceUpSlot.appendChild(createCardElement(this.faceUpCard));
        
        // Face-down stays hidden
        const hiddenCard = document.createElement('div');
        hiddenCard.className = 'card card-back';
        faceDownSlot.appendChild(hiddenCard);
    }

    playerChoosesCard() {
        const modal = document.getElementById('choice-modal');
        const title = document.getElementById('choice-title');
        const desc = document.getElementById('choice-description');
        const cardsContainer = document.getElementById('choice-cards');
        
        title.textContent = 'Choose Your Card';
        desc.textContent = 'Pick the face-up card OR take a chance on the hidden one:';
        cardsContainer.innerHTML = '';
        
        // Face-up card - shown
        const faceUpCount = countCardType(this.playerRecruited, this.faceUpCard.type);
        const faceUpEl = createCardElement(this.faceUpCard, { clickable: true, highlightIndex: Math.min(faceUpCount, 2) });
        faceUpEl.addEventListener('click', () => this.playerTakesCard(this.faceUpCard));
        cardsContainer.appendChild(faceUpEl);
        
        // Face-down card - shown as BACK (blind choice!)
        const faceDownEl = document.createElement('div');
        faceDownEl.className = 'card card-back clickable';
        faceDownEl.innerHTML = '<div style="position:absolute;bottom:5px;width:100%;text-align:center;font-size:0.7rem;color:#888;">Mystery</div>';
        faceDownEl.addEventListener('click', () => this.playerTakesCard(this.faceDownCard));
        cardsContainer.appendChild(faceDownEl);
        
        modal.classList.remove('hidden');
    }

    playerTakesCard(playerChoice) {
        const aiGets = playerChoice.id === this.faceUpCard.id ? this.faceDownCard : this.faceUpCard;
        
        document.getElementById('choice-modal').classList.add('hidden');
        
        // Now reveal the face-down card in the slot
        const faceDownSlot = document.querySelector('#face-down-slot .slot-content');
        faceDownSlot.innerHTML = '';
        faceDownSlot.appendChild(createCardElement(this.faceDownCard));
        
        this.setMessage(`You took: ${playerChoice.name}. AI gets: ${aiGets.name}`);
        
        this.playerRecruited.push(playerChoice);
        this.aiRecruited.push(aiGets);
        
        this.renderRecruited(this.playerRecruited, 'player-recruited');
        this.renderRecruited(this.aiRecruited, 'ai-recruited');
        
        setTimeout(() => this.resolveMoves(playerChoice, aiGets, false), 1200);
    }

    startPlayerTurn() {
        this.isPlayerTurn = true;
        this.faceUpCard = null;
        this.faceDownCard = null;
        
        this.updateTurnIndicator();
        this.setMessage('Your turn! Drag 2 cards with different names to the slots.');
        this.renderPlayerHand();
        this.renderPlaySlots();
        this.updateConfirmButton();
    }

    clearPlayArea() {
        document.querySelector('#face-up-slot .slot-content').innerHTML = '';
        document.querySelector('#face-down-slot .slot-content').innerHTML = '';
        this.faceUpCard = null;
        this.faceDownCard = null;
    }

    drawCards(player, count) {
        const hand = player === 'player' ? this.playerHand : this.aiHand;
        for (let i = 0; i < count && this.deck.length > 0; i++) {
            hand.push(this.deck.pop());
        }
        this.updateStatus();
    }

    setMessage(msg) {
        document.getElementById('game-message').textContent = msg;
    }

    updateStatus() {
        document.getElementById('deck-count').textContent = this.deck.length;
        document.getElementById('discard-count').textContent = this.playerRedraws;
    }

    endGame(message, playerWins) {
        this.gameOver = true;
        
        const modal = document.getElementById('gameover-modal');
        const title = document.getElementById('gameover-title');
        const msg = document.getElementById('gameover-message');
        
        title.textContent = playerWins ? '🎉 Victory!' : '💀 Defeat';
        title.style.color = playerWins ? '#27ae60' : '#e74c3c';
        msg.textContent = message;
        
        modal.classList.remove('hidden');
    }

    closeGameOver() {
        document.getElementById('gameover-modal').classList.add('hidden');
        document.getElementById('play-again-btn').classList.remove('hidden');
    }

    restart() {
        // Reset state
        this.deck = [];
        this.playerHand = [];
        this.aiHand = [];
        this.playerRecruited = [];
        this.aiRecruited = [];
        this.playerPosition = this.PLAYER_START;
        this.aiPosition = this.AI_START;
        this.playerRedraws = 4;
        this.isPlayerTurn = true;
        this.faceUpCard = null;
        this.faceDownCard = null;
        this.gameOver = false;
        this.draggedCard = null;
        
        // Reset UI
        document.getElementById('gameover-modal').classList.add('hidden');
        document.getElementById('play-again-btn').classList.add('hidden');
        this.clearPlayArea();
        document.getElementById('player-recruited').innerHTML = '';
        document.getElementById('ai-recruited').innerHTML = '';
        
        // Start with coin flip
        this.showCoinFlip();
    }
}

// Toggle rules panel
function toggleRules() {
    document.getElementById('rules-panel').classList.toggle('hidden');
}

// Initialize game on load
window.addEventListener('load', () => {
    window.game = new ChaseOnGame();
});

// Handle window resize for meeple positions
window.addEventListener('resize', () => {
    if (window.game && !window.game.gameOver) {
        window.game.updateMeeplePositions();
    }
});
