let particles = [];
let energyWaves = [];
let motionDetected = false;
let motionCount = 0;
let temperature = 22;
let humidity = 50;
let systemActive = false;
let showWaves = true;
let showParticles = true;
let intensity = 1.0;

let port, reader;
let serialConnected = false;
let readingSerial = false;

let ambientSynth, noiseSynth, eventSynth, reverb, filter, lfo;
let isAudioInitialized = false;

let colorPalette = [];
let bgAlpha = 20;
let lastMotionTime = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  
  updateColorPalette(temperature);
  createControls();
  console.log("Sistema iniciado - Presiona 'S' para activar");
}

function draw() {
  background(0, bgAlpha);

  if (!systemActive) {
    drawWelcomeScreen();
    return;
  }

  if (showWaves) { updateEnergyWaves(); displayEnergyWaves(); }
  if (showParticles) { updateParticles(); displayParticles(); }
  if (isAudioInitialized) { updateAudioParameters(); }

  displayInfo();

  if (serialConnected && !readingSerial) readSerialData();

  if (millis() - lastMotionTime > 1000) motionDetected = false;
}

// Partículas y Ondas
function createParticle(x, y, count){
  let num = floor(10 * intensity) + count % 5;
  for (let i=0;i<num;i++){
    let angle=random(TWO_PI);
    let speed=random(2,8)*intensity;
    particles.push({
      pos:createVector(x,y),
      vel:createVector(cos(angle)*speed, sin(angle)*speed),
      acc:createVector(0,0),
      life:255,
      size:random(5,20)*intensity,
      color: colorPalette.length>0?random(colorPalette):[255,255,255]
    });
  }
}

function createEnergyWave(x,y){
  energyWaves.push({
    pos:createVector(x,y),
    radius:0,
    maxRadius:random(200,400)*intensity,
    alpha:255,
    color: colorPalette.length>0?random(colorPalette):[255,255,255],
    speed:random(3,6)*intensity
  });
}

function updateParticles(){
  if (particles.length>800) particles.splice(0,50);
  let mouseVec=createVector(mouseX,mouseY);
  for(let i=particles.length-1;i>=0;i--){
    let p=particles[i];
    p.vel.add(p.acc);
    p.pos.add(p.vel);
    p.acc.mult(0);
    p.vel.mult(0.98);
    if(mouseIsPressed){
      let f=p5.Vector.sub(mouseVec,p.pos); f.setMag(0.1); p.acc.add(f);
    }
    p.life-=2;
    if(p.life<=0 || p.pos.x<0 || p.pos.x>width || p.pos.y<0 || p.pos.y>height) particles.splice(i,1);
  }
}

function updateEnergyWaves(){
  for(let i=energyWaves.length-1;i>=0;i--){
    let w=energyWaves[i];
    w.radius+=w.speed; w.alpha-=3;
    if(w.alpha<=0 || w.radius>=w.maxRadius) energyWaves.splice(i,1);
  }
}

function displayParticles(){
  noStroke();
  for(let p of particles){
    fill(...p.color,p.life); ellipse(p.pos.x,p.pos.y,p.size);
    fill(...p.color,p.life*0.3); ellipse(p.pos.x,p.pos.y,p.size*2);
  }
}

function displayEnergyWaves(){
  noFill(); strokeWeight(3);
  for(let w of energyWaves){
    stroke(...w.color,w.alpha); ellipse(w.pos.x,w.pos.y,w.radius*2);
    stroke(...w.color,w.alpha*0.5); ellipse(w.pos.x,w.pos.y,w.radius*2+10);
  }
}

// Audio
async function initAudio(){
  if(isAudioInitialized) return;
  await Tone.start();
  ambientSynth=new Tone.PolySynth(Tone.Synth,{oscillator:{type:"sine"},envelope:{attack:2,decay:1,sustain:0.8,release:4},volume:-10});
  noiseSynth=new Tone.Noise("pink"); noiseSynth.volume.value=-25;
  eventSynth=new Tone.Synth({oscillator:{type:"triangle"},envelope:{attack:0.01,decay:0.3,sustain:0.1,release:1},volume:-8});
  reverb=new Tone.Reverb({decay:4,wet:0.4}); filter=new Tone.Filter({type:"lowpass",frequency:800,Q:1});
  lfo=new Tone.LFO({frequency:0.5,min:200,max:1000}); lfo.connect(filter.frequency); lfo.start();
  ambientSynth.connect(reverb); noiseSynth.connect(filter); filter.connect(reverb); eventSynth.connect(reverb); reverb.toDestination();
  noiseSynth.start(); isAudioInitialized=true; console.log("Audio iniciado");
}

