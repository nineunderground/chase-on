// Chase On - AI Logic

class AIPlayer {
    constructor(game) {
        this.game = game;
    }

    // AI chooses which card to take from the two played cards
    chooseCard(faceUpCard, faceDownCard) {
        const aiCollection = this.game.aiRecruited;
        const playerCollection = this.game.playerRecruited;
        
        const faceUpScore = this.evaluateCardForAI(faceUpCard, aiCollection, playerCollection);
        const faceDownScore = this.evaluateCardForAI(faceDownCard, aiCollection, playerCollection);
        
        // Small randomness for unpredictability
        const noise = (Math.random() - 0.5) * 5;
        
        if (faceUpScore + noise > faceDownScore) {
            return { chosen: faceUpCard, remaining: faceDownCard };
        } else {
            return { chosen: faceDownCard, remaining: faceUpCard };
        }
    }

    // Evaluate how good a card is for AI to take
    evaluateCardForAI(card, aiCollection, playerCollection) {
        let score = 0;
        const aiCount = countCardType(aiCollection, card.type);
        const playerCount = countCardType(playerCollection, card.type);
        
        // Codebreaker - very valuable
        if (card.type === 'CODEBREAKER') {
            if (aiCount === 2) return 200; // Winning move!
            if (playerCount === 2) return 150; // Deny player win
            score += 30 + aiCount * 15;
        }
        // Daredevil - avoid if we have 2, give to player if they have 2
        else if (card.type === 'DAREDEVIL') {
            if (aiCount === 2) return -200; // Would lose!
            if (playerCount === 2) return -100; // Let player take it
            // Fast movement is good, but risky
            const movement = this.getExpectedMovement(card, aiCount + 1);
            score += movement * 3 - 20;
        }
        // Other cards - evaluate by movement and position
        else {
            const movement = this.getExpectedMovement(card, aiCount + 1);
            const distance = this.game.getDistance('ai');
            
            // Positive movement toward player is good
            if (movement > 0) {
                score += movement * 8;
                // Extra value if it could catch player
                if (movement >= distance) {
                    score += 50;
                }
            } else if (movement < 0) {
                // Backward movement is usually bad
                score += movement * 5;
            }
            
            // Special card considerations
            if (card.type === 'DOUBLE_AGENT') {
                // 2nd copy is amazing (+6), others are bad (-1)
                if (aiCount === 1) score += 40; // Would get the +6
                else score -= 10;
            }
            if (card.type === 'SENTINEL') {
                // 3rd+ copy gives +6
                if (aiCount >= 2) score += 30;
            }
        }
        
        return score;
    }

    getExpectedMovement(card, count) {
        const index = Math.min(Math.max(count - 1, 0), 2);
        const val = card.movement[index];
        if (val === 'WIN' || val === 'LOSE') return 0;
        return val;
    }

    // AI plays its turn
    playTurn() {
        const hand = this.game.aiHand;
        if (hand.length < 2) return null;
        
        // Group cards by type
        const cardsByType = {};
        hand.forEach(card => {
            if (!cardsByType[card.type]) {
                cardsByType[card.type] = [];
            }
            cardsByType[card.type].push(card);
        });
        
        const types = Object.keys(cardsByType);
        if (types.length < 2) return null; // Can't play
        
        // Evaluate all possible pairs
        let bestPair = null;
        let bestScore = -Infinity;
        
        for (let i = 0; i < types.length; i++) {
            for (let j = i + 1; j < types.length; j++) {
                const card1 = cardsByType[types[i]][0];
                const card2 = cardsByType[types[j]][0];
                const score = this.evaluatePair(card1, card2);
                if (score > bestScore) {
                    bestScore = score;
                    bestPair = [card1, card2];
                }
            }
        }
        
        if (!bestPair) return null;
        
        // Decide which to show face-up
        // Strategy: Usually hide the card we want, but bluff sometimes
        const [card1, card2] = bestPair;
        const val1 = this.evaluateCardForPlayer(card1);
        const val2 = this.evaluateCardForPlayer(card2);
        
        let faceUpCard, faceDownCard;
        
        // Bluff ~25% of the time
        const bluffing = Math.random() < 0.25;
        
        if (bluffing) {
            // Show the card that's BETTER for player (reverse psychology)
            if (val1 > val2) {
                faceUpCard = card1;
                faceDownCard = card2;
            } else {
                faceUpCard = card2;
                faceDownCard = card1;
            }
        } else {
            // Normal: hide the better card for player, tempt with worse
            if (val1 > val2) {
                faceUpCard = card2;
                faceDownCard = card1;
            } else {
                faceUpCard = card1;
                faceDownCard = card2;
            }
        }
        
        return { faceUpCard, faceDownCard };
    }

    evaluatePair(card1, card2) {
        // Score based on what AI wants to keep vs give away
        const keep1 = this.evaluateCardForAI(card1, this.game.aiRecruited, this.game.playerRecruited);
        const keep2 = this.evaluateCardForAI(card2, this.game.aiRecruited, this.game.playerRecruited);
        const give1 = this.evaluateCardForPlayer(card1);
        const give2 = this.evaluateCardForPlayer(card2);
        
        // Best case: we keep high-value card, give low-value to player
        // Either card could end up with either player
        const scenario1 = keep1 - give2; // We keep card1, give card2
        const scenario2 = keep2 - give1; // We keep card2, give card1
        
        return Math.max(scenario1, scenario2);
    }

    evaluateCardForPlayer(card) {
        const playerCollection = this.game.playerRecruited;
        const playerCount = countCardType(playerCollection, card.type);
        
        // How good is this card for the player?
        if (card.type === 'CODEBREAKER') {
            if (playerCount === 2) return 200; // Player would win
            return 30 + playerCount * 15;
        }
        if (card.type === 'DAREDEVIL') {
            if (playerCount === 2) return -200; // Player would lose
            return this.getExpectedMovement(card, playerCount + 1) * 3 - 15;
        }
        
        const movement = this.getExpectedMovement(card, playerCount + 1);
        let score = movement * 6;
        
        // Double Agent 2nd copy is great
        if (card.type === 'DOUBLE_AGENT' && playerCount === 1) {
            score += 35;
        }
        // Sentinel 3rd+ is powerful
        if (card.type === 'SENTINEL' && playerCount >= 2) {
            score += 25;
        }
        
        return score;
    }
}
