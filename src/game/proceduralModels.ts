import * as THREE from 'three';
import { CharacterId, CharacterSkin, PowerupType } from '../types/game';

// Shared materials and geometries for optimal performance
let coinGeo: THREE.CylinderGeometry | null = null;
let coinMat: THREE.MeshStandardMaterial | null = null;

let contactShadowGeo: THREE.CircleGeometry | null = null;
let contactShadowMat: THREE.MeshBasicMaterial | null = null;

function getContactShadowMesh(): THREE.Mesh {
  if (!contactShadowGeo) {
    contactShadowGeo = new THREE.CircleGeometry(0.55, 16);
    contactShadowGeo.rotateX(-Math.PI / 2);
  }
  if (!contactShadowMat) {
    contactShadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
  }
  const mesh = new THREE.Mesh(contactShadowGeo, contactShadowMat);
  mesh.position.y = 0.02;
  mesh.renderOrder = 1;
  return mesh;
}

// Procedural Canvas Textures for striping and details
function createStripedTexture(color1: string, color2: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color1;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = color2;
  for (let i = -128; i < 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 32, 0);
    ctx.lineTo(i + 32 + 128, 128);
    ctx.lineTo(i + 128, 128);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export interface CharacterModelBundle {
  group: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  skinMesh: THREE.Mesh;
  jetpackMesh?: THREE.Group;
  updateAnimation: (time: number, speed: number, isJumping: boolean, isSliding: boolean) => void;
}

export function createCharacterModel(
  characterId: CharacterId,
  skin?: CharacterSkin
): CharacterModelBundle {
  const root = new THREE.Group();
  root.name = `character-${characterId}`;

  // Unique attributes per girl character:
  // Noor: Slim silhouette, energetic, sleek streetwear
  // Ravneet: Green eyes, athletic bomber jacket, bold accessories
  // Jass: Glowing skin, radiant sunset neon palette
  const isSlim = characterId === 'noor';
  const hasGreenEyes = characterId === 'ravneet';
  const hasGlowingSkin = characterId === 'jass';

  const palette = skin?.palette || {
    primary: characterId === 'noor' ? '#38ef7d' : characterId === 'ravneet' ? '#ff416c' : '#f9d423',
    secondary: '#1e293b',
    accent: '#ffffff',
    hair: characterId === 'noor' ? '#1a102f' : characterId === 'ravneet' ? '#2c1e30' : '#4a2810',
    eyes: hasGreenEyes ? '#00e676' : '#3d2314',
  };

  // Materials
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: hasGlowingSkin ? 0xffdfba : 0xf5cda8,
    roughness: hasGlowingSkin ? 0.25 : 0.65,
    metalness: 0.05,
    emissive: hasGlowingSkin ? 0xff9944 : 0x000000,
    emissiveIntensity: hasGlowingSkin ? 0.45 : 0,
  });

  const outfitMaterial = new THREE.MeshStandardMaterial({
    color: palette.primary,
    roughness: 0.4,
    metalness: 0.15,
  });

  const pantsMaterial = new THREE.MeshStandardMaterial({
    color: palette.secondary,
    roughness: 0.7,
    metalness: 0.1,
  });

  const hairMaterial = new THREE.MeshStandardMaterial({
    color: palette.hair,
    roughness: 0.5,
    metalness: 0.1,
  });

  const shoeMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.2,
  });

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: hasGreenEyes ? 0x00e676 : 0x221105,
    emissive: hasGreenEyes ? 0x00c853 : 0x000000,
    emissiveIntensity: hasGreenEyes ? 0.6 : 0,
    roughness: 0.1,
  });

  // Body proportions
  const widthScale = isSlim ? 0.82 : 0.95;
  const torsoWidth = 0.38 * widthScale;
  const torsoHeight = 0.52;
  const torsoDepth = 0.22 * widthScale;

  // 1. Torso Group
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.85;

  const jacketGeo = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth);
  const jacketMesh = new THREE.Mesh(jacketGeo, outfitMaterial);
  jacketMesh.castShadow = true;
  torsoGroup.add(jacketMesh);

  // Jacket collar / hood detail
  const collarGeo = new THREE.TorusGeometry(0.12 * widthScale, 0.04, 8, 16);
  collarGeo.rotateX(Math.PI / 2);
  const collarMesh = new THREE.Mesh(collarGeo, outfitMaterial);
  collarMesh.position.set(0, torsoHeight / 2 + 0.02, 0);
  torsoGroup.add(collarMesh);

  // 2. Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.42, 0);

  const headGeo = new THREE.BoxGeometry(0.24 * widthScale, 0.26, 0.24 * widthScale);
  const headMesh = new THREE.Mesh(headGeo, skinMaterial);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Eyes (Green eyes for Ravneet!)
  const eyeGeo = new THREE.BoxGeometry(0.045, 0.045, 0.02);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
  leftEye.position.set(-0.06 * widthScale, 0.02, 0.125 * widthScale);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
  rightEye.position.set(0.06 * widthScale, 0.02, 0.125 * widthScale);
  headGroup.add(leftEye, rightEye);

  // Hair
  const hairGeo = new THREE.BoxGeometry(0.27 * widthScale, 0.16, 0.27 * widthScale);
  const hairMesh = new THREE.Mesh(hairGeo, hairMaterial);
  hairMesh.position.set(0, 0.12, -0.01);
  headGroup.add(hairMesh);

  // Ponytail / Braids
  const braidGeo = new THREE.CylinderGeometry(0.04, 0.02, 0.35, 8);
  braidGeo.rotateX(0.35);
  const braidMesh = new THREE.Mesh(braidGeo, hairMaterial);
  braidMesh.position.set(0, 0.05, -0.18 * widthScale);
  headGroup.add(braidMesh);

  torsoGroup.add(headGroup);

  // 3. Arms
  const armWidth = 0.09 * widthScale;
  const armHeight = 0.42;
  const armGeo = new THREE.BoxGeometry(armWidth, armHeight, armWidth);

  // Left Arm
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-torsoWidth / 2 - armWidth / 2 - 0.02, torsoHeight / 2 - 0.08, 0);
  const leftArmMesh = new THREE.Mesh(armGeo, outfitMaterial);
  leftArmMesh.position.y = -armHeight / 2;
  leftArmMesh.castShadow = true;
  leftArmGroup.add(leftArmMesh);
  torsoGroup.add(leftArmGroup);

  // Right Arm
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(torsoWidth / 2 + armWidth / 2 + 0.02, torsoHeight / 2 - 0.08, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, outfitMaterial);
  rightArmMesh.position.y = -armHeight / 2;
  rightArmMesh.castShadow = true;
  rightArmGroup.add(rightArmMesh);
  torsoGroup.add(rightArmGroup);

  // 4. Legs
  const legWidth = 0.12 * widthScale;
  const legHeight = 0.58;
  const legGeo = new THREE.BoxGeometry(legWidth, legHeight, legWidth);

  // Left Leg
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.1 * widthScale, 0.58, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, pantsMaterial);
  leftLegMesh.position.y = -legHeight / 2;
  leftLegMesh.castShadow = true;
  leftLegGroup.add(leftLegMesh);

  // Left Shoe
  const shoeGeo = new THREE.BoxGeometry(legWidth + 0.03, 0.1, 0.22);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMaterial);
  leftShoe.position.set(0, -legHeight + 0.05, 0.04);
  leftLegGroup.add(leftShoe);

  // Right Leg
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.1 * widthScale, 0.58, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, pantsMaterial);
  rightLegMesh.position.y = -legHeight / 2;
  rightLegMesh.castShadow = true;
  rightLegGroup.add(rightLegMesh);

  // Right Shoe
  const rightShoe = new THREE.Mesh(shoeGeo, shoeMaterial);
  rightShoe.position.set(0, -legHeight + 0.05, 0.04);
  rightLegGroup.add(rightShoe);

  root.add(torsoGroup, leftLegGroup, rightLegGroup);

  // 5. Contact Shadow Disc
  const shadow = getContactShadowMesh();
  root.add(shadow);

  // 6. Optional Jetpack Mesh (shown during turbo)
  const jetpackGroup = new THREE.Group();
  jetpackGroup.position.set(0, 0, -torsoDepth / 2 - 0.08);
  const jetBodyGeo = new THREE.BoxGeometry(0.24, 0.32, 0.12);
  const jetMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.8, roughness: 0.2 });
  const jetMesh = new THREE.Mesh(jetBodyGeo, jetMat);
  jetpackGroup.add(jetMesh);

  const thrusterGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.16, 8);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
  const leftThruster = new THREE.Mesh(thrusterGeo, flameMat);
  leftThruster.position.set(-0.08, -0.18, 0);
  const rightThruster = new THREE.Mesh(thrusterGeo, flameMat);
  rightThruster.position.set(0.08, -0.18, 0);
  jetpackGroup.add(leftThruster, rightThruster);
  jetpackGroup.visible = false;
  torsoGroup.add(jetpackGroup);

  // Animation controller
  const updateAnimation = (time: number, speed: number, isJumping: boolean, isSliding: boolean) => {
    if (isSliding) {
      // Crouch pose: lower torso, legs bent forward
      torsoGroup.position.y = 0.42;
      torsoGroup.rotation.x = 0.45;
      leftLegGroup.position.y = 0.32;
      leftLegGroup.rotation.x = -1.1;
      rightLegGroup.position.y = 0.32;
      rightLegGroup.rotation.x = -1.1;
      leftArmGroup.rotation.x = -0.5;
      rightArmGroup.rotation.x = -0.5;
    } else if (isJumping) {
      // Jump pose: legs tucked slightly, arms raised back
      torsoGroup.position.y = 0.88;
      torsoGroup.rotation.x = -0.15;
      leftLegGroup.position.y = 0.58;
      leftLegGroup.rotation.x = -0.4;
      rightLegGroup.position.y = 0.58;
      rightLegGroup.rotation.x = 0.3;
      leftArmGroup.rotation.x = -0.8;
      rightArmGroup.rotation.x = -0.8;
    } else {
      // Running walk cycle synced with speed
      const freq = speed * 0.75;
      const swing = Math.sin(time * freq) * 0.75;

      torsoGroup.position.y = 0.85 + Math.abs(Math.sin(time * freq * 2)) * 0.06;
      torsoGroup.rotation.x = 0.12; // forward lean
      torsoGroup.rotation.y = Math.sin(time * freq) * 0.08;

      leftLegGroup.position.y = 0.58;
      leftLegGroup.rotation.x = swing;
      rightLegGroup.position.y = 0.58;
      rightLegGroup.rotation.x = -swing;

      leftArmGroup.rotation.x = -swing * 0.9;
      rightArmGroup.rotation.x = swing * 0.9;
    }
  };

  return {
    group: root,
    leftLeg: leftLegGroup,
    rightLeg: rightLegGroup,
    leftArm: leftArmGroup,
    rightArm: rightArmGroup,
    torso: torsoGroup,
    head: headGroup,
    skinMesh: headMesh,
    jetpackMesh: jetpackGroup,
    updateAnimation,
  };
}

