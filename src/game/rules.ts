import { CharacterId, DailyChallenge, ObstacleType } from '../types/game';

export const LANE_WIDTH = 2.8;
export const LANE_COORDS: [number, number, number] = [-LANE_WIDTH, 0, LANE_WIDTH];

export const BASE_RUN_SPEED = 14; // meters per second
export const MAX_RUN_SPEED = 32;

export const GRAVITY = -34;
export const BASE_JUMP_VELOCITY = 13.5;
export const SUPER_JUMP_VELOCITY = 19.5;
export const SLIDE_DURATION = 0.75; // seconds
export const COYOTE_TIME_MAX = 0.12;

export interface PlayerPhysicsState {
  lane: number;           // -1, 0, 1
  targetLane: number;     // -1, 0, 1
  x: number;
  y: number;
  vy: number;
  isGrounded: boolean;
  isOnTrain: boolean;
  trainHeight: number;
  isJumping: boolean;
  isSliding: boolean;
  slideTimer: number;
  coyoteTimer: number;
}

export function createInitialPhysicsState(): PlayerPhysicsState {
  return {
    lane: 0,
    targetLane: 0,
    x: 0,
    y: 0,
    vy: 0,
    isGrounded: true,
    isOnTrain: false,
    trainHeight: 0,
    isJumping: false,
    isSliding: false,
    slideTimer: 0,
    coyoteTimer: 0,
  };
}

export function clampLane(lane: number): number {
  if (lane < -1) return -1;
  if (lane > 1) return 1;
  return Math.round(lane);
}

export function getLaneX(lane: number): number {
  const index = clampLane(lane) + 1; // 0, 1, 2
  return LANE_COORDS[index];
}

export function calculateRunSpeed(distance: number, hasJetpack: boolean): number {
  if (hasJetpack) {
    return 36; // Turbo jetpack speed
  }
  // Smooth logarithmic/power ramp
  const speed = BASE_RUN_SPEED + Math.pow(Math.max(0, distance) / 300, 0.55) * 2.8;
  return Math.min(MAX_RUN_SPEED, speed);
}

export function updateJumpAndSlide(
  state: PlayerPhysicsState,
  dt: number,
  options?: { superSneakers?: boolean }
): void {
  // Update sliding
  if (state.isSliding) {
    state.slideTimer -= dt;
    if (state.slideTimer <= 0) {
      state.isSliding = false;
      state.slideTimer = 0;
    }
  }

  // Target ground level (0 if on ground, trainHeight if on train)
  const groundY = state.isOnTrain ? state.trainHeight : 0;

  // Apply gravity if in air
  if (!state.isGrounded || state.y > groundY) {
    state.vy += GRAVITY * dt;
    state.y += state.vy * dt;

    if (state.y <= groundY) {
      state.y = groundY;
      state.vy = 0;
      state.isGrounded = true;
      state.isJumping = false;
    } else {
      state.isGrounded = false;
    }
  } else {
    state.y = groundY;
    state.vy = 0;
    state.isGrounded = true;
  }
}

export function triggerJump(
  state: PlayerPhysicsState,
  hasSuperSneakers: boolean = false,
  jumpStatBonus: number = 0
): boolean {
  if (state.isGrounded || state.coyoteTimer > 0) {
    const baseV = hasSuperSneakers ? SUPER_JUMP_VELOCITY : BASE_JUMP_VELOCITY;
    const bonus = jumpStatBonus * 0.5; // up to +2.5m/s jump power
    state.vy = baseV + bonus;
    state.isGrounded = false;
    state.isJumping = true;
    state.isSliding = false; // jump cancels slide
    state.slideTimer = 0;
    state.coyoteTimer = 0;
    return true;
  }
  return false;
}

export function triggerSlide(state: PlayerPhysicsState): boolean {
  // If in air, fast-fall to ground immediately (classic Subway Surfers mechanic!)
  if (!state.isGrounded) {
    state.vy = -28; // fast slam downward
  }
  state.isSliding = true;
  state.slideTimer = SLIDE_DURATION;
  return true;
}

export function getPlayerHitbox(state: PlayerPhysicsState) {
  // Standard runner height is ~1.8m, width ~0.8m
  const isCrouched = state.isSliding;
  const height = isCrouched ? 0.75 : 1.8;
  const halfWidth = 0.42;
  const halfDepth = 0.35;

  return {
    minX: state.x - halfWidth,
    maxX: state.x + halfWidth,
    minY: state.y,
    maxY: state.y + height,
    minZ: -halfDepth,
    maxZ: halfDepth,
  };
}

