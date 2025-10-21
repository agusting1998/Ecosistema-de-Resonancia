let particles = [];
let energyWaves = [];
let motionDetected = false;
let motionCount = 0;
let temperature = 22;
let humidity = 50;
let systemActive = true; 
let showWaves = true;
let showParticles = true;
let intensity = 1.0;

let sineSynth;
let colorPalette = [];
let bgAlpha = 20;
let lastMotionTime = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  updateColorPalette(temperature);

  // Audio simple activado automáticamente
  initAudio();
}

function draw() {
  background(0, bgAlpha);

  if (!systemActive) return;

  simulateSensors();

  if (showWaves) {
    updateEnergyWaves();
    displayEnergyWaves();
  }
  
  if (showParticles) {
    updateParticles();
    displayParticles();
  }
  
  displayInfo();

  if (millis() - lastMotionTime > 1000) motionDetected = false;
}

// --- PARTICLES / WAVES ---
function createParticle(x, y, count) {
  let numParticles = floor(10 * intensity) + count % 5;
  for (let i = 0; i < numParticles; i++) {
    let angle = random(TWO_PI);
    let speed = random(2, 8) * intensity;
    particles.push({
      pos: createVector(x, y),
      vel: createVector(cos(angle) * speed, sin(angle) * speed),
      acc: createVector(0, 0),
      life: 255,
      size: random(5, 20) * intensity,
      color: random(colorPalette)
    });
  }
}

function createEnergyWave(x, y) {
  energyWaves.push({
    pos: createVector(x, y),
    radius: 0,
    maxRadius: random(200, 400) * intensity,
    alpha: 255,
    color: random(colorPalette),
    speed: random(3, 6) * intensity
  });

  // Sonido simple al generar onda
  triggerSine();
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.vel.add(p.acc);
    p.pos.add(p.vel);
    p.acc.mult(0);
    p.vel.mult(0.98);
    p.life -= 2;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updateEnergyWaves() {
  for (let i = energyWaves.length - 1; i >= 0; i--) {
    let w = energyWaves[i];
    w.radius += w.speed;
    w.alpha -= 3;
    if (w.alpha <= 0 || w.radius >= w.maxRadius) energyWaves.splice(i, 1);
  }
}

function displayParticles() {
  noStroke();
  for (let p of particles) {
    fill(p.color[0], p.color[1], p.color[2], p.life);
    ellipse(p.pos.x, p.pos.y, p.size);
  }
}

function displayEnergyWaves() {
  noFill();
  strokeWeight(3);
  for (let w of energyWaves) {
    stroke(w.color[0], w.color[1], w.color[2], w.alpha);
    ellipse(w.pos.x, w.pos.y, w.radius * 2);
  }
}

// --- AUDIO SIMPLE ---
function initAudio() {
  sineSynth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 },
    volume: -8
  }).toDestination();
  Tone.start();
}

function triggerSine() {
  let freq = map(temperature, 15, 35, 200, 800);
  sineSynth.triggerAttackRelease(freq * random(1,2), "8n");
}

// --- DISPLAY INFO ---
function displayInfo() {
  fill(255, 200);
  textAlign(LEFT);
  textSize(12);
  let y = height - 100;
  text(`Sensor PIR: ${motionDetected ? 'ACTIVO':'INACTIVO'}`, 20, y);
  text(`Detecciones: ${motionCount}`, 20, y+20);
  text(`Temperatura: ${temperature.toFixed(1)}°C`, 20, y+40);
  text(`Humedad: ${humidity.toFixed(1)}%`, 20, y+60);
  text(`Partículas: ${particles.length}`, 20, y+80);
  text(`Ondas: ${energyWaves.length}`, 20, y+100);
}

// --- SIMULACIÓN DE SENSORES ---
function simulateSensors() {
  temperature += random(-0.05, 0.05);
  humidity += random(-0.2, 0.2);
  temperature = constrain(temperature, 15, 35);
  humidity = constrain(humidity, 20, 80);

  if(random() < 0.01){
    motionDetected = true;
    lastMotionTime = millis();
    motionCount++;
    handleMotionDetection();
  }
  
  updateColorPalette(temperature);
}

function handleMotionDetection() {
  let x = width/2 + random(-100,100);
  let y = height/2 + random(-100,100);
  createParticle(x, y, motionCount);
  createEnergyWave(x, y);
}

function updateColorPalette(temp){
  if(temp<20) colorPalette=[[100,150,255],[50,200,255],[150,220,255],[200,230,255]];
  else if(temp<28) colorPalette=[[150,255,150],[255,255,100],[200,255,150],[255,220,100]];
  else colorPalette=[[255,100,100],[255,150,50],[255,200,100],[255,120,80]];
}

function mousePressed(){ handleMotionDetection(); }
function windowResized(){ resizeCanvas(windowWidth, windowHeight); }
