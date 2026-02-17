# Chase On 🕵️

A browser-based spy chase card game inspired by Agent Avenue by Nerdlab Games. Play as a spy trying to catch the AI opponent on a rectangular track!

## 🎮 Play Online

**👉 [https://nineunderground.github.io/chase-on/](https://nineunderground.github.io/chase-on/)**

Or run locally:

```bash
python -m http.server 8000
# Open http://localhost:8000
```

## How to Play

### Objective
- **Catch** the AI spy by landing on or passing their position
- **OR** collect 3 Codebreaker cards to win instantly
- **Avoid** collecting 3 Daredevil cards (instant loss!)

### Turn Structure
1. **Play**: Select 2 cards with different names from your hand
2. **Choose**: Pick which card to play face-up (other is face-down)
3. **Recruit**: AI picks one card, you get the other
4. **Move**: Both spies move based on recruited cards

### Movement Rules
- Cards show 3 movement values
- Which value you use depends on how many copies you've collected:
  - 1st copy → 1st value
  - 2nd copy → 2nd value  
  - 3rd+ copy → 3rd value
- **Positive** = move toward opponent
- **Negative** = move backward

### The Cards (38 total)

| Card | Count | Movement | Special |
|------|-------|----------|---------|
| Double Agent | 6 | -1 / 6 / -1 | 2nd copy is powerful! |
| Enforcer | 6 | 1 / 2 / 3 | Steady progress |
| Codebreaker | 6 | 0 / 0 / WIN | 3 cards = instant win |
| Saboteur | 6 | -1 / -1 / -2 | Always backward |
| Daredevil | 6 | 2 / 3 / LOSE | Fast but 3 = loss |
| Sentinel | 6 | 0 / 2 / 6 | Powerful at 3+ |
| Sidekick | 1 | 4 | Always 4 |
| Mole | 1 | -3 | Always -3 |

### Board
- Rectangular track with 14 positions
- 🦖 Green (AI) starts at position 1
- 🦁 Blue (You) starts at position 8
- Board wraps around (position 14 → position 1)

## Credits

- Original game: **Agent Avenue** by Nerdlab Games
- Digital implementation for personal/educational use

## License

This is a fan-made digital implementation. The original Agent Avenue card game is © Nerdlab Games. Support the creators by purchasing the physical game!