function updateAudioParameters(){
  let baseFreq=map(temperature,15,35,100,400);
  let activityLevel=constrain(motionCount/50,0,1);
  filter.frequency.rampTo(map(activityLevel,0,1,300,2000),1);
  noiseSynth.volume.rampTo(map(activityLevel,0,1,-35,-15),1);
  if(random(1)<0.01) ambientSynth.triggerAttackRelease(baseFreq*random([1,1.25,1.5,2]),"4n");
  lfo.frequency.rampTo(map(humidity,20,80,0.1,2),0.5);
}

function triggerMotionEvent(){
  if(!isAudioInitialized) return;
  let baseFreq=map(temperature,15,35,200,800);
  eventSynth.triggerAttackRelease(baseFreq*random([1,1.5,2,3]),"8n");
  setTimeout(()=>eventSynth.triggerAttackRelease(baseFreq*random([2,2.5,3]),"16n"),100);
}

// Serial
async function connectSerial(){
  try{ port=await navigator.serial.requestPort(); await port.open({baudRate:115200}); reader=port.readable.getReader(); serialConnected=true; console.log("ESP32 conectado"); }
  catch(e){ console.log("Error serial:",e); }
}

async function readSerialData(){
  readingSerial=true;
  try{
    const {value,done}=await reader.read();
    if(done) return;
    let text=new TextDecoder().decode(value);
    let lines=text.split('\n');
    for(let line of lines){
      if(line.trim().startsWith('{')){
        try{
          let data=JSON.parse(line);
          temperature=data.temperature; humidity=data.humidity; motionCount=data.count;
          if(data.motion===1 && !motionDetected){motionDetected=true; lastMotionTime=millis(); handleMotionDetection();}
          updateColorPalette(temperature);
        }catch(e){console.log("JSON error:",line,e);}
      }
    }
  }catch(e){console.log("Serial read error:",e);}
  finally{readingSerial=false;}
}

// Movimiento
function handleMotionDetection(){
  let x=width/2+random(-100,100); let y=height/2+random(-100,100);
  createParticle(x,y,floor(motionCount*intensity));
  createEnergyWave(x,y);
  triggerMotionEvent();
}

// Paleta
function updateColorPalette(temp){
  if(temp<20) colorPalette=[[100,150,255],[50,200,255],[150,220,255],[200,230,255]];
  else if(temp<28) colorPalette=[[150,255,150],[255,255,100],[200,255,150],[255,220,100]];
  else colorPalette=[[255,100,100],[255,150,50],[255,200,100],[255,120,80]];
}

// UI
function createControls(){
  createButton('Conectar Sensor').position(20,20).mousePressed(connectSerial);
  createButton('Iniciar Audio').position(20,60).mousePressed(async()=>await initAudio());
  createButton('Test Detección').position(20,100).mousePressed(()=>{if(systemActive) handleMotionDetection();});
}

function drawWelcomeScreen(){
  fill(255); textAlign(CENTER,CENTER); textSize(32); text("ECOSYSTEM OF RESONANCE",width/2,height/2-50);
  textSize(16); text("Presiona 'S' para iniciar",width/2,height/2+20);
  text("Muévete dentro del rango del sensor PIR",width/2,height/2+50);
}

function displayInfo(){
  fill(255,200); textAlign(LEFT); textSize(12);
  let y=height-140;
  text(`Sensor PIR: ${motionDetected?'ACTIVO':'INACTIVO'}`,20,y);
  text(`Detecciones: ${motionCount}`,20,y+20);
  text(`Temperatura: ${temperature.toFixed(1)}°C`,20,y+40);
  text(`Humedad: ${humidity.toFixed(1)}%`,20,y+60);
  text(`Partículas: ${particles.length}`,20,y+80);
  text(`Ondas: ${energyWaves.length}`,20,y+100);
  text(`Audio: ${isAudioInitialized?'ON':'OFF'}`,20,y+120);
  textAlign(RIGHT); text("S: Start/Stop | R: Reset | E: Ondas | P: Partículas",width-20,height-20);
  text("+/-: Intensidad | Click: Test",width-20,height-5);
}

function keyPressed(){
  if(key==='s'||key==='S'){ systemActive=!systemActive; if(systemActive && !isAudioInitialized) initAudio();}
  if(key==='r'||key==='R'){ particles=[]; energyWaves=[]; motionCount=0; }
  if(key==='e'||key==='E') showWaves=!showWaves;
  if(key==='p'||key==='P') showParticles=!showParticles;
  if(key==='+'||key==='=') intensity=constrain(intensity+0.1,0.5,2.0);
  if(key==='-'||key==='_') intensity=constrain(intensity-0.1,0.5,2.0);
}

function mousePressed(){ if(systemActive){ createParticle(mouseX,mouseY,floor(5*intensity)); createEnergyWave(mouseX,mouseY); } }
function windowResized(){ resizeCanvas(windowWidth,windowHeight); }