// Procedural Train Model (Multi-part realistic Subway Surfers style train)
export function createTrainModel(): THREE.Group {
  const train = new THREE.Group();
  train.name = 'train-obstacle';

  const trainLength = 14.0;
  const trainWidth = 2.4;
  const trainHeight = 2.6;

  // 1. Main carriage chassis
  const bodyGeo = new THREE.BoxGeometry(trainWidth, trainHeight, trainLength);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2b304c,
    roughness: 0.35,
    metalness: 0.4,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = trainHeight / 2 + 0.3;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  train.add(bodyMesh);

  // 2. Aerodynamic Front Cowling / Nose
  const frontGeo = new THREE.BoxGeometry(trainWidth, trainHeight * 0.85, 1.8);
  const frontMat = new THREE.MeshStandardMaterial({
    color: 0xfe4a49,
    roughness: 0.2,
    metalness: 0.3,
  });
  const frontMesh = new THREE.Mesh(frontGeo, frontMat);
  frontMesh.position.set(0, trainHeight / 2 + 0.15, -trainLength / 2 - 0.9);
  frontMesh.castShadow = true;
  train.add(frontMesh);

  // 3. Front Windshield (Glass reflection)
  const glassGeo = new THREE.BoxGeometry(trainWidth * 0.85, 0.8, 0.08);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x101a2c,
    roughness: 0.1,
    metalness: 0.9,
  });
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.set(0, trainHeight * 0.8, -trainLength / 2 - 1.81);
  train.add(glassMesh);

  // 4. Dual Headlights
  const lightGeo = new THREE.CircleGeometry(0.18, 12);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff275 });
  const leftLight = new THREE.Mesh(lightGeo, lightMat);
  leftLight.position.set(-0.7, 0.9, -trainLength / 2 - 1.81);
  leftLight.rotateY(Math.PI);
  const rightLight = new THREE.Mesh(lightGeo, lightMat);
  rightLight.position.set(0.7, 0.9, -trainLength / 2 - 1.81);
  rightLight.rotateY(Math.PI);
  train.add(leftLight, rightLight);

  // 5. Roof Walkway & Ventilation Grid (where player can run!)
  const roofWalkGeo = new THREE.BoxGeometry(trainWidth * 0.6, 0.08, trainLength - 1);
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x687494,
    roughness: 0.8,
    metalness: 0.2,
  });
  const roofWalk = new THREE.Mesh(roofWalkGeo, roofMat);
  roofWalk.position.set(0, trainHeight + 0.34, 0);
  roofWalk.receiveShadow = true;
  train.add(roofWalk);

  // 6. Running Gear / Wheels (Bogies)
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111115, metalness: 0.8, roughness: 0.3 });

  const zPositions = [-4.5, -3.5, 3.5, 4.5];
  zPositions.forEach((z) => {
    const leftW = new THREE.Mesh(wheelGeo, wheelMat);
    leftW.position.set(-trainWidth / 2 - 0.02, 0.3, z);
    const rightW = new THREE.Mesh(wheelGeo, wheelMat);
    rightW.position.set(trainWidth / 2 + 0.02, 0.3, z);
    train.add(leftW, rightW);
  });

  // 7. Side racing stripes
  const stripeGeo = new THREE.BoxGeometry(trainWidth + 0.02, 0.25, trainLength);
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
  const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
  stripeMesh.position.set(0, 1.4, 0);
  train.add(stripeMesh);

  return train;
}

