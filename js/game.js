// Chase On - Main Game Logic

class ChaseOnGame {
    constructor() {
        // Board configuration - circular with 14 spots
        this.BOARD_SIZE = 14;
        this.PLAYER_START = 8;  // Blue (human) starts at position 8
        this.AI_START = 1;      // Green (AI) starts at position 1
        
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
            coin.classList.add(this.isPlayerTurn ? 'result-blue' : 'result-green');
            
            // Show result after animation
            setTimeout(() => {
                if (this.isPlayerTurn) {
                    result.textContent = '🦁 You go first!';
                    result.style.color = '#3498db';
                } else {
                    result.textContent = '🦖 AI goes first!';
                    result.style.color = '#27ae60';
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
        
        // Rectangular track layout: 14 positions forming a rectangle
        // Top: 5 spaces (1-5), Right: 2 spaces (6-7), Bottom: 5 spaces (8-12), Left: 2 spaces (13-14)
        const spaceWidth = 160;
        const spaceHeight = 80;
        const gapH = 12; // Horizontal gap
        const gapV = 12; // Vertical gap
        const stepX = spaceWidth + gapH;  // 110px
        const stepY = spaceHeight + gapV; // 70px
        const offsetX = 10; // Centering offset
        const offsetY = 5;
        
        // Position coordinates map
        const positions = {
            // Top row (left to right)
            1:  { x: 0, y: 0 },
            2:  { x: stepX, y: 0 },
            3:  { x: stepX * 2, y: 0 },
            4:  { x: stepX * 3, y: 0 },
            5:  { x: stepX * 4, y: 0 },
            // Right side (top to bottom)
            6:  { x: stepX * 4, y: stepY },
            7:  { x: stepX * 4, y: stepY * 2 },
            // Bottom row (right to left)
            8:  { x: stepX * 4, y: stepY * 3 },
            9:  { x: stepX * 3, y: stepY * 3 },
            10: { x: stepX * 2, y: stepY * 3 },
            11: { x: stepX, y: stepY * 3 },
            12: { x: 0, y: stepY * 3 },
            // Left side (bottom to top)
            13: { x: 0, y: stepY * 2 },
            14: { x: 0, y: stepY }
        };
        
        // Create 14 rectangular positions
        for (let i = 1; i <= this.BOARD_SIZE; i++) {
            const pos = positions[i];
            
            const space = document.createElement('div');
            space.className = 'board-space';
            space.dataset.position = i;
            space.style.left = (pos.x + offsetX) + 'px';
            space.style.top = (pos.y + offsetY) + 'px';
            
            if (i === this.AI_START) {
                space.classList.add('home-green');
                space.innerHTML = '🏠';
            } else if (i === this.PLAYER_START) {
                space.classList.add('home-blue');
                space.innerHTML = '🏠';
            }
            // No number display for other spaces
            
            board.appendChild(space);
        }
        
        // Create meeples
        const playerMeeple = document.createElement('div');
        playerMeeple.id = 'player-meeple';
        playerMeeple.className = 'meeple blue';
        board.appendChild(playerMeeple);
        
        const aiMeeple = document.createElement('div');
        aiMeeple.id = 'ai-meeple';
        aiMeeple.className = 'meeple green';
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
        
        // Create drag ghost
        const ghost = createCardElement(card);
        ghost.className += ' drag-ghost';
        ghost.id = 'drag-ghost';
        document.body.appendChild(ghost);
        
        // Position ghost at cursor
        const moveGhost = (ev) => {
            ghost.style.left = (ev.clientX - 45) + 'px';
            ghost.style.top = (ev.clientY - 63) + 'px';
        };
        moveGhost(e);
        document.addEventListener('mousemove', moveGhost);
        this._ghostMoveHandler = moveGhost;
        
        // Hide default drag image
        const emptyImg = document.createElement('img');
        emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(emptyImg, 0, 0);
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drag-over');
        });
        
        // Remove ghost
        const ghost = document.getElementById('drag-ghost');
        if (ghost) ghost.remove();
        if (this._ghostMoveHandler) {
            document.removeEventListener('mousemove', this._ghostMoveHandler);
            this._ghostMoveHandler = null;
        }
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
        
        // Add landing animation to the dropped card
        const slotContent = e.currentTarget.querySelector('.slot-content');
        const landedCard = slotContent.querySelector('.card');
        if (landedCard) {
            landedCard.classList.add('just-landed');
            setTimeout(() => landedCard.classList.remove('just-landed'), 300);
        }
        
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
        const playArea = document.getElementById('play-area');
        const faceUpSlot = document.getElementById('face-up-slot');
        const faceDownSlot = document.getElementById('face-down-slot');
        
        const ready = this.faceUpCard && this.faceDownCard;
        btn.disabled = !ready;
        
        // Visual feedback when ready
        playArea.classList.toggle('ready-to-confirm', ready);
        faceUpSlot.classList.toggle('filled', !!this.faceUpCard);
        faceDownSlot.classList.toggle('filled', !!this.faceDownCard);
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
        
        // Create stacked card groups
        for (const type in grouped) {
            const cards = grouped[type];
            const stackDiv = document.createElement('div');
            stackDiv.className = 'card-stack';
            
            cards.forEach((card, idx) => {
                const highlightIdx = Math.min(idx, 2);
                const cardEl = createCardElement(card, { mini: true, highlightIndex: highlightIdx });
                cardEl.style.position = idx > 0 ? 'absolute' : 'relative';
                cardEl.style.top = (idx * 6) + 'px';
                cardEl.style.left = '0';
                cardEl.style.zIndex = idx;
                stackDiv.appendChild(cardEl);
            });
            
            // Set stack height based on number of cards
            stackDiv.style.height = (70 + (cards.length - 1) * 6) + 'px';
            container.appendChild(stackDiv);
        }
    }

    confirmPlay() {
        if (!this.faceUpCard || !this.faceDownCard) return;
        
        // Add confirming animation to cards in slots
        const faceUpSlot = document.querySelector('#face-up-slot .slot-content .card');
        const faceDownSlot = document.querySelector('#face-down-slot .slot-content .card');
        
        if (faceUpSlot) faceUpSlot.classList.add('confirming');
        if (faceDownSlot) faceDownSlot.classList.add('confirming');
        
        // Disable button during animation
        document.getElementById('confirm-play-btn').disabled = true;
        document.getElementById('play-area').classList.remove('ready-to-confirm');
        
        this.setMessage('Playing cards...');
        
        // Wait for animation, then proceed
        setTimeout(() => {
            // Draw new cards
            this.drawCards('player', 2);
            this.renderPlayerHand();
            
            // Show played cards for AI to choose
            this.showPlayedCardsForAI();
            
            // AI chooses
            this.setMessage('AI is choosing...');
            setTimeout(() => this.aiChoosesCard(), 1000);
        }, 500);
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
        
        // Store old positions
        const playerOldPos = this.playerPosition;
        const aiOldPos = this.aiPosition;
        
        // Calculate movements
        const playerMove = getMovementValue(playerCard, playerCount);
        const aiMove = getMovementValue(aiCard, aiCount);
        
        // Move positions: positive = clockwise, negative = counter-clockwise
        this.playerPosition = this.wrapPosition(this.playerPosition + playerMove);
        this.aiPosition = this.wrapPosition(this.aiPosition + aiMove);
        
        this.updateMeeplePositions();
        
        const playerMoveText = playerMove >= 0 ? `+${playerMove}` : `${playerMove}`;
        const aiMoveText = aiMove >= 0 ? `+${aiMove}` : `${aiMove}`;
        this.setMessage(`You moved ${playerMoveText}. AI moved ${aiMoveText}.`);
        
        // Check catch conditions with movement info
        setTimeout(() => {
            if (this.checkCatchCondition(playerOldPos, aiOldPos, playerMove, aiMove)) return;
            
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
        // Both players move clockwise, so distance is always measured clockwise
        if (from === 'player') {
            // Player chasing AI clockwise
            let dist = this.aiPosition - this.playerPosition;
            if (dist <= 0) dist += this.BOARD_SIZE;
            return dist;
        } else {
            // AI chasing player clockwise
            let dist = this.playerPosition - this.aiPosition;
            if (dist <= 0) dist += this.BOARD_SIZE;
            return dist;
        }
    }

    checkCatchCondition(playerOldPos, aiOldPos, playerMove, aiMove) {
        const playerNewPos = this.playerPosition;
        const aiNewPos = this.aiPosition;
        
        // Condition 1: Both players on same position - compare actual movement values
        if (playerNewPos === aiNewPos) {
            if (playerMove > aiMove) {
                this.endGame('Same position - Blue moved more!', true);
            } else if (aiMove > playerMove) {
                this.endGame('Same position - Green moved more!', false);
            } else {
                this.endGame('Same position - Equal movement! It\'s a tie!', true);
            }
            return true;
        }
        
        // Condition 2: Check for overtake
        // The player who moved MORE positions checks if they crossed any position
        // from the other player's series (old pos + all positions moved through)
        // Also check if the other player's final position is in the winner's movement series
        const playerAbsMove = Math.abs(playerMove);
        const aiAbsMove = Math.abs(aiMove);
        
        if (playerAbsMove > aiAbsMove) {
            // Player moved more - check if player's path includes any of AI's positions
            const playerSeries = this.getMovementSeries(playerOldPos, playerMove);
            const aiSeries = this.getMovementSeries(aiOldPos, aiMove, true); // include start pos
            
            // Check if any AI position (including start) or AI's final position is in player's path
            const overtook = aiSeries.some(pos => playerSeries.includes(pos)) || playerSeries.includes(aiNewPos);
            if (overtook) {
                this.endGame('Blue spy overtook Green!', true);
                return true;
            }
        } else if (aiAbsMove > playerAbsMove) {
            // AI moved more - check if AI's path includes any of player's positions
            const aiSeries = this.getMovementSeries(aiOldPos, aiMove);
            const playerSeries = this.getMovementSeries(playerOldPos, playerMove, true); // include start pos
            
            // Check if any player position (including start) or player's final position is in AI's path
            const overtook = playerSeries.some(pos => aiSeries.includes(pos)) || aiSeries.includes(playerNewPos);
            if (overtook) {
                this.endGame('Green spy overtook Blue!', false);
                return true;
            }
        }
        // If equal absolute movement but different positions, no overtake
        
        // Condition 3: Deck exhausted and can't play
        if (this.deck.length === 0) {
            if (this.playerHand.length < 2 || this.aiHand.length < 2) {
                const playerDist = this.shortestDistance(playerNewPos, aiNewPos);
                const aiDist = this.shortestDistance(aiNewPos, playerNewPos);
                
                if (playerDist < aiDist) {
                    this.endGame('Deck empty - Blue is closer!', true);
                } else if (aiDist < playerDist) {
                    this.endGame('Deck empty - Green is closer!', false);
                } else {
                    this.endGame('Deck empty - Equal distance!', true);
                }
                return true;
            }
        }
        
        return false;
    }
    
    // Get all positions passed through during movement
    // If includeStart is true, includes the starting position (for the player who moved less)
    getMovementSeries(startPos, moveAmount, includeStart = false) {
        const series = [];
        
        if (includeStart) {
            series.push(startPos);
        }
        
        if (moveAmount === 0) {
            if (!includeStart) series.push(startPos); // If no movement, current pos is the series
            return series;
        }
        
        const direction = moveAmount > 0 ? 1 : -1;
        const steps = Math.abs(moveAmount);
        
        for (let i = 1; i <= steps; i++) {
            const pos = this.wrapPosition(startPos + (i * direction));
            series.push(pos);
        }
        
        return series;
    }
    
    // Shortest distance between two positions on circular board
    shortestDistance(pos1, pos2) {
        const clockwise = this.clockwiseDistance(pos1, pos2);
        const counterClockwise = this.BOARD_SIZE - clockwise;
        return Math.min(clockwise, counterClockwise);
    }
    
    // Calculate clockwise distance from pos1 to pos2
    clockwiseDistance(pos1, pos2) {
        let dist = pos2 - pos1;
        if (dist <= 0) dist += this.BOARD_SIZE;
        return dist;
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
                space.classList.add('has-blue');
            }
            if (pos === this.aiPosition) {
                aiSpace = space;
                space.classList.add('has-green');
            }
        });
        
        const playerMeeple = document.getElementById('player-meeple');
        const aiMeeple = document.getElementById('ai-meeple');
        
        if (playerSpace) {
            playerMeeple.style.left = (playerSpace.offsetLeft + playerSpace.offsetWidth / 2) + 'px';
            playerMeeple.style.top = (playerSpace.offsetTop + playerSpace.offsetHeight / 2) + 'px';
        }
        
        if (aiSpace) {
            aiMeeple.style.left = (aiSpace.offsetLeft + aiSpace.offsetWidth / 2) + 'px';
            aiMeeple.style.top = (aiSpace.offsetTop + aiSpace.offsetHeight / 2) + 'px';
        }
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
        
        // Blue = human player, Green = AI
        if (playerWins) {
            title.textContent = '🎉 Victory!';
            title.style.color = '#3498db'; // Blue
            msg.textContent = message + ' You win!';
        } else {
            title.textContent = '💀 Defeat';
            title.style.color = '#e74c3c'; // Red for defeat
            msg.textContent = message + ' AI wins!';
        }
        
        modal.classList.remove('hidden');
    }

    closeGameOver() {
        document.getElementById('gameover-modal').classList.add('hidden');
        document.getElementById('play-again-btn').classList.remove('hidden');
        
        // Disable confirm button
        document.getElementById('confirm-play-btn').disabled = true;
        
        // Make cards non-interactive
        document.querySelectorAll('#player-hand .card').forEach(card => {
            card.draggable = false;
            card.classList.add('disabled');
        });
        
        // Clear play area visual states
        document.getElementById('play-area').classList.remove('ready-to-confirm');
        document.getElementById('face-up-slot').classList.remove('filled');
        document.getElementById('face-down-slot').classList.remove('filled');
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
