"""
Simulate the JS cube for a U move and verify kociemba gives correct solution.

The JS face map for reading cube string (_readCubeString):
U: [(-1,1,-1),(0,1,-1),(1,1,-1),(-1,1,0),(0,1,0),(1,1,0),(-1,1,1),(0,1,1),(1,1,1)]
R: [(1,1,1),(1,1,0),(1,1,-1),(1,0,1),(1,0,0),(1,0,-1),(1,-1,1),(1,-1,0),(1,-1,-1)]
F: [(-1,1,1),(0,1,1),(1,1,1),(-1,0,1),(0,0,1),(1,0,1),(-1,-1,1),(0,-1,1),(1,-1,1)]
D: [(-1,-1,1),(0,-1,1),(1,-1,1),(-1,-1,0),(0,-1,0),(1,-1,0),(-1,-1,-1),(0,-1,-1),(1,-1,-1)]
L: [(-1,1,-1),(-1,1,0),(-1,1,1),(-1,0,-1),(-1,0,0),(-1,0,1),(-1,-1,-1),(-1,-1,0),(-1,-1,1)]
B: [(1,1,-1),(0,1,-1),(-1,1,-1),(1,0,-1),(0,0,-1),(-1,0,-1),(1,-1,-1),(0,-1,-1),(-1,-1,-1)]

The JS _animateLayer for U face:
- axis = (0,1,0), negated = (0,-1,0), angle = PI/2
- Rotation matrix around (0,-1,0) by PI/2 (right-hand rule):
  R = I*0 + n⊗n*1 + [n]×*1
  n = (0,-1,0), n⊗n = [[0,0,0],[0,1,0],[0,0,0]]
  [n]× = [[0, 0, -1], [0, 0, 0], [1, 0, 0]]  (for n=(0,-1,0))
  
  Wait: cross product matrix [n]× for n=(nx,ny,nz):
  [[0, -nz, ny],
   [nz,  0, -nx],
   [-ny, nx,  0]]
  For n=(0,-1,0): [[0, 0, -1], [0, 0, 0], [1, 0, 0]]
  
  R = [[0,0,0],[0,1,0],[0,0,0]] + [[0,0,-1],[0,0,0],[1,0,0]]
    = [[0,0,-1],[0,1,0],[1,0,0]]
  
  So (x,y,z) -> (0*x+0*y-1*z, y, x) = (-z, y, x)

So a cubie at (x,y,z) on the U layer (y=1) moves to (-z, 1, x).

Let's trace:
- URF (1,1,1) -> (-1, 1, 1) = UFL
- UBR (1,1,-1) -> (1, 1, 1) = URF
- ULB (-1,1,-1) -> (1, 1, -1) = UBR  -- wait (-(-1),1,-1) = (1,1,-1)
  Hmm: (-z, y, x) for (-1,1,-1): z=-1, so -z=1; x=-1. Result: (1, 1, -1) = UBR ✓
- UFL (-1,1,1) -> (-1, 1, -1) = ULB

Cycle: URF->UFL->ULB->UBR->URF (in position mapping: UBR goes to URF pos means UBR->URF)

Wait, let me be careful about "goes to" vs "what was there":
Cubie at URF(1,1,1) moves to position (-1,1,1) = UFL. So after U move:
- UFL position has what was at URF
- ULB position has what was at UFL
- UBR position has what was at ULB
- URF position has what was at UBR

This is the same as kociemba's cpU! So JS U move = kociemba U move (same direction).

Now let's verify edges. UF edge at (0,1,1) moves to (-1,1,0) = UL position.
UR edge at (1,1,0) moves to (0,1,1) = UF position.
UB edge at (0,1,-1) moves to (1,1,0) = UR position.
UL edge at (-1,1,0) moves to (0,1,-1) = UB position.
Cycle: UB->UR->UF->UL->UB ✓ same as kociemba.

So JS U move and kociemba U move are the SAME direction. This means the cube string sent
to kociemba should correctly represent the scrambled state, and the solution returned should
be directly applicable.

Let me verify end-to-end with a specific example.
Scenario: Start with solved cube. Apply JS U move (CW from top in animation).
After JS U move, what does _readCubeString return?

The JS reads sticker colors by looking up each cubie at a physical position.
After a U move, the cubies have moved:
- Position URF now has the cubie that was at UBR (UBR->URF based on our calculation above)
- Position UFL now has the cubie that was at URF
- etc.

For a SOLVED cube, every cubie at position X has color X on each face.
After U (JS), reading the cube string:

U face (y=1 layer), U stickers all stay U (U stickers move with cubies but the U-face sticker 
of any U-layer cubie stays U-colored in a solved cube). ✓

R face: position (1,_,_). R1=(1,1,1)=URF position, which now has UBR cubie.
UBR cubie's R-face sticker = B (in solved cube UBR has R sticker facing R, B sticker facing B, U sticker facing U).
Wait NO. In a solved cube, the UBR cubie has colors: U on U-face, R on... 

Hmm, let me think about this differently. In a solved cube, EVERY sticker has its home color.
The UBR cubie's stickers are: U-face sticker=U, R-face sticker=R, B-face sticker=B.

After JS U move, UBR cubie moves to URF position. At URF position, the stickers face:
- U (upward) -> U sticker of UBR cubie = U ✓
- R (rightward) -> but the UBR cubie has rotated! Its R-face sticker now faces F direction.
  Actually the cubie physically rotates. Let's compute:
  The cubie at UBR(1,1,-1) moves to URF(1,1,1) via rotation (-z,y,x).
  The cubie's local axes also rotate. A sticker facing (0,0,-1) (B direction) on the UBR cubie
  was pointing in direction (0,0,-1). After rotation: new direction = (-(-1), 0... 
  
  The rotation matrix R = [[0,0,-1],[0,1,0],[1,0,0]] transforms vectors.
  B direction (0,0,-1) -> R*(0,0,-1) = (0*0+0*0+(-1)*(-1), 0, 1*0+0*0+0*(-1)) = (1, 0, 0) = R direction!
  R direction (1,0,0) -> R*(1,0,0) = (0, 0, 1) = F direction!
  F direction (0,0,1) -> R*(0,0,1) = (-1, 0, 0) = L direction!... wait that seems wrong.
  
  Hmm no. The UBR cubie doesn't have an F sticker. Let me re-examine:
  UBR cubie has stickers: U-face, R-face, B-face.
  After U move (rotation R = [[0,0,-1],[0,1,0],[1,0,0]]):
  - U-sticker direction (0,1,0) -> R*(0,1,0) = (0,1,0) = U ✓
  - R-sticker direction (1,0,0) -> R*(1,0,0) = (0,0,1) = F direction!
  - B-sticker direction (0,0,-1) -> R*(0,0,-1) = (1,0,0) = R direction!
  
  So at URF position: the sticker facing R direction is what was the B sticker of UBR = B color!
  And the sticker facing F direction is what was the R sticker of UBR = R color.

This matches kociemba's result! After U move, R face top-right (R3 = position (1,1,-1)=UBR pos)
gets the U sticker of ULB (which moved from ULB to UBR). ULB's U-sticker = U.

Actually let me just read R1 (position (1,1,1)=URF pos after U move):
R1 = the R-face sticker at URF position = the cubie there (UBR) rotated so its B-face sticker faces R = B!

kociemba's result after U: R1=B ✓

Now let's compute the full string JS would read after a U move:
"""
import kociemba

# The pykociemba U move (moveCube[0]) IS the same as JS U move.
# So we can use it directly to generate the after-U cube string.
from kociemba.pykociemba.facecube import FaceCube
from kociemba.pykociemba.cubiecube import CubieCube, moveCube

SOLVED = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'

fc = FaceCube(SOLVED)
cc = fc.toCubieCube()
cc.multiply(moveCube[0])  # Apply kociemba U (= JS U move)
after_U = cc.toFaceCube().to_String()

print(f"After U move: {after_U}")
# This is what JS would send to kociemba after user applies a U scramble

sol = kociemba.solve(after_U)
print(f"Solution: {sol}")
print(f"Expected: U' (to undo a U move)")
print(f"Match: {'U' + chr(39) in sol and len(sol.strip().split()) == 1}")