export interface CollisionResult {
  hit: boolean;
  type: ObstacleType | 'none';
  landedOnTop?: boolean;
}

export function checkObstacleCollision(
  player: PlayerPhysicsState,
  obstacle: {
    type: ObstacleType;
    lane: number;
    z: number;
    y: number;
    width: number;
    height: number;
    depth: number;
  }
): CollisionResult {
  const obsX = getLaneX(obstacle.lane);
  const halfObsW = obstacle.width / 2;
  const halfObsD = obstacle.depth / 2;

  const obsMinX = obsX - halfObsW;
  const obsMaxX = obsX + halfObsW;
  const obsMinZ = obstacle.z - halfObsD;
  const obsMaxZ = obstacle.z + halfObsD;
  const obsMinY = obstacle.y;
  const obsMaxY = obstacle.y + obstacle.height;

  const pBox = getPlayerHitbox(player);

  // Check X overlap
  const overlapX = pBox.minX <= obsMaxX && pBox.maxX >= obsMinX;
  if (!overlapX) return { hit: false, type: 'none' };

  // Check Z overlap
  const overlapZ = pBox.minZ <= obsMaxZ && pBox.maxZ >= obsMinZ;
  if (!overlapZ) return { hit: false, type: 'none' };

  // Special case: Train (can be landed on top of!)
  if (obstacle.type === 'train') {
    // If player's feet are near or above train roof and falling/level
    if (player.y >= obsMaxY - 0.4 && player.vy <= 1) {
      return { hit: false, type: 'none', landedOnTop: true };
    }
    // Otherwise it's a collision with the train front/side
    return { hit: true, type: 'train' };
  }

  // Special case: High barrier (open clearance underneath for sliding)
  if (obstacle.type === 'high_barrier') {
    const clearanceHeight = 0.95; // height under the hanging clearance bar
    // If player is sliding, player maxY is ~0.75 <= 0.95, so passes under safely!
    if (player.isSliding && pBox.maxY <= clearanceHeight) {
      return { hit: false, type: 'none' };
    }
    // Standing player hits the barrier!
    return { hit: true, type: 'high_barrier' };
  }

  // Special case: Low hurdle (can be jumped over)
  if (obstacle.type === 'hurdle') {
    const hurdleHeight = 1.05;
    // If player is in air and feet are above the hurdle, clear!
    if (player.y > hurdleHeight) {
      return { hit: false, type: 'none' };
    }
    return { hit: true, type: 'hurdle' };
  }

  // Solid barrier block
  if (obstacle.type === 'barrier_block') {
    if (player.y > obsMaxY) {
      return { hit: false, type: 'none' };
    }
    return { hit: true, type: 'barrier_block' };
  }

  return { hit: false, type: 'none' };
}

export function updateChallengeProgress(
  challenge: DailyChallenge,
  event: {
    type: 'coin' | 'distance' | 'jump' | 'slide' | 'score' | 'run_end';
    amount?: number;
    characterId?: CharacterId;
  }
): boolean {
  if (challenge.completed) return false;

  if (challenge.characterRequired && challenge.characterRequired !== event.characterId) {
    return false;
  }

  let increment = 0;
  if (challenge.type === 'coins' && event.type === 'coin') {
    increment = event.amount ?? 1;
  } else if (challenge.type === 'distance' && event.type === 'distance') {
    increment = event.amount ?? 0;
  } else if (challenge.type === 'jumps' && event.type === 'jump') {
    increment = 1;
  } else if (challenge.type === 'slides' && event.type === 'slide') {
    increment = 1;
  } else if (challenge.type === 'score' && event.type === 'score') {
    if ((event.amount ?? 0) >= challenge.target) {
      challenge.current = challenge.target;
      challenge.completed = true;
      return true;
    }
  } else if (challenge.type === 'character_run' && event.type === 'run_end') {
    increment = 1;
  }

  if (increment > 0) {
    challenge.current = Math.min(challenge.target, challenge.current + increment);
    if (challenge.current >= challenge.target) {
      challenge.completed = true;
      return true;
    }
  }

  return false;
}