// Procedural Low Hurdle (jump over)
export function createHurdleModel(): THREE.Group {
  const hurdle = new THREE.Group();
  hurdle.name = 'hurdle-obstacle';

  const width = 2.4;
  const height = 0.95;

  // Sturdy side feet
  const footGeo = new THREE.BoxGeometry(0.3, 0.15, 0.6);
  const footMat = new THREE.MeshStandardMaterial({ color: 0x1e222d, metalness: 0.7, roughness: 0.3 });
  const leftFoot = new THREE.Mesh(footGeo, footMat);
  leftFoot.position.set(-width / 2 + 0.15, 0.075, 0);
  const rightFoot = new THREE.Mesh(footGeo, footMat);
  rightFoot.position.set(width / 2 - 0.15, 0.075, 0);

  // Vertical support poles
  const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, height, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xced6e0, metalness: 0.9, roughness: 0.2 });
  const leftPole = new THREE.Mesh(poleGeo, poleMat);
  leftPole.position.set(-width / 2 + 0.15, height / 2, 0);
  const rightPole = new THREE.Mesh(poleGeo, poleMat);
  rightPole.position.set(width / 2 - 0.15, height / 2, 0);

  // Striped chevron warning barrier bar
  const barGeo = new THREE.BoxGeometry(width, 0.32, 0.08);
  const tex = createStripedTexture('#ffbe0b', '#222222');
  const barMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.5,
  });
  const barMesh = new THREE.Mesh(barGeo, barMat);
  barMesh.position.set(0, height - 0.16, 0);
  barMesh.castShadow = true;

  // Top flashing safety beacons
  const beaconGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
  const leftBeacon = new THREE.Mesh(beaconGeo, beaconMat);
  leftBeacon.position.set(-width / 2 + 0.15, height + 0.06, 0);
  const rightBeacon = new THREE.Mesh(beaconGeo, beaconMat);
  rightBeacon.position.set(width / 2 - 0.15, height + 0.06, 0);

  hurdle.add(leftFoot, rightFoot, leftPole, rightPole, barMesh, leftBeacon, rightBeacon);
  return hurdle;
}

