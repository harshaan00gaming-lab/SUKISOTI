import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ActivePowerup,
  CharacterId,
  CharacterInfo,
  CoinInstance,
  GameState,
  ObstacleInstance,
  ObstacleType,
  PowerupInstance,
  PowerupType,
  RunSummary,
} from '../types/game';
import {
  BASE_RUN_SPEED,
  calculateRunSpeed,
  checkObstacleCollision,
  clampLane,
  createInitialPhysicsState,
  getLaneX,
  LANE_COORDS,
  PlayerPhysicsState,
  triggerJump,
  triggerSlide,
  updateJumpAndSlide,
} from './rules';
import {
  CharacterModelBundle,
  createCharacterModel,
  createCoinModel,
  createHighBarrierModel,
  createHurdleModel,
  createPowerupModel,
  createTrackSegment,
  createTrainModel,
} from './proceduralModels';
import { soundManager } from '../audio/synth';

export interface GameEngineCallbacks {
  onScoreUpdate: (score: number, distance: number, coins: number) => void;
  onPowerupUpdate: (activePowerups: ActivePowerup[]) => void;
  onGameOver: (summary: RunSummary) => void;
  onEvent: (type: 'jump' | 'slide' | 'coin' | 'distance' | 'score' | 'run_end', amount?: number) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: GameEngineCallbacks;
  
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  
  private frameId: number = 0;
  private lastTime: number = 0;
  private isDestroyed: boolean = false;

  // Game state
  public state: GameState = 'title';
  private playerPhysics: PlayerPhysicsState = createInitialPhysicsState();
  private characterInfo: CharacterInfo;
  private characterBundle: CharacterModelBundle;

  // Running metrics
  private distance: number = 0;
  private coinsCount: number = 0;
  private score: number = 0;
  private jumpsCount: number = 0;
  private slidesCount: number = 0;
  private activePowerups: Map<PowerupType, { remaining: number; total: number }> = new Map();
  private hasShield: boolean = false;
  private scoreMultiplier: number = 1;

  // Camera & Juice
  private cameraTrauma: number = 0;
  private hitstopTimer: number = 0;
  private baseFov: number = 65;

  // Track & Obstacle Pooling
  private trackSegments: THREE.Group[] = [];
  private readonly SEGMENT_LENGTH = 40;
  private readonly TRACK_COUNT = 4;
  private nextObstacleZ: number = -30;
  private obstacles: ObstacleInstance[] = [];
  private coins: CoinInstance[] = [];
  private powerups: PowerupInstance[] = [];

  // Scratch math objects (zero GC in render loop!)
  private _vec3 = new THREE.Vector3();

  // Input gesture tracking
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartTime: number = 0;

  constructor(container: HTMLElement, characterInfo: CharacterInfo, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.characterInfo = characterInfo;
    this.callbacks = callbacks;

    // 1. Detect software WebGL
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Setup Renderer
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. Setup Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x130e29);
    this.scene.fog = new THREE.FogExp2(0x130e29, 0.015);

    this.camera = new THREE.PerspectiveCamera(this.baseFov, width / height, 0.1, 150);
    this.camera.position.set(0, 3.5, 6);

