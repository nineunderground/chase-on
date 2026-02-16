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
        this.selectedCards = [];
        this.faceUpCard = null;
        this.faceDownCard = null;
        this.gameOver = false;
        
        this.ai = new AIPlayer(this);
        
        this.initBoard();
        this.initGame();
        this.bindEvents();
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
        this.setMessage('Your turn! Select 2 cards with different names.');
    }

    bindEvents() {
        document.getElementById('confirm-play-btn').addEventListener('click', () => this.confirmPlay());
        document.getElementById('clear-play-btn').addEventListener('click', () => this.clearSelection());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
    }

    renderPlayerHand() {
        const handEl = document.getElementById('player-hand');
        handEl.innerHTML = '';
        
        this.playerHand.forEach(card => {
            const count = countCardType(this.playerRecruited, card.type);
            const cardEl = createCardElement(card, { highlightIndex: Math.min(count, 2) });
            cardEl.addEventListener('click', () => this.selectCard(card));
            handEl.appendChild(cardEl);
        });
        
        this.updateCardSelectionState();
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
            const count = cards.length;
            cards.forEach((card, idx) => {
                const highlightIdx = Math.min(idx, 2);
                const cardEl = createCardElement(card, { mini: true, highlightIndex: highlightIdx });
                container.appendChild(cardEl);
            });
        }
    }

    selectCard(card) {
        if (!this.isPlayerTurn || this.gameOver) return;
        
        const index = this.selectedCards.findIndex(c => c.id === card.id);
        
        if (index >= 0) {
            this.selectedCards.splice(index, 1);
        } else {
            if (this.selectedCards.length >= 2) {
                this.setMessage('Deselect a card first, or click Clear.');
                return;
            }
            
            if (this.selectedCards.length === 1 && this.selectedCards[0].type === card.type) {
                this.setMessage('Cards must have different names!');
                return;
            }
            
            this.selectedCards.push(card);
        }
        
        this.updateCardSelectionState();
        this.updatePlayButtons();
    }

    updateCardSelectionState() {
        const handEl = document.getElementById('player-hand');
        const cards = handEl.querySelectorAll('.card');
        
        cards.forEach(cardEl => {
            const cardId = parseInt(cardEl.dataset.cardId);
            const isSelected = this.selectedCards.some(c => c.id === cardId);
            cardEl.classList.toggle('selected', isSelected);
            
            if (this.selectedCards.length === 1 && !isSelected) {
                const cardType = cardEl.dataset.cardType;
                cardEl.classList.toggle('disabled', this.selectedCards[0].type === cardType);
            } else {
                cardEl.classList.remove('disabled');
            }
        });
    }

    updatePlayButtons() {
        document.getElementById('confirm-play-btn').disabled = this.selectedCards.length !== 2;
        document.getElementById('clear-play-btn').disabled = this.selectedCards.length === 0;
    }

    confirmPlay() {
        if (this.selectedCards.length !== 2) return;
        this.showFaceUpChoice();
    }

    showFaceUpChoice() {
        const modal = document.getElementById('choice-modal');
        const title = document.getElementById('choice-title');
        const desc = document.getElementById('choice-description');
        const cardsContainer = document.getElementById('choice-cards');
        
        title.textContent = 'Choose Face-Up Card';
        desc.textContent = 'Which card to show? (Other will be face-down)';
        cardsContainer.innerHTML = '';
        
        this.selectedCards.forEach(card => {
            const cardEl = createCardElement(card, { clickable: true });
            cardEl.addEventListener('click', () => this.selectFaceUp(card));
            cardsContainer.appendChild(cardEl);
        });
        
        modal.classList.remove('hidden');
    }

    selectFaceUp(card) {
        this.faceUpCard = card;
        this.faceDownCard = this.selectedCards.find(c => c.id !== card.id);
        
        document.getElementById('choice-modal').classList.add('hidden');
        
        // Remove from hand
        this.playerHand = this.playerHand.filter(c => 
            c.id !== this.faceUpCard.id && c.id !== this.faceDownCard.id
        );
        
        // Draw new cards
        this.drawCards('player', 2);
        this.renderPlayerHand();
        
        // Show played cards
        this.showPlayedCards();
        
        // AI chooses
        this.setMessage('AI is choosing...');
        setTimeout(() => this.aiChoosesCard(), 1200);
    }

    showPlayedCards() {
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

    resolveMoves(playerCard, aiCard, isPlayerTurn) {
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
        const oldPlayerPos = this.playerPosition;
        const oldAiPos = this.aiPosition;
        
        // Player moves toward AI (clockwise from position 1 toward 8)
        this.playerPosition = this.wrapPosition(this.playerPosition + playerMove);
        // AI moves toward player (counter-clockwise from position 8 toward 1)
        this.aiPosition = this.wrapPosition(this.aiPosition - aiMove);
        
        this.updateMeeplePositions();
        this.updatePositionDisplays();
        
        const playerMoveText = playerMove >= 0 ? `+${playerMove}` : `${playerMove}`;
        const aiMoveText = aiMove >= 0 ? `+${aiMove}` : `${aiMove}`;
        this.setMessage(`You moved ${playerMoveText}. AI moved ${aiMoveText}.`);
        
        // Check catch conditions
        setTimeout(() => {
            if (this.checkCatchCondition()) return;
            
            this.clearPlayArea();
            
            if (isPlayerTurn) {
                this.startAITurn();
            } else {
                this.startPlayerTurn();
            }
        }, 1000);
    }

    wrapPosition(pos) {
        // Circular board: 1-14
        while (pos < 1) pos += this.BOARD_SIZE;
        while (pos > this.BOARD_SIZE) pos -= this.BOARD_SIZE;
        return pos;
    }

    getDistance(from) {
        // Calculate shortest distance on circular board
        // Player chases AI clockwise, AI chases player counter-clockwise
        if (from === 'player') {
            // Player at pos 1 chasing AI at pos 8 = 7 steps clockwise
            let dist = this.aiPosition - this.playerPosition;
            if (dist < 0) dist += this.BOARD_SIZE;
            return dist;
        } else {
            // AI at pos 8 chasing player at pos 1 = 7 steps counter-clockwise
            let dist = this.playerPosition - this.aiPosition;
            if (dist < 0) dist += this.BOARD_SIZE;
            return dist;
        }
    }

    checkCatchCondition() {
        // Check if meeples are on same position or have passed each other
        if (this.playerPosition === this.aiPosition) {
            // Same position - whoever's turn it was wins
            this.endGame('Spies collided! Active player wins! 🎉', this.isPlayerTurn);
            return true;
        }
        
        // Check if player caught AI (player's forward direction)
        const playerDist = this.getDistance('player');
        const aiDist = this.getDistance('ai');
        
        // If distances are very large (>10), someone passed through
        if (playerDist > 10) {
            this.endGame('You caught the AI spy! YOU WIN! 🎉', true);
            return true;
        }
        if (aiDist > 10) {
            this.endGame('AI caught you! YOU LOSE! 💀', false);
            return true;
        }
        
        // Check deck exhaustion
        if (this.deck.length === 0) {
            if (this.playerHand.length < 2 || this.aiHand.length < 2) {
                const playerCloser = playerDist < aiDist;
                if (playerCloser) {
                    this.endGame('Deck empty - You are closer! YOU WIN! 🎉', true);
                } else if (aiDist < playerDist) {
                    this.endGame('Deck empty - AI is closer! YOU LOSE! 💀', false);
                } else {
                    this.endGame('Deck empty - Tie goes to active player!', this.isPlayerTurn);
                }
                return true;
            }
        }
        
        return false;
    }

    updateMeeplePositions() {
        const board = document.getElementById('board');
        const spaces = board.querySelectorAll('.board-space');
        
        // Clear highlights
        spaces.forEach(s => {
            s.classList.remove('has-green', 'has-blue');
        });
        
        // Find positions
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
        
        // Position meeples
        const playerMeeple = document.getElementById('player-meeple');
        const aiMeeple = document.getElementById('ai-meeple');
        
        if (playerSpace) {
            const rect = playerSpace.getBoundingClientRect();
            const boardRect = board.getBoundingClientRect();
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

    startAITurn() {
        this.isPlayerTurn = false;
        this.selectedCards = [];
        
        document.getElementById('turn-indicator').textContent = "AI's Turn";
        document.getElementById('turn-indicator').classList.add('ai-turn');
        document.getElementById('play-instruction').textContent = 'AI is playing...';
        
        this.setMessage('AI is thinking...');
        this.renderPlayerHand();
        
        setTimeout(() => this.aiPlaysTurn(), 1500);
    }

    aiPlaysTurn() {
        const play = this.ai.playTurn();
        
        if (!play) {
            this.checkCatchCondition();
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
        
        // Show played cards
        this.showPlayedCards();
        
        this.setMessage(`AI played ${this.faceUpCard.name} face-up. Choose one card!`);
        
        setTimeout(() => this.playerChoosesCard(), 1000);
    }

    playerChoosesCard() {
        const modal = document.getElementById('choice-modal');
        const title = document.getElementById('choice-title');
        const desc = document.getElementById('choice-description');
        const cardsContainer = document.getElementById('choice-cards');
        
        title.textContent = 'Choose Your Card';
        desc.textContent = 'Pick one to add to your collection:';
        cardsContainer.innerHTML = '';
        
        // Reveal face-down card
        const faceDownSlot = document.querySelector('#face-down-slot .slot-content');
        faceDownSlot.innerHTML = '';
        faceDownSlot.appendChild(createCardElement(this.faceDownCard));
        
        // Show both as choices
        [this.faceUpCard, this.faceDownCard].forEach(card => {
            const playerCount = countCardType(this.playerRecruited, card.type);
            const cardEl = createCardElement(card, { clickable: true, highlightIndex: Math.min(playerCount, 2) });
            cardEl.addEventListener('click', () => this.playerTakesCard(card));
            cardsContainer.appendChild(cardEl);
        });
        
        modal.classList.remove('hidden');
    }

    playerTakesCard(playerChoice) {
        const aiGets = playerChoice.id === this.faceUpCard.id ? this.faceDownCard : this.faceUpCard;
        
        document.getElementById('choice-modal').classList.add('hidden');
        
        this.setMessage(`You took: ${playerChoice.name}. AI gets: ${aiGets.name}`);
        
        this.playerRecruited.push(playerChoice);
        this.aiRecruited.push(aiGets);
        
        this.renderRecruited(this.playerRecruited, 'player-recruited');
        this.renderRecruited(this.aiRecruited, 'ai-recruited');
        
        setTimeout(() => this.resolveMoves(playerChoice, aiGets, false), 1200);
    }

    startPlayerTurn() {
        this.isPlayerTurn = true;
        this.selectedCards = [];
        
        document.getElementById('turn-indicator').textContent = "Your Turn";
        document.getElementById('turn-indicator').classList.remove('ai-turn');
        document.getElementById('play-instruction').textContent = 'Select 2 different cards to play';
        
        this.setMessage('Your turn! Select 2 cards with different names.');
        this.renderPlayerHand();
        this.updatePlayButtons();
    }

    clearPlayArea() {
        document.querySelector('#face-up-slot .slot-content').innerHTML = '';
        document.querySelector('#face-down-slot .slot-content').innerHTML = '';
        this.faceUpCard = null;
        this.faceDownCard = null;
    }

    clearSelection() {
        this.selectedCards = [];
        this.updateCardSelectionState();
        this.updatePlayButtons();
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
        this.selectedCards = [];
        this.faceUpCard = null;
        this.faceDownCard = null;
        this.gameOver = false;
        
        // Reset UI
        document.getElementById('gameover-modal').classList.add('hidden');
        this.clearPlayArea();
        document.getElementById('player-recruited').innerHTML = '';
        document.getElementById('ai-recruited').innerHTML = '';
        document.getElementById('turn-indicator').textContent = "Your Turn";
        document.getElementById('turn-indicator').classList.remove('ai-turn');
        document.getElementById('play-instruction').textContent = 'Select 2 different cards to play';
        
        this.initBoard();
        this.initGame();
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
    if (window.game) {
        window.game.updateMeeplePositions();
    }
});
