// Interactive 3D Rubik's Cube — click stickers to paint, then solve

class RubiksCube3D {
  constructor(container) {
    this.container = container;
    this.cubies = [];
    this.SPACING = 1.05;
    this.mode = 'input';
    this.selectedColor = 'U';
    this.moves = [];
    this.currentStep = 0;
    this.isAnimating = false;
    this.isPlaying = false;
    this.stickerMeshes = [];

    this.colorHex = { U:0xffffff, R:0xdc2626, F:0x16a34a, D:0xeab308, L:0xea580c, B:0x2563eb };
    this.colorCSS = { U:'#ffffff', R:'#dc2626', F:'#16a34a', D:'#eab308', L:'#ea580c', B:'#2563eb' };
    this.colorNames = { U:'White', R:'Red', F:'Green', D:'Yellow', L:'Orange', B:'Blue' };
    // Face display names for labels
    this.faceLabel = { U:'U (Top)', R:'R (Right)', F:'F (Front)', D:'D (Bot)', L:'L (Left)', B:'B (Back)' };

    this._initScene();
    this._buildCubies();
    this._resetSolved();
    this._buildInputUI();
    this._loop();
  }

  // ─── Scene ───
  _initScene() {
    const W = Math.min(this.container.clientWidth || 540, 540);
    const H = 420;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, W/H, 0.1, 200);
    this.camera.position.set(6.5, 5.2, 7.2);
    this.camera.lookAt(0, -0.15, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0f172a);

    this.canvas = this.renderer.domElement;
    this.canvas.style.cssText = 'display:block;border-radius:14px 14px 0 0;cursor:grab;';
    this.container.appendChild(this.canvas);

    // Overlay for face labels
    this.labelOverlay = document.createElement('div');
    this.labelOverlay.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    this.labelOverlay.style.width = W+'px';
    this.labelOverlay.style.height = H+'px';
    this.container.style.position = 'relative';
    this.container.appendChild(this.labelOverlay);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.orbitGroup = new THREE.Group();
    this.scene.add(this.orbitGroup);
    this.cubeGroup = new THREE.Group();
    this.orbitGroup.add(this.cubeGroup);

    this.orbit = { x:-0.55, y:0.65 };
    this.dragging = false; this.dragStart={x:0,y:0}; this.dragMoved=false;

    this.canvas.addEventListener('pointerdown', e => { this.dragging=true; this.dragMoved=false; this.dragStart={x:e.clientX,y:e.clientY}; this.canvas.style.cursor='grabbing'; });
    window.addEventListener('pointerup', e => { if(this.dragging&&!this.dragMoved) this._onClick(e); this.dragging=false; this.canvas.style.cursor='grab'; });
    window.addEventListener('pointermove', e => {
      if(!this.dragging) return;
      const dx=e.clientX-this.dragStart.x, dy=e.clientY-this.dragStart.y;
      if(Math.abs(dx)>3||Math.abs(dy)>3) this.dragMoved=true;
      if(this.dragMoved){ this.orbit.y+=dx*0.007; this.orbit.x+=dy*0.007; this.orbit.x=Math.max(-1.3,Math.min(1.3,this.orbit.x)); this.dragStart={x:e.clientX,y:e.clientY}; }
    });

    this.scene.add(new THREE.AmbientLight(0xffffff,0.85));
    [[6,10,8,0.5],[-5,3,-5,0.3],[0,-6,3,0.15]].forEach(([x,y,z,i])=>{ const l=new THREE.DirectionalLight(0xffffff,i); l.position.set(x,y,z); this.scene.add(l); });