    // 4. Studio Environment Lighting
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Warm Key Directional Light
    const keyLight = new THREE.DirectionalLight(0xffecd2, 1.8);
    keyLight.position.set(12, 22, 14);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      const d = 16;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
    }
    this.scene.add(keyLight);

    // Cool Hemisphere Fill Light
    const hemiLight = new THREE.HemisphereLight(0x7000ff, 0x141026, 0.9);
    this.scene.add(hemiLight);

    // 5. Build Procedural Track Segments
    for (let i = 0; i < this.TRACK_COUNT; i++) {
      const seg = createTrackSegment(this.SEGMENT_LENGTH);
      seg.position.z = -i * this.SEGMENT_LENGTH;
      this.trackSegments.push(seg);
      this.scene.add(seg);
    }

    // 6. Build Character Model
    const activeSkin = characterInfo.skins.find((s) => s.id === characterInfo.activeSkinId);
    this.characterBundle = createCharacterModel(characterInfo.id, activeSkin);
    this.scene.add(this.characterBundle.group);

    // 7. Bind Input Handlers
    this.bindInputs();

    // 8. Start Animation Loop
    this.lastTime = performance.now();
    this.tick();
  }

  public setCharacter(charInfo: CharacterInfo) {
    this.characterInfo = charInfo;
    this.scene.remove(this.characterBundle.group);

    const activeSkin = charInfo.skins.find((s) => s.id === charInfo.activeSkinId);
    this.characterBundle = createCharacterModel(charInfo.id, activeSkin);
    this.scene.add(this.characterBundle.group);

    // Apply specific character bonuses
    if (charInfo.id === 'jass') {
      this.hasShield = true; // Jass starts with free shield
    }
  }

  public setSkin(skinId: string) {
    const skin = this.characterInfo.skins.find((s) => s.id === skinId);
    if (skin) {
      this.characterInfo.activeSkinId = skinId;
      this.setCharacter(this.characterInfo);
    }
  }

  public startRun() {
    this.state = 'playing';
    document.body.dataset.state = 'playing';

    // Reset physics & stats
    this.playerPhysics = createInitialPhysicsState();
    this.distance = 0;
    this.coinsCount = 0;
    this.score = 0;
    this.jumpsCount = 0;
    this.slidesCount = 0;
    this.activePowerups.clear();
    this.hasShield = this.characterInfo.id === 'jass';
    this.scoreMultiplier = 1;
    this.nextObstacleZ = -25;

    // Clear existing obstacles and pickups
    this.clearObstaclesAndPickups();

    // Reset track segment positions
    for (let i = 0; i < this.trackSegments.length; i++) {
      this.trackSegments[i].position.z = -i * this.SEGMENT_LENGTH;
    }

    // Reset character position
    this.characterBundle.group.position.set(0, 0, 0);
    this.characterBundle.group.rotation.set(0, 0, 0);

    // Audio
    soundManager.startMusic();
  }

  public pauseRun() {
    if (this.state === 'playing') {
      this.state = 'paused';
      document.body.dataset.state = 'paused';
    }
  }

  public resumeRun() {
    if (this.state === 'paused') {
      this.state = 'playing';
      document.body.dataset.state = 'playing';
      this.lastTime = performance.now();
    }
  }

  public returnToTitle() {
    this.state = 'title';
    document.body.dataset.state = 'title';
    this.clearObstaclesAndPickups();
    this.characterBundle.group.position.set(0, 0, 0);
    this.characterBundle.group.rotation.set(0, 0, 0);
    this.camera.position.set(0, 2.2, 4.2);
    this.camera.lookAt(0, 1.2, 0);
  }

  private clearObstaclesAndPickups() {
    for (const obs of this.obstacles) {
      if (obs.mesh) this.scene.remove(obs.mesh);
    }
    this.obstacles = [];

    for (const c of this.coins) {
      if (c.mesh) this.scene.remove(c.mesh);
    }
    this.coins = [];

    for (const p of this.powerups) {
      if (p.mesh) this.scene.remove(p.mesh);
    }
    this.powerups = [];
  }

  // --- Input Handlers (Subway Surfers same-to-same gestures) ---
  private bindInputs() {
    // Touch Events
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.touchStartTime = performance.now();
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (e.changedTouches.length > 0) {
        const dx = e.changedTouches[0].clientX - this.touchStartX;
        const dy = e.changedTouches[0].clientY - this.touchStartY;
        const dt = performance.now() - this.touchStartTime;
        this.handleSwipe(dx, dy, dt);
      }
    }, { passive: true });

    // Mouse drag support for desktop testing
    let isMouseDown = false;
    let mouseStartX = 0;
    let mouseStartY = 0;
    let mouseStartTime = 0;

    window.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
      mouseStartTime = performance.now();
    });

    window.addEventListener('mouseup', (e) => {
      if (isMouseDown) {
        isMouseDown = false;
        const dx = e.clientX - mouseStartX;
        const dy = e.clientY - mouseStartY;
        const dt = performance.now() - mouseStartTime;
        this.handleSwipe(dx, dy, dt);
      }
    });

    // Keyboard support
    window.addEventListener('keydown', (e) => {
      if (this.state !== 'playing') {
        if ((e.code === 'Space' || e.code === 'Enter') && this.state === 'title') {
          this.startRun();
        }
        return;
      }

      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.moveLane(-1);
      } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.moveLane(1);
      } else if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.code === 'Space') {
        this.jump();
      } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this.slide();
      } else if (e.code === 'Escape' || e.key === 'p' || e.key === 'P') {
        this.pauseRun();
      }
    });

    window.addEventListener('resize', () => this.handleResize());
  }

  private handleSwipe(dx: number, dy: number, dt: number) {
    if (this.state !== 'playing') return;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const minDistance = 25; // minimum swipe distance

    if (absX < minDistance && absY < minDistance) return;

    if (absX > absY) {
      // Horizontal swipe
      if (dx > 0) {
        this.moveLane(1); // Swipe Right
      } else {
        this.moveLane(-1); // Swipe Left
      }
    } else {
      // Vertical swipe
      if (dy < 0) {
        this.jump(); // Swipe Up
      } else {
        this.slide(); // Swipe Down
      }
    }
  }

  private moveLane(direction: number) {
    const nextLane = clampLane(this.playerPhysics.targetLane + direction);
    if (nextLane !== this.playerPhysics.targetLane) {
      this.playerPhysics.targetLane = nextLane;
      soundManager.playLaneSwitch(direction);
    }
  }

  private jump() {
    const hasSneakers = this.activePowerups.has('sneakers');
    const jumped = triggerJump(this.playerPhysics, hasSneakers, this.characterInfo.stats.jump);
    if (jumped) {
      this.jumpsCount++;
      soundManager.playJump();
      this.callbacks.onEvent('jump');
    }
  }

  private slide() {
    triggerSlide(this.playerPhysics);
    this.slidesCount++;
    soundManager.playRoll();
    this.callbacks.onEvent('slide');
  }

  // --- Main 60fps Loop ---
  private tick = () => {
    if (this.isDestroyed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05); // clamp dt to prevent tunneling

    if (this.state === 'title') {
      this.renderTitle(now, dt);
    } else if (this.state === 'playing') {
      this.renderPlaying(now, dt);
    } else if (this.state === 'paused') {
      this.renderPaused();
    } else if (this.state === 'gameover') {
      this.renderGameOver(dt);
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 60);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  // --- Title Screen 3D Turntable Showcase ---
  private renderTitle(now: number, dt: number) {
    // Slowly rotate character on showcase turntable
    const t = now * 0.001;
    this.characterBundle.group.position.set(0, 0, 0);
    this.characterBundle.group.rotation.y = t * 0.8;
    this.characterBundle.updateAnimation(t, 2, false, false);

    // Orbiting showcase camera
    const camDist = 4.2;
    const camAngle = t * 0.2;
    this.camera.position.x = Math.sin(camAngle) * camDist * 0.6;
    this.camera.position.y = 2.0 + Math.sin(t * 0.5) * 0.2;
    this.camera.position.z = Math.cos(camAngle) * camDist;
    this.camera.lookAt(0, 1.2, 0);

    this.renderer.render(this.scene, this.camera);
  }

  // --- Playing State Simulation ---
  private renderPlaying(now: number, dt: number) {
    // Hitstop freeze handling
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const hasJetpack = this.activePowerups.has('jetpack');
    const hasSneakers = this.activePowerups.has('sneakers');
    const hasMagnet = this.activePowerups.has('magnet');
    const hasMultiplier = this.activePowerups.has('multiplier');

    // Calculate dynamic speed based on distance
    const runSpeed = calculateRunSpeed(this.distance, hasJetpack);
    const forwardStep = runSpeed * dt;

    // Advance distance
    this.distance += forwardStep;
    this.callbacks.onEvent('distance', Math.floor(forwardStep));

    // Update powerup durations
    const expiredPowerups: PowerupType[] = [];
    this.activePowerups.forEach((data, type) => {
      data.remaining -= dt;
      if (data.remaining <= 0) {
        expiredPowerups.push(type);
      }
    });
    for (const exp of expiredPowerups) {
      this.activePowerups.delete(exp);
      if (exp === 'jetpack' && this.characterBundle.jetpackMesh) {
        this.characterBundle.jetpackMesh.visible = false;
      }
    }

    // Sync active powerups to React HUD
    const hudPowerups: ActivePowerup[] = [];
    this.activePowerups.forEach((d, t) => {
      hudPowerups.push({ type: t, remainingTime: d.remaining, totalTime: d.total });
    });
    this.callbacks.onPowerupUpdate(hudPowerups);

    // Multiplier calculation
    this.scoreMultiplier = (hasMultiplier ? 2 : 1) * (this.characterInfo.stats.multiplier >= 4 ? 1.5 : 1);
    this.score += forwardStep * 1.5 * this.scoreMultiplier;

    // 1. Smooth Lane Transition (Interpolate X with Agility Stat)
    const targetX = getLaneX(this.playerPhysics.targetLane);
    const agilityRate = 14 + this.characterInfo.stats.agility * 2;
    this.playerPhysics.x += (targetX - this.playerPhysics.x) * Math.min(1, agilityRate * dt);
    this.playerPhysics.lane = this.playerPhysics.targetLane;

    // 2. Jump & Slide Physics
    updateJumpAndSlide(this.playerPhysics, dt);

    // 3. Update Character Mesh Transform & Animation
    this.characterBundle.group.position.x = this.playerPhysics.x;
    this.characterBundle.group.position.y = this.playerPhysics.y;
    this.characterBundle.group.position.z = 0;

    // Lateral banking tilt when switching lanes
    const dx = targetX - this.playerPhysics.x;
    this.characterBundle.group.rotation.z = -dx * 0.12;

    this.characterBundle.updateAnimation(
      now * 0.001,
      runSpeed,
      this.playerPhysics.isJumping,
      this.playerPhysics.isSliding
    );

    // 4. Move Track Segments backwards to simulate endless running
    for (const seg of this.trackSegments) {
      seg.position.z += forwardStep;
      if (seg.position.z > this.SEGMENT_LENGTH) {
        // Find furthest track segment and place behind it
        let minZ = 0;
        for (const s of this.trackSegments) {
          if (s.position.z < minZ) minZ = s.position.z;
        }
        seg.position.z = minZ - this.SEGMENT_LENGTH;
      }
    }

    // 5. Spawn Procedural Obstacles & Pickups
    this.spawnProceduralItems(forwardStep);

    // 6. Update and Check Obstacle Collisions
    let playerIsOnTrain = false;
    let trainHeight = 0;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      // Move obstacle towards player
      const trainSpeedBonus = obs.speedZ ? obs.speedZ * dt : 0;
      obs.z += forwardStep + trainSpeedBonus;

      if (obs.mesh) {
        obs.mesh.position.z = obs.z;
      }

      // Check collision if obstacle is near player (z between -3 and 3)
      if (Math.abs(obs.z) < 4.0) {
        const col = checkObstacleCollision(this.playerPhysics, obs);
        if (col.landedOnTop) {
          playerIsOnTrain = true;
          trainHeight = obs.height + 0.3;
        } else if (col.hit && !hasJetpack) {
          // If player has shield, consume shield and break obstacle
          if (this.hasShield) {
            this.hasShield = false;
            soundManager.playShieldBreak();
            this.cameraTrauma = 0.5;
            // Remove collided obstacle
            if (obs.mesh) this.scene.remove(obs.mesh);
            this.obstacles.splice(i, 1);
            continue;
          } else {
            // Game Over! Crash
            this.triggerCrash();
            return;
          }
        }
      }

      // Despawn passed obstacles
      if (obs.z > 15) {
        if (obs.mesh) this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }

    this.playerPhysics.isOnTrain = playerIsOnTrain;
    this.playerPhysics.trainHeight = trainHeight;

    // 7. Update Coins and Magnet Attraction
    const magnetRadius = hasMagnet ? 8.0 + this.characterInfo.stats.magnet * 1.5 : 1.2;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.z += forwardStep;

      // Magnet pull towards player
      const coinX = getLaneX(c.lane);
      const distToPlayer = Math.hypot(coinX - this.playerPhysics.x, c.z, c.y - this.playerPhysics.y);

      if (hasMagnet && distToPlayer < magnetRadius) {
        // Pull smoothly towards player
        c.lane += (this.playerPhysics.lane - c.lane) * Math.min(1, 10 * dt);
        c.z += (0 - c.z) * Math.min(1, 12 * dt);
      }

      if (c.mesh) {
        c.mesh.position.x = getLaneX(c.lane);
        c.mesh.position.z = c.z;
        c.mesh.rotation.y += 4 * dt; // spin
      }

      // Collect coin
      if (distToPlayer < 1.4 && !c.collected) {
        c.collected = true;
        this.coinsCount++;
        this.score += 25 * this.scoreMultiplier;
        soundManager.playCoin();
        this.callbacks.onEvent('coin', 1);

        if (c.mesh) this.scene.remove(c.mesh);
        this.coins.splice(i, 1);
        continue;
      }

      // Despawn passed coins
      if (c.z > 10) {
        if (c.mesh) this.scene.remove(c.mesh);
        this.coins.splice(i, 1);
      }
    }

    // 8. Update Power-up Pickups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.z += forwardStep;

      if (p.mesh) {
        p.mesh.position.z = p.z;
        p.mesh.rotation.y += 3 * dt;
        p.mesh.position.y = 1.1 + Math.sin(now * 0.005) * 0.15;
      }

      const pX = getLaneX(p.lane);
      const dist = Math.hypot(pX - this.playerPhysics.x, p.z, p.y - this.playerPhysics.y);

      if (dist < 1.6 && !p.collected) {
        p.collected = true;
        this.collectPowerup(p.type);
        if (p.mesh) this.scene.remove(p.mesh);
        this.powerups.splice(i, 1);
        continue;
      }

      if (p.z > 10) {
        if (p.mesh) this.scene.remove(p.mesh);
        this.powerups.splice(i, 1);
      }
    }

    // 9. Camera Follow Rig with Exponential Damping and Speed FOV Kick
    const targetCamX = this.playerPhysics.x * 0.45;
    const targetCamY = 3.6 + Math.max(0, this.playerPhysics.y * 0.5);
    const targetCamZ = 6.2;

    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, 8 * dt);
    this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, 8 * dt);
    this.camera.position.z += (targetCamZ - this.camera.position.z) * Math.min(1, 8 * dt);

    // Screen shake from camera trauma
    if (this.cameraTrauma > 0) {
      const shake = this.cameraTrauma * this.cameraTrauma;
      this.camera.position.x += (Math.random() - 0.5) * shake * 0.6;
      this.camera.position.y += (Math.random() - 0.5) * shake * 0.6;
      this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 2.5);
    }

    // FOV boost during jetpack turbo
    const targetFov = hasJetpack ? 80 : this.baseFov;
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, 5 * dt);
    this.camera.updateProjectionMatrix();

    this.camera.lookAt(this.playerPhysics.x * 0.2, 1.4 + this.playerPhysics.y * 0.3, -4);

    // 10. Report Metrics to UI
    this.callbacks.onScoreUpdate(Math.floor(this.score), Math.floor(this.distance), this.coinsCount);

    // Render Frame
    this.renderer.render(this.scene, this.camera);
  }

  private collectPowerup(type: PowerupType) {
    soundManager.playPowerup();
    this.cameraTrauma = 0.3;

    if (type === 'shield') {
      this.hasShield = true;
      return;
    }

    const duration = type === 'jetpack' ? 8 : 12;
    this.activePowerups.set(type, { remaining: duration, total: duration });

    if (type === 'jetpack' && this.characterBundle.jetpackMesh) {
      this.characterBundle.jetpackMesh.visible = true;
    }
  }

  private spawnProceduralItems(forwardStep: number) {
    this.nextObstacleZ += forwardStep;

    // Difficulty ramp: obstacle interval decreases as distance increases
    const minSpacing = Math.max(22, 38 - Math.pow(this.distance / 400, 0.5) * 8);

    if (this.nextObstacleZ > 0) {
      this.nextObstacleZ = -minSpacing;
      const spawnZ = -120; // spawn in distance

      // Decide obstacle type and lane
      const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
      const rand = Math.random();

      let obsType: ObstacleType = 'hurdle';
      if (rand < 0.45) {
        obsType = 'hurdle';
      } else if (rand < 0.75) {
        obsType = 'high_barrier';
      } else {
        obsType = 'train';
      }

      let obsMesh: THREE.Group;
      let width = 2.4;
      let height = 1.0;
      let depth = 0.5;
      let speedZ = 0;

      if (obsType === 'hurdle') {
        obsMesh = createHurdleModel();
        height = 0.95;
      } else if (obsType === 'high_barrier') {
        obsMesh = createHighBarrierModel();
        height = 2.8;
      } else {
        obsMesh = createTrainModel();
        height = 2.6;
        depth = 14.0;
        width = 2.4;
        // Occasionally moving train
        if (Math.random() < 0.4 && this.distance > 300) {
          speedZ = 6.0; // oncoming train speed
        }
      }

      obsMesh.position.set(getLaneX(lane), 0, spawnZ);
      this.scene.add(obsMesh);

      this.obstacles.push({
        id: Math.random(),
        type: obsType,
        lane,
        z: spawnZ,
        y: 0,
        width,
        height,
        depth,
        speedZ,
        mesh: obsMesh,
      });

      // Spawn Coins (straight line or arch over hurdle)
      const coinLane = Math.random() < 0.5 ? lane : [-1, 0, 1][Math.floor(Math.random() * 3)];
      const coinCount = 5;
      for (let c = 0; c < coinCount; c++) {
        const cZ = spawnZ + (c - 2) * 2.2;
        const cMesh = createCoinModel();
        const cY = (obsType === 'hurdle' && coinLane === lane) ? 1.6 + Math.sin((c / (coinCount - 1)) * Math.PI) * 0.8 : 0.8;
        cMesh.position.set(getLaneX(coinLane), cY, cZ);
        this.scene.add(cMesh);

        this.coins.push({
          id: Math.random(),
          lane: coinLane,
          z: cZ,
          y: cY,
          mesh: cMesh,
        });
      }

      // Random Power-up spawn (15% chance)
      if (Math.random() < 0.18) {
        const pTypes: PowerupType[] = ['magnet', 'sneakers', 'jetpack', 'multiplier', 'shield'];
        const pType = pTypes[Math.floor(Math.random() * pTypes.length)];
        const pLane = [-1, 0, 1].find((l) => l !== lane) ?? 0;
        const pZ = spawnZ - 12;

        const pMesh = createPowerupModel(pType);
        pMesh.position.set(getLaneX(pLane), 1.1, pZ);
        this.scene.add(pMesh);

        this.powerups.push({
          id: Math.random(),
          type: pType,
          lane: pLane,
          z: pZ,
          y: 1.1,
          mesh: pMesh,
        });
      }
    }
  }

  private triggerCrash() {
    this.state = 'gameover';
    document.body.dataset.state = 'gameover';
    this.hitstopTimer = 0.08;
    this.cameraTrauma = 1.0;
    soundManager.playCrash();
    soundManager.stopMusic();

    // Fall animation
    this.characterBundle.group.rotation.x = -1.2;
    this.characterBundle.group.position.y = 0.3;

    // Report Run Summary
    const summary: RunSummary = {
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      coins: this.coinsCount,
      jumps: this.jumpsCount,
      slides: this.slidesCount,
      characterId: this.characterInfo.id,
      isNewBest: false,
    };
    this.callbacks.onGameOver(summary);
    this.callbacks.onEvent('run_end');
  }

  private renderPaused() {
    // Just render static scene
    this.renderer.render(this.scene, this.camera);
  }

  private renderGameOver(dt: number) {
    // Gentle camera pull back
    this.camera.position.z += 0.5 * dt;
    this.camera.lookAt(this.playerPhysics.x * 0.2, 0.6, 0);
    this.renderer.render(this.scene, this.camera);
  }

  private handleResize() {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    soundManager.stopMusic();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