// Procedural High Barrier (roll / slide under)
export function createHighBarrierModel(): THREE.Group {
  const gantry = new THREE.Group();
  gantry.name = 'high-barrier-obstacle';

  const width = 2.6;
  const totalHeight = 2.8;
  const clearanceHeight = 1.0; // Open clearance space underneath

  // Tall vertical support truss posts
  const postGeo = new THREE.BoxGeometry(0.18, totalHeight, 0.18);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x3d3d52, metalness: 0.6, roughness: 0.4 });
  const leftPost = new THREE.Mesh(postGeo, postMat);
  leftPost.position.set(-width / 2, totalHeight / 2, 0);
  const rightPost = new THREE.Mesh(postGeo, postMat);
  rightPost.position.set(width / 2, totalHeight / 2, 0);

  // Overhead truss bridge
  const topGeo = new THREE.BoxGeometry(width + 0.2, 0.35, 0.3);
  const topMesh = new THREE.Mesh(topGeo, postMat);
  topMesh.position.set(0, totalHeight - 0.15, 0);

  // Hanging clearance warning fringe (starts at clearanceHeight and goes up to totalHeight)
  const fringeHeight = totalHeight - clearanceHeight - 0.35;
  const fringeGeo = new THREE.BoxGeometry(width - 0.2, fringeHeight, 0.06);
  const tex = createStripedTexture('#ff4757', '#ffffff');
  const fringeMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.4,
  });
  const fringeMesh = new THREE.Mesh(fringeGeo, fringeMat);
  fringeMesh.position.set(0, clearanceHeight + fringeHeight / 2, 0);
  fringeMesh.castShadow = true;

  // "SLIDE / DUCK" glowing hazard clearance indicator
  const signGeo = new THREE.BoxGeometry(1.0, 0.22, 0.08);
  const signMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
  const signMesh = new THREE.Mesh(signGeo, signMat);
  signMesh.position.set(0, clearanceHeight + fringeHeight + 0.12, 0.12);

  gantry.add(leftPost, rightPost, topMesh, fringeMesh, signMesh);
  return gantry;
}

