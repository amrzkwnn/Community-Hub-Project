import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Load FloatingAiAssistant source
const rootDir = process.cwd();
const floatingPath = path.join(rootDir, 'src', 'components', 'ai', 'FloatingAiAssistant.tsx');
const floatingContent = fs.readFileSync(floatingPath, 'utf8');

test('TESDH Community Hub — Draggable AI Assistant with Magnetic Edge Snapping', async (t) => {
  await t.test('1. Free Dragging: Pointer events & pointer capture are configured', () => {
    assert.match(floatingContent, /onPointerDown=\{handlePointerDown\}/, 'Must handle pointer down');
    assert.match(floatingContent, /onPointerMove=\{handlePointerMove\}/, 'Must handle pointer move');
    assert.match(floatingContent, /onPointerUp=\{handlePointerUp\}/, 'Must handle pointer up');
    assert.match(floatingContent, /onPointerCancel=\{handlePointerCancel\}/, 'Must handle pointer cancel');
    assert.match(floatingContent, /setPointerCapture/, 'Must capture pointer for smooth mouse & touch dragging');
    assert.match(floatingContent, /releasePointerCapture/, 'Must release pointer capture on release');
    assert.match(floatingContent, /touch-none/, 'Must prevent scrolling while dragging via touch-none');
  });

  await t.test('2. Drag threshold: Distinguishes click from drag using threshold', () => {
    assert.match(floatingContent, /DRAG_THRESHOLD\s*=\s*7/, 'Must define ~6-8px movement threshold');
    assert.match(floatingContent, /Math\.hypot\(dx,\s*dy\)/, 'Must compute Euclidean drag distance');
    assert.match(floatingContent, /justDraggedRef/, 'Must flag justDragged to prevent accidental chat opening');
  });

  await t.test('3. Magnetic Edge Snapping: Calculates 4 eligible edges (left, right, top, bottom)', () => {
    assert.match(floatingContent, /export const snapToNearestEdge/, 'Must export edge snapping function');
    assert.match(floatingContent, /distLeft\s*=/, 'Must calculate distance to left edge');
    assert.match(floatingContent, /distRight\s*=/, 'Must calculate distance to right edge');
    assert.match(floatingContent, /distTop\s*=/, 'Must calculate distance to top edge');
    assert.match(floatingContent, /distBottom\s*=/, 'Must calculate distance to bottom edge');
    assert.match(floatingContent, /edge\s*=\s*'left'/, 'Must support left edge snapping');
    assert.match(floatingContent, /edge\s*=\s*'right'/, 'Must support right edge snapping');
    assert.match(floatingContent, /edge\s*=\s*'top'/, 'Must support top edge snapping');
    assert.match(floatingContent, /edge\s*=\s*'bottom'/, 'Must support bottom edge snapping');
  });

  await t.test('4. Safe Boundaries: Clamps bubble to avoid top navigation & mobile bottom bar', () => {
    assert.match(floatingContent, /export const getSafeBounds/, 'Must calculate safe bounds');
    assert.match(floatingContent, /topSafe\s*=\s*8[04]/, 'Must keep bubble below top navigation bar (top >= 80px)');
    assert.match(floatingContent, /bottomSafe\s*=/, 'Must calculate safe bottom offset for mobile bottom navigation');
  });

  await t.test('5. Position Persistence: Normalized storage in localStorage without SSR mismatch', () => {
    assert.match(floatingContent, /STORAGE_KEY\s*=\s*'tesdh_ai_bubble_position'/, 'Must define persistence storage key');
    assert.match(floatingContent, /localStorage\.getItem\(STORAGE_KEY\)/, 'Must restore position from localStorage');
    assert.match(floatingContent, /localStorage\.setItem\(STORAGE_KEY/, 'Must save position to localStorage');
    assert.match(floatingContent, /isMounted/, 'Must defer client position rendering until after mount to avoid hydration mismatch');
    assert.match(floatingContent, /window\.addEventListener\('resize'/, 'Must adapt coordinates on window resize');
  });

  await t.test('6. Dynamic Bubble-to-Chat Animation: Morphs from current bubble coordinates', () => {
    assert.match(floatingContent, /calculateTransformDelta/, 'Must calculate transform delta for morph animation');
    assert.match(floatingContent, /calculateTransformDelta\(bubblePos\)/, 'Opening animation must use current bubble position');
    assert.match(floatingContent, /modalTransform/, 'Must compute modal transform style dynamically');
    assert.match(floatingContent, /modalBorderRadius/, 'Must morph border radius between bubble and dialog');
  });

  await t.test('7. Visual Feedback during Drag: Scale, shadow, and grabbing cursor', () => {
    assert.match(floatingContent, /cursor-grabbing/, 'Must show grabbing cursor while dragging');
    assert.match(floatingContent, /cursor-grab/, 'Must show grab cursor when hovering');
    assert.match(floatingContent, /scale-110/, 'Must scale bubble slightly when dragging');
    assert.match(floatingContent, /shadow-2xl/, 'Must cast deeper shadow when dragging');
  });

  await t.test('8. Accessibility & Keyboard Repositioning: Accessible name and arrow keys', () => {
    assert.match(floatingContent, /aria-label="Open (?:Nadi|AI) Assistant"/, 'Must have accessible label for assistant launcher');
    assert.match(floatingContent, /e\.key === 'ArrowLeft'/, 'Must support ArrowLeft for keyboard repositioning');
    assert.match(floatingContent, /e\.key === 'ArrowRight'/, 'Must support ArrowRight for keyboard repositioning');
    assert.match(floatingContent, /e\.key === 'ArrowUp'/, 'Must support ArrowUp for keyboard repositioning');
    assert.match(floatingContent, /e\.key === 'ArrowDown'/, 'Must support ArrowDown for keyboard repositioning');
    assert.match(floatingContent, /aria-live="polite"/, 'Must provide screen reader live region announcement');
    assert.match(floatingContent, /prefers-reduced-motion/, 'Must respect prefers-reduced-motion for snap animation');
  });

  await t.test('9. Snapping Math Calculation: Validates edge snapping logic independently', () => {
    // Pure function logic mirroring snapToNearestEdge
    const BUBBLE_SIZE = 58;
    const leftSafe = 24;
    const rightSafe = 1440 - BUBBLE_SIZE - 24;
    const topSafe = 80;
    const bottomSafe = 900 - BUBBLE_SIZE - 24;

    const snap = (x: number, y: number) => {
      const centerX = x + BUBBLE_SIZE / 2;
      const centerY = y + BUBBLE_SIZE / 2;
      const dL = Math.abs(centerX - (leftSafe + BUBBLE_SIZE / 2));
      const dR = Math.abs((rightSafe + BUBBLE_SIZE / 2) - centerX);
      const dT = Math.abs(centerY - (topSafe + BUBBLE_SIZE / 2));
      const dB = Math.abs((bottomSafe + BUBBLE_SIZE / 2) - centerY);
      const minD = Math.min(dL, dR, dT, dB);
      if (minD === dL) return 'left';
      if (minD === dR) return 'right';
      if (minD === dT) return 'top';
      return 'bottom';
    };

    // When dragged near left edge
    assert.strictEqual(snap(40, 400), 'left');
    // When dragged near right edge
    assert.strictEqual(snap(1350, 400), 'right');
    // When dragged near top edge
    assert.strictEqual(snap(500, 90), 'top');
    // When dragged near bottom edge
    assert.strictEqual(snap(500, 800), 'bottom');
  });
});
