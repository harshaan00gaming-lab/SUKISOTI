import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampLane,
  getLaneX,
  createInitialPhysicsState,
  calculateRunSpeed,
  triggerJump,
  triggerSlide,
  updateJumpAndSlide,
  checkObstacleCollision,
  updateChallengeProgress,
} from './rules';
import { DailyChallenge } from '../types/game';

test('lane clamping and coordinates', () => {
  assert.equal(clampLane(-2), -1);
  assert.equal(clampLane(0), 0);
  assert.equal(clampLane(2), 1);
  assert.equal(getLaneX(-1), -2.8);
  assert.equal(getLaneX(0), 0);
  assert.equal(getLaneX(1), 2.8);
});

test('run speed scales with distance and jetpack', () => {
  const baseSpeed = calculateRunSpeed(0, false);
  assert.equal(baseSpeed, 14);

  const midSpeed = calculateRunSpeed(1000, false);
  assert.ok(midSpeed > baseSpeed, 'speed should increase over distance');

  const jetpackSpeed = calculateRunSpeed(50, true);
  assert.equal(jetpackSpeed, 36);
});

test('jump physics lifecycle', () => {
  const state = createInitialPhysicsState();
  assert.equal(state.isGrounded, true);

  const jumped = triggerJump(state, false, 0);
  assert.equal(jumped, true);
  assert.equal(state.isJumping, true);
  assert.equal(state.isGrounded, false);
  assert.ok(state.vy > 0);

  // Advance physics simulation
  updateJumpAndSlide(state, 0.1);
  assert.ok(state.y > 0, 'player should ascend');

  // Let player fall back down
  for (let i = 0; i < 20; i++) {
    updateJumpAndSlide(state, 0.1);
  }
  assert.equal(state.isGrounded, true);
  assert.equal(state.y, 0);
});

test('slide crouches player and fast-falls', () => {
  const state = createInitialPhysicsState();
  state.y = 2.0;
  state.isGrounded = false;
  state.vy = 5;

  triggerSlide(state);
  assert.equal(state.isSliding, true);
  assert.ok(state.vy < 0, 'slide in midair should trigger fast-fall');
});

test('high barrier collision passes when sliding and hits when standing', () => {
  const state = createInitialPhysicsState();
  state.x = 0;
  state.y = 0;

  const barrier = {
    type: 'high_barrier' as const,
    lane: 0,
    z: 0,
    y: 0.9,
    width: 2.5,
    height: 1.5,
    depth: 0.5,
  };

  // Standing player hits high barrier
  const standingResult = checkObstacleCollision(state, barrier);
  assert.equal(standingResult.hit, true);

  // Sliding player clears high barrier!
  state.isSliding = true;
  state.slideTimer = 0.5;
  const slidingResult = checkObstacleCollision(state, barrier);
  assert.equal(slidingResult.hit, false, 'sliding player should pass under high barrier');
});

test('low hurdle collision hits on ground and passes when jumping', () => {
  const state = createInitialPhysicsState();
  state.x = 0;
  state.y = 0;

  const hurdle = {
    type: 'hurdle' as const,
    lane: 0,
    z: 0,
    y: 0,
    width: 2.2,
    height: 1.0,
    depth: 0.4,
  };

  // Ground collision hits
  const groundResult = checkObstacleCollision(state, hurdle);
  assert.equal(groundResult.hit, true);

  // Jumping player clears hurdle
  state.y = 1.4;
  const jumpResult = checkObstacleCollision(state, hurdle);
  assert.equal(jumpResult.hit, false, 'jumping player should clear low hurdle');
});

test('train roof landing', () => {
  const state = createInitialPhysicsState();
  state.x = 0;
  state.y = 2.8;
  state.vy = -1;

  const train = {
    type: 'train' as const,
    lane: 0,
    z: 0,
    y: 0,
    width: 2.4,
    height: 2.6,
    depth: 12.0,
  };

  const result = checkObstacleCollision(state, train);
  assert.equal(result.hit, false);
  assert.equal(result.landedOnTop, true);
});

test('daily challenge progress tracking', () => {
  const challenge: DailyChallenge = {
    id: 'test-1',
    title: 'Collect Coins',
    description: 'Collect 100 coins',
    type: 'coins',
    target: 100,
    current: 80,
    rewardCoins: 250,
    completed: false,
    claimed: false,
  };

  const didComplete = updateChallengeProgress(challenge, { type: 'coin', amount: 25 });
  assert.equal(didComplete, true);
  assert.equal(challenge.completed, true);
  assert.equal(challenge.current, 100);
});