// Procedural Coin Model
export function createCoinModel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'coin';

  if (!coinGeo) {
    coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.08, 16);
    coinGeo.rotateZ(Math.PI / 2);
  }
  if (!coinMat) {
    coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffaa00,
      emissiveIntensity: 0.25,
      roughness: 0.2,
      metalness: 0.85,
    });
  }

  const coin = new THREE.Mesh(coinGeo, coinMat);
  coin.castShadow = true;

  // Inner beveled core
  const coreGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.09, 12);
  coreGeo.rotateZ(Math.PI / 2);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xff9f1c,
    metalness: 0.9,
    roughness: 0.1,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);

  group.add(coin, core);
  group.position.y = 0.8;
  return group;
}

// Procedural Powerup Models
export function createPowerupModel(type: PowerupType): THREE.Group {
  const group = new THREE.Group();
  group.name = `powerup-${type}`;

  const haloGeo = new THREE.RingGeometry(0.45, 0.55, 16);
  haloGeo.rotateX(Math.PI / 2);

  if (type === 'sneakers') {
    // High Jump Winged Sneakers
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x00f5d4, emissive: 0x00c4a7, emissiveIntensity: 0.4 });
    const shoeGeo = new THREE.BoxGeometry(0.25, 0.2, 0.5);
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(-0.2, 0, 0);
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0.2, 0, 0);

    // Wings
    const wingGeo = new THREE.ConeGeometry(0.18, 0.4, 4);
    wingGeo.rotateZ(Math.PI / 3);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const wing1 = new THREE.Mesh(wingGeo, wingMat);
    wing1.position.set(-0.35, 0.15, 0);
    const wing2 = new THREE.Mesh(wingGeo, wingMat);
    wing2.position.set(0.35, 0.15, 0);
    wing2.scale.set(-1, 1, 1);

    group.add(leftShoe, rightShoe, wing1, wing2);
  } else if (type === 'jetpack') {
    // Turbo Speed Jetpack
    const jetMat = new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0xd90368, emissiveIntensity: 0.5 });
    const jetGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 12);
    const tank1 = new THREE.Mesh(jetGeo, jetMat);
    tank1.position.set(-0.2, 0, 0);
    const tank2 = new THREE.Mesh(jetGeo, jetMat);
    tank2.position.set(0.2, 0, 0);

    const bridgeGeo = new THREE.BoxGeometry(0.3, 0.15, 0.15);
    const bridge = new THREE.Mesh(bridgeGeo, new THREE.MeshStandardMaterial({ color: 0x111122 }));
    group.add(tank1, tank2, bridge);
  } else if (type === 'magnet') {
    // Horseshoe Magnet
    const torusGeo = new THREE.TorusGeometry(0.3, 0.1, 8, 16, Math.PI);
    torusGeo.rotateZ(Math.PI);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xe63946, metalness: 0.4, roughness: 0.3 });
    const torus = new THREE.Mesh(torusGeo, redMat);

    const tipGeo = new THREE.BoxGeometry(0.2, 0.22, 0.2);
    const silverMat = new THREE.MeshStandardMaterial({ color: 0xf1faee, metalness: 0.9, roughness: 0.1 });
    const leftTip = new THREE.Mesh(tipGeo, silverMat);
    leftTip.position.set(-0.3, 0.12, 0);
    const rightTip = new THREE.Mesh(tipGeo, silverMat);
    rightTip.position.set(0.3, 0.12, 0);

    group.add(torus, leftTip, rightTip);
  } else if (type === 'multiplier') {
    // 2X Multiplier Star Emblem
    const starGeo = new THREE.OctahedronGeometry(0.35, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xffbe0b,
      emissive: 0xfb5607,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.7,
    });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    group.add(starMesh);
  } else {
    // Energy Shield Orb
    const orbGeo = new THREE.IcosahedronGeometry(0.35, 1);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x00b4d8,
      emissive: 0x0077b6,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
    });
    const orbMesh = new THREE.Mesh(orbGeo, orbMat);
    group.add(orbMesh);
  }

  group.position.y = 1.1;
  return group;
}