    // Face center 3D positions for labels
    this._faceCenters = { U:[0,1.7,0], D:[0,-1.7,0], R:[1.7,0,0], L:[-1.7,0,0], F:[0,0,1.7], B:[0,0,-1.7] };
    this._faceLabels = {};
    for (const [f, pos] of Object.entries(this._faceCenters)) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;background:${this.colorCSS[f]};color:${f==='U'||f==='D'?'#333':'#fff'};font-size:11px;font-weight:700;padding:2px 6px;border-radius:4px;border:1.5px solid rgba(0,0,0,0.2);white-space:nowrap;transform:translate(-50%,-50%);`;
      el.textContent = this.faceLabel[f];
      this.labelOverlay.appendChild(el);
      this._faceLabels[f] = el;
    }
  }

  // Update 2D screen positions of face labels each frame
  _updateLabels() {
    const W = parseInt(this.labelOverlay.style.width);
    const H = parseInt(this.labelOverlay.style.height);
    for (const [f, pos] of Object.entries(this._faceCenters)) {
      const v = new THREE.Vector3(...pos);
      v.applyEuler(new THREE.Euler(this.orbit.x, this.orbit.y, 0, 'XYZ'));
      // project
      const proj = v.clone().project(this.camera);
      const x = (proj.x*0.5+0.5)*W;
      const y = (-proj.y*0.5+0.5)*H;
      const el = this._faceLabels[f];
      // Hide label if face is behind camera
      el.style.opacity = proj.z < 1 ? '1' : '0';
      el.style.left = x+'px';
      el.style.top = y+'px';
    }
  }

  _rrect(w,h,r){
    const s=new THREE.Shape();
    s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
    return s;
  }

  _buildCubies() {
    const body=0.96,sw=0.78,sr=0.1,lift=body/2+0.003;
    const sGeo=new THREE.ShapeGeometry(this._rrect(sw,sw,sr));
    for(let x=-1;x<=1;x++) for(let y=-1;y<=1;y++) for(let z=-1;z<=1;z++){
      const g=new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(body,body,body),new THREE.MeshLambertMaterial({color:0x111111})));
      g.userData={x,y,z,stickers:{}};
      const add=(face,rx,ry,px,py,pz)=>{
        const mat=new THREE.MeshPhongMaterial({color:0x222222,shininess:60});
        const m=new THREE.Mesh(sGeo,mat);
        m.rotation.set(rx,ry,0);m.position.set(px,py,pz);
        m.userData={cubieGroup:g,face};
        g.add(m);g.userData.stickers[face]=mat;this.stickerMeshes.push(m);
      };
      if(x===1)  add('R',0,Math.PI/2,lift,0,0);
      if(x===-1) add('L',0,-Math.PI/2,-lift,0,0);
      if(y===1)  add('U',-Math.PI/2,0,0,lift,0);
      if(y===-1) add('D',Math.PI/2,0,0,-lift,0);
      if(z===1)  add('F',0,0,0,0,lift);
      if(z===-1) add('B',0,Math.PI,0,0,-lift);
      g.position.set(x*this.SPACING,y*this.SPACING,z*this.SPACING);
      this.cubeGroup.add(g);this.cubies.push(g);
    }
  }

  _faceMap(){
    return {
      U:{pos:[[-1,1,-1],[0,1,-1],[1,1,-1],[-1,1,0],[0,1,0],[1,1,0],[-1,1,1],[0,1,1],[1,1,1]],off:0},
      R:{pos:[[1,1,1],[1,1,0],[1,1,-1],[1,0,1],[1,0,0],[1,0,-1],[1,-1,1],[1,-1,0],[1,-1,-1]],off:9},
      F:{pos:[[-1,1,1],[0,1,1],[1,1,1],[-1,0,1],[0,0,1],[1,0,1],[-1,-1,1],[0,-1,1],[1,-1,1]],off:18},
      D:{pos:[[-1,-1,1],[0,-1,1],[1,-1,1],[-1,-1,0],[0,-1,0],[1,-1,0],[-1,-1,-1],[0,-1,-1],[1,-1,-1]],off:27},
      L:{pos:[[-1,1,-1],[-1,1,0],[-1,1,1],[-1,0,-1],[-1,0,0],[-1,0,1],[-1,-1,-1],[-1,-1,0],[-1,-1,1]],off:36},
      B:{pos:[[1,1,-1],[0,1,-1],[-1,1,-1],[1,0,-1],[0,0,-1],[-1,0,-1],[1,-1,-1],[0,-1,-1],[-1,-1,-1]],off:45},
    };
  }

  _find(x,y,z){return this.cubies.find(c=>Math.round(c.userData.x)===x&&Math.round(c.userData.y)===y&&Math.round(c.userData.z)===z);}

  _paintFromString(s){
    const fm=this._faceMap();
    for(const f of Object.keys(fm)) fm[f].pos.forEach(([x,y,z],i)=>{
      const c=this._find(x,y,z);
      if(c?.userData.stickers[f]){
        c.userData.stickers[f].color.setHex(this.colorHex[s[fm[f].off+i]]);
        c.userData.stickers[f]._colorLetter=s[fm[f].off+i];
      }
    });
  }

  _resetSolved(){this._paintFromString('UUUUUUUUURRRRRRRRR'+'FFFFFFFFF'+'DDDDDDDDD'+'LLLLLLLLL'+'BBBBBBBBB');}

  _readCubeString(){
    const fm=this._faceMap();let s='';
    for(const f of ['U','R','F','D','L','B']) for(const[x,y,z] of fm[f].pos){
      const c=this._find(x,y,z);s+=c?.userData.stickers[f]?._colorLetter||'?';
    }
    return s;
  }

  // ─── Click to paint ───
  _onClick(e){
    if(this.mode!=='input') return;
    const rect=this.canvas.getBoundingClientRect();
    this.mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
    this.mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
    this.raycaster.setFromCamera(this.mouse,this.camera);
    const hits=this.raycaster.intersectObjects(this.stickerMeshes);
    if(hits.length>0){
      const{cubieGroup,face}=hits[0].object.userData;
      if(cubieGroup?.userData.stickers[face]){
        cubieGroup.userData.stickers[face].color.setHex(this.colorHex[this.selectedColor]);
        cubieGroup.userData.stickers[face]._colorLetter=this.selectedColor;
      }
    }
  }

  // ─── Input UI ───
  _buildInputUI(){
    this.uiWrap=document.createElement('div');this.uiWrap.className='cube-ui';

    // Orientation guide strip
    const guide=document.createElement('div');
    guide.style.cssText='display:flex;justify-content:center;align-items:center;gap:6px;padding:8px 16px 6px;background:#f8fafc;flex-wrap:wrap;';
    const guideLabel=document.createElement('span');
    guideLabel.style.cssText='font-size:11px;color:#64748b;font-weight:600;';
    guideLabel.textContent='Orientation: ';
    guide.appendChild(guideLabel);
    [['U','Top'],['F','Front'],['R','Right'],['L','Left'],['D','Bottom'],['B','Back']].forEach(([f,name])=>{
      const chip=document.createElement('span');
      chip.style.cssText=`font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:${this.colorCSS[f]};color:${f==='U'||f==='D'?'#333':'#fff'};border:1px solid rgba(0,0,0,0.15);`;
      chip.textContent=`${f}=${name}`;
      guide.appendChild(chip);
    });
    this.uiWrap.appendChild(guide);

    // Color palette
    const palette=document.createElement('div');palette.className='cube-palette';
    ['U','R','F','D','L','B'].forEach(f=>{
      const btn=document.createElement('button');
      btn.className='pal-btn'+(f==='U'?' active':'');
      btn.style.background=this.colorCSS[f];
      btn.title=this.colorNames[f]+' — '+this.faceLabel[f];
      if(f==='U'||f==='D') btn.style.border='2px solid #ccc';
      btn.onclick=()=>{palette.querySelectorAll('.pal-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');this.selectedColor=f;};
      palette.appendChild(btn);
    });
    this.uiWrap.appendChild(palette);

    // Action buttons
    const actions=document.createElement('div');actions.className='cube-actions';
    const resetBtn=document.createElement('button');resetBtn.textContent='Reset';resetBtn.className='action-btn secondary';resetBtn.onclick=()=>this._resetSolved();actions.appendChild(resetBtn);
    const clearBtn=document.createElement('button');clearBtn.textContent='Clear';clearBtn.className='action-btn secondary';
    clearBtn.onclick=()=>this.cubies.forEach(c=>Object.values(c.userData.stickers).forEach(m=>{m.color.setHex(0x444444);m._colorLetter='?';}));
    actions.appendChild(clearBtn);
    const solveBtn=document.createElement('button');solveBtn.textContent='✨ Solve';solveBtn.className='action-btn primary';solveBtn.onclick=()=>this._handleSolve();actions.appendChild(solveBtn);
    this.uiWrap.appendChild(actions);

    this.statusEl=document.createElement('div');this.statusEl.className='cube-status';
    this.statusEl.textContent='Drag to rotate • Click stickers to paint • Rotate to see all faces';
    this.uiWrap.appendChild(this.statusEl);
    this.container.appendChild(this.uiWrap);
  }

  async _handleSolve(){
    const cubeStr=this._readCubeString();
    console.log('Cube string:', cubeStr);
    if(cubeStr.includes('?')){this.statusEl.textContent='⚠ Please paint all stickers first.';this.statusEl.style.color='#dc2626';return;}
    const counts={};for(const ch of cubeStr) counts[ch]=(counts[ch]||0)+1;
    for(const f of ['U','R','F','D','L','B']){
      if((counts[f]||0)!==9){this.statusEl.textContent=`⚠ Need 9 of each. ${this.colorNames[f]}: ${counts[f]||0}/9`;this.statusEl.style.color='#dc2626';return;}
    }
    this.statusEl.textContent='Solving…';this.statusEl.style.color='#666';
    try{
      const resp=await fetch('/solve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cube:cubeStr})});
      const data=await resp.json();
      console.log('Solution:', data);
      if(data.error){this.statusEl.textContent='⚠ '+data.error;this.statusEl.style.color='#dc2626';}
      else this._enterSolveMode(data.solution);
    }catch(e){this.statusEl.textContent='⚠ Server error.';this.statusEl.style.color='#dc2626';}
  }

  // ─── Solve mode ───
  _enterSolveMode(moves){
    this.mode='solve';this.moves=moves;this.currentStep=0;
    this.uiWrap.innerHTML='';
    this.banner=document.createElement('div');this.banner.className='solve-banner';this.banner.textContent=`${moves.length} moves — press Play`;this.uiWrap.appendChild(this.banner);
    const ctrl=document.createElement('div');ctrl.className='solve-controls';
    const mkBtn=(txt,fn)=>{const b=document.createElement('button');b.textContent=txt;b.className='ctrl-btn';b.onclick=fn;return b;};
    ctrl.appendChild(mkBtn('⏮',()=>this._prev()));
    this.playBtn=mkBtn('▶ Play',()=>this._togglePlay());this.playBtn.classList.add('play-btn');ctrl.appendChild(this.playBtn);
    ctrl.appendChild(mkBtn('⏭',()=>this._next()));
    this.counter=document.createElement('span');this.counter.className='solve-counter';ctrl.appendChild(this.counter);
    this.uiWrap.appendChild(ctrl);
    const backRow=document.createElement('div');backRow.style.cssText='text-align:center;padding:8px;';
    const backBtn=document.createElement('button');backBtn.textContent='← Back to Input';backBtn.className='action-btn secondary';backBtn.style.fontSize='12px';backBtn.onclick=()=>this._backToInput();backRow.appendChild(backBtn);this.uiWrap.appendChild(backRow);
    this._refreshSolveUI();
  }

  _backToInput(){this.isPlaying=false;this.mode='input';this.moves=[];this.currentStep=0;this.uiWrap.remove();this._resetSolved();this._buildInputUI();}

  _refreshSolveUI(){
    this.counter.textContent=`${this.currentStep}/${this.moves.length}`;
    if(this.currentStep===0){this.banner.textContent=`${this.moves.length} moves — press Play`;this.banner.className='solve-banner';}
    else if(this.currentStep<this.moves.length){this.banner.textContent=`Step ${this.currentStep}: ${this.moves[this.currentStep-1]}`;this.banner.className='solve-banner active';}
    else{this.banner.textContent='✅ Cube Solved!';this.banner.className='solve-banner solved';}
  }

  async _togglePlay(){
    if(this.isPlaying){this.isPlaying=false;this.playBtn.textContent='▶ Play';return;}
    this.isPlaying=true;this.playBtn.textContent='⏸';
    while(this.isPlaying&&this.currentStep<this.moves.length){await this._next();if(this.isPlaying)await new Promise(r=>setTimeout(r,350));}
    this.isPlaying=false;this.playBtn.textContent='▶ Play';
  }

  async _next(){if(this.isAnimating||this.currentStep>=this.moves.length)return;const{face,angle}=this._parseMove(this.moves[this.currentStep]);this.currentStep++;this._refreshSolveUI();await this._animateLayer(face,angle);}
  async _prev(){if(this.isAnimating||this.currentStep<=0)return;this.currentStep--;const{face,angle}=this._parseMove(this.moves[this.currentStep]);this._refreshSolveUI();await this._animateLayer(face,-angle);}

  _parseMove(m){const face=m[0];let angle=Math.PI/2;if(m.includes("'"))angle=-Math.PI/2;if(m.includes('2'))angle=Math.PI;return{face,angle};}

  _layerCubies(face){
    const t=0.5;
    return this.cubies.filter(c=>{const p=c.position;switch(face){case'U':return p.y>t;case'D':return p.y<-t;case'R':return p.x>t;case'L':return p.x<-t;case'F':return p.z>t;case'B':return p.z<-t;}});
  }

  _axisVec(f){return new THREE.Vector3(...({U:[0,1,0],D:[0,-1,0],R:[1,0,0],L:[-1,0,0],F:[0,0,1],B:[0,0,-1]}[f]));}

  _animateLayer(face,angle){
    this.isAnimating=true;
    const layer=this._layerCubies(face),axis=this._axisVec(face);
    const pivot=new THREE.Group();this.cubeGroup.add(pivot);
    layer.forEach(c=>{this.cubeGroup.remove(c);pivot.add(c);});
    const dur=450,t0=performance.now();
    return new Promise(res=>{
      const tick=now=>{
        let t=Math.min((now-t0)/dur,1);t=t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
        pivot.setRotationFromAxisAngle(axis.clone().negate(),t*angle);
        if(t<1){requestAnimationFrame(tick);return;}
        layer.forEach(c=>{
          c.applyMatrix4(pivot.matrixWorld);
          c.applyMatrix4(new THREE.Matrix4().copy(this.cubeGroup.matrixWorld).invert());
          pivot.remove(c);this.cubeGroup.add(c);
          c.position.x=Math.round(c.position.x/this.SPACING)*this.SPACING;
          c.position.y=Math.round(c.position.y/this.SPACING)*this.SPACING;
          c.position.z=Math.round(c.position.z/this.SPACING)*this.SPACING;
          c.userData.x=Math.round(c.position.x/this.SPACING);
          c.userData.y=Math.round(c.position.y/this.SPACING);
          c.userData.z=Math.round(c.position.z/this.SPACING);
        });
        this.cubeGroup.remove(pivot);this.isAnimating=false;res();
      };
      requestAnimationFrame(tick);
    });
  }

  _loop(){
    const tick=()=>{
      requestAnimationFrame(tick);
      this.orbitGroup.rotation.x=this.orbit.x;
      this.orbitGroup.rotation.y=this.orbit.y;
      if(this._faceLabels) this._updateLabels();
      this.renderer.render(this.scene,this.camera);
    };tick();
  }
}
