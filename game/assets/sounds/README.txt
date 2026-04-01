Block Blitz Sound Effects
=========================

Add the following .mp3 files to this directory, then uncomment the
corresponding require() lines in src/hooks/useSound.ts:

  place.mp3      - Short soft "click" when a piece is placed on the board
  clear.mp3      - Satisfying "swoosh" when a line is cleared
  combo.mp3      - Exciting ascending chime for combo clears (2x+)
  game-over.mp3  - Low descending tone for game over
  level-win.mp3  - Triumphant fanfare for completing a level
  button.mp3     - Subtle UI tap sound
  select.mp3     - Light click for selecting a piece

Recommended sources for royalty-free game sounds:
  - freesound.org (Creative Commons)
  - kenney.nl/assets (CC0, free)
  - mixkit.co/free-sound-effects/game/

Keep files short (< 2 seconds each) and small (< 100KB each) for
fast loading on mobile.