// Procedural Track Bed Segment
export function createTrackSegment(length: number = 40): THREE.Group {
  const segment = new THREE.Group();
  segment.name = 'track-segment';

  const totalWidth = 10.5;

  // 1. Ballast bed (gravel floor)
  const ballastGeo = new THREE.PlaneGeometry(totalWidth, length);
  ballastGeo.rotateX(-Math.PI / 2);
  const ballastMat = new THREE.MeshStandardMaterial({
    color: 0x1f2333,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ballast = new THREE.Mesh(ballastGeo, ballastMat);
  ballast.receiveShadow = true;
  segment.add(ballast);

  // 2. Rails (3 lanes * 2 rails = 6 steel rails)
  const railGeo = new THREE.BoxGeometry(0.08, 0.12, length);
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x7888a6,
    metalness: 0.85,
    roughness: 0.25,
  });

  const laneOffsets = [-2.8, 0, 2.8];
  laneOffsets.forEach((laneX) => {
    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(laneX - 0.75, 0.08, 0);
    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(laneX + 0.75, 0.08, 0);
    segment.add(leftRail, rightRail);
  });

  // 3. Sleepers / Ties (Wooden cross ties every 1.5m)
  const tieGeo = new THREE.BoxGeometry(totalWidth * 0.9, 0.08, 0.35);
  const tieMat = new THREE.MeshStandardMaterial({
    color: 0x342921,
    roughness: 0.9,
    metalness: 0.05,
  });

  for (let z = -length / 2 + 1; z < length / 2; z += 1.6) {
    const tie = new THREE.Mesh(tieGeo, tieMat);
    tie.position.set(0, 0.04, z);
    tie.receiveShadow = true;
    segment.add(tie);
  }

  // 4. Glowing Neon Track Boundaries
  const edgeGeo = new THREE.BoxGeometry(0.15, 0.25, length);
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x7928ca });
  const leftEdge = new THREE.Mesh(edgeGeo, edgeMat);
  leftEdge.position.set(-totalWidth / 2 + 0.1, 0.12, 0);
  const rightEdge = new THREE.Mesh(edgeGeo, edgeMat);
  rightEdge.position.set(totalWidth / 2 - 0.1, 0.12, 0);
  segment.add(leftEdge, rightEdge);

  // 5. Cozy roadside decorative elements: Procedural cherry blossom / glowing synth trees
  const foliageGeo = new THREE.DodecahedronGeometry(1.2, 1);
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0xff758c,
    roughness: 0.5,
    metalness: 0.1,
  });
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 3.0, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x422a1d, roughness: 0.9 });

  // Place 2 trees on the outer landscape
  const tree1 = new THREE.Group();
  const trunk1 = new THREE.Mesh(trunkGeo, trunkMat);
  trunk1.position.y = 1.5;
  const crown1 = new THREE.Mesh(foliageGeo, foliageMat);
  crown1.position.y = 3.2;
  tree1.add(trunk1, crown1);
  tree1.position.set(-totalWidth / 2 - 2.8, 0, -12);

  const tree2 = new THREE.Group();
  const trunk2 = new THREE.Mesh(trunkGeo, trunkMat);
  trunk2.position.y = 1.5;
  const crown2 = new THREE.Mesh(foliageGeo, foliageMat);
  crown2.position.y = 3.2;
  tree2.add(trunk2, crown2);
  tree2.position.set(totalWidth / 2 + 2.8, 0, 10);

  segment.add(tree1, tree2);

  return segment;
}
