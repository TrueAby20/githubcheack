 (function () {
     try {
     const canvas = document.getElementById('gameCanvas');
     const ctx = canvas.getContext('2d');
     console.log('space game init', {width: canvas.width, height: canvas.height, hasCtx: !!ctx});
    const keys = {};

    const player = { x: canvas.width/2 - 15, y: canvas.height - 40, w:30, h:30, speed:5 };
    const bullets = [];
    const enemies = [];
    let boss = null;
    const bossBullets = [];
    let bossCooldownFrame = 0; // frame number before which boss cannot spawn
    // feature flags / settings
    let audioEnabled = true;
    let spritesEnabled = true;
    let spawnInterval = 60; // frames between enemy spawns (difficulty)
    let enemySpeedMultiplier = 1;
    // audio
    let audioCtx = null;
    function ensureAudio() {
        if (!audioCtx) {
            try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
        }
    }
    function playBeep(freq, duration, type='sine') {
        if (!audioEnabled) return;
        ensureAudio();
        if (!audioCtx) return;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = type;
        o.frequency.value = freq;
        o.connect(g);
        g.connect(audioCtx.destination);
        g.gain.setValueAtTime(0.001, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration/1000);
        o.stop(audioCtx.currentTime + duration/1000 + 0.02);
    }
    // sprites (SVG dataURLs)
    let playerImg = new Image();
    let enemyImg = new Image();
    let spritesLoaded = false;
    function loadSprites() {
        const playerSVG = `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><polygon points='30,0 0,60 60,60' fill='%236aff6a' stroke='%23000000' stroke-width='2'/><rect x='26' y='22' width='8' height='8' rx='2' fill='black' /></svg>`;
        const enemySVG = `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><path d='M30,60 L10,20 L50,20 Z' fill='%23ff7b7b' stroke='%23000000' stroke-width='2'/></svg>`;
        playerImg.onload = () => { if (enemyImg.complete) spritesLoaded = true; };
        enemyImg.onload = () => { if (playerImg.complete) spritesLoaded = true; };
        playerImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(playerSVG);
        enemyImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(enemySVG);
    }
    loadSprites();
    let frames = 0;
    let score = 0;
    let gameOver = false;

    // draw a more detailed player ship using canvas paths and gradients
    function drawPlayerShip(p) {
        const cx = p.x + p.w/2;
        const cy = p.y + p.h/2;

        // body gradient
        const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
        grad.addColorStop(0, '#6aff6a');
        grad.addColorStop(1, '#00b300');

        ctx.save();
        ctx.translate(0,0);

        // main hull (rounded triangle-like)
        ctx.beginPath();
        ctx.moveTo(cx, p.y); // nose
        ctx.quadraticCurveTo(p.x, p.y + p.h*0.25, p.x + p.w*0.15, p.y + p.h*0.9);
        ctx.lineTo(p.x + p.w*0.85, p.y + p.h*0.9);
        ctx.quadraticCurveTo(p.x + p.w, p.y + p.h*0.25, cx, p.y);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // left wing
        ctx.beginPath();
        ctx.moveTo(p.x + p.w*0.15, p.y + p.h*0.9);
        ctx.lineTo(p.x - p.w*0.25, p.y + p.h*0.6);
        ctx.lineTo(p.x + p.w*0.15, p.y + p.h*0.6);
        ctx.closePath();
        ctx.fillStyle = '#44cc44';
        ctx.fill();

        // right wing
        ctx.beginPath();
        ctx.moveTo(p.x + p.w*0.85, p.y + p.h*0.9);
        ctx.lineTo(p.x + p.w + p.w*0.25, p.y + p.h*0.6);
        ctx.lineTo(p.x + p.w*0.85, p.y + p.h*0.6);
        ctx.closePath();
        ctx.fillStyle = '#44cc44';
        ctx.fill();

        // cockpit
        ctx.beginPath();
        ctx.ellipse(cx, p.y + p.h*0.45, p.w*0.18, p.h*0.12, 0, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fill();

        // engine glow
        const glow = ctx.createRadialGradient(cx, p.y + p.h*0.95, 0, cx, p.y + p.h*0.95, p.w);
        glow.addColorStop(0, 'rgba(255,165,0,0.9)');
        glow.addColorStop(1, 'rgba(255,165,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(cx, p.y + p.h*1.02, p.w*0.5, p.h*0.3, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    }

    // draw a stylized enemy ship
    function drawEnemyShip(e) {
        const cx = e.x + e.w/2;
        // body gradient
        const grad = ctx.createLinearGradient(e.x, e.y, e.x + e.w, e.y + e.h);
        grad.addColorStop(0, '#ff7b7b');
        grad.addColorStop(1, '#b30000');

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, e.y + e.h); // nose downward
        ctx.quadraticCurveTo(e.x + e.w, e.y + e.h*0.75, e.x + e.w*0.85, e.y + e.h*0.1);
        ctx.lineTo(e.x + e.w*0.15, e.y + e.h*0.1);
        ctx.quadraticCurveTo(e.x, e.y + e.h*0.75, cx, e.y + e.h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // enemy eye / cockpit
        ctx.beginPath();
        ctx.ellipse(cx, e.y + e.h*0.5, e.w*0.12, e.h*0.08, 0, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fill();
        ctx.restore();
    }

    function drawBullet(b) {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(b.x, b.y, b.w, b.h);
    }

    function updateScore() {
        const el = document.getElementById('scoreLabel');
        if (el) el.textContent = 'Score: ' + score;
    }

    function update() {
        if (gameOver) {
            handleGameOver();
            return;
        }

        frames++;
        // spawn boss when score threshold reached and cooldown passed
        if (!boss && score >= 100 && frames > bossCooldownFrame) {
            spawnBoss();
        }
        // move player
        if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
        if (keys['ArrowRight'] && player.x + player.w < canvas.width) player.x += player.speed;
        // fire
        if (keys[' '] && frames % 10 === 0) {
            bullets.push({ x: player.x + player.w/2 - 2, y: player.y, w:4, h:10, speed:7 });
        }
        // update bullets
        bullets.forEach((b, i) => {
            b.y -= b.speed;
            if (b.y < 0) bullets.splice(i, 1);
        });
        // spawn enemies (pause while boss active)
        if (!boss && frames % spawnInterval === 0) {
            enemies.push({ x: Math.random() * (canvas.width - 30), y: -30, w:30, h:30, speed:2 * enemySpeedMultiplier });
        }
        // move enemies
        enemies.forEach((e, i) => {
            e.y += e.speed;
            if (e.y > canvas.height) enemies.splice(i, 1);
        });
        // update boss and its bullets if present
        if (boss) {
            updateBoss();
            bossBullets.forEach((bb, idx) => {
                bb.y += bb.speed;
                if (bb.y > canvas.height) bossBullets.splice(idx, 1);
                // check collision with player
                if (bb.x < player.x + player.w && bb.x + bb.w > player.x && bb.y < player.y + player.h && bb.y + bb.h > player.y) {
                    gameOver = true;
                }
            });
        }
        // collisions
        enemies.forEach((e, ei) => {
            // check for player collision: game over
            if (player.x < e.x + e.w && player.x + player.w > e.x && player.y < e.y + e.h && player.y + player.h > e.y) {
                gameOver = true;
            }
            // simple box collision for bullets
            bullets.forEach((b, bi) => {
                if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
                    enemies.splice(ei, 1);
                    bullets.splice(bi, 1);
                    score += 10;
                    updateScore();
                }
            });
        });

        // bullets vs boss collision
        if (boss) {
            bullets.forEach((b, bi) => {
                if (!boss) return; // boss may be set to null during iteration
                if (b.x < boss.x + boss.w && b.x + b.w > boss.x && b.y < boss.y + boss.h && b.y + b.h > boss.y) {
                    bullets.splice(bi, 1);
                    boss.health -= 5; // damage per hit
                    if (boss.health <= 0) {
                        // boss defeated
                        boss = null;
                        score += 200;
                        updateScore();
                        bossBullets.length = 0;
                        // set cooldown (e.g., 10 seconds at ~60fps -> 600 frames)
                        bossCooldownFrame = frames + 600;
                    }
                }
            });
        }

        draw();
        requestAnimationFrame(update);
    }

    function handleGameOver() {
        const name = prompt('Game over! Enter your name for the leaderboard:', 'Player');
        if (name !== null) {
            saveScore(name || 'Player', score);
        }
        showLeaderboard();
    }

    // boss functions
    function spawnBoss() {
        boss = { x: canvas.width/2 - 60, y: 40, w:120, h:60, health: 100, dir: 1, speed: 1.2, shootTimer: 0 };
    }

    function updateBoss() {
        if (!boss) return;
        boss.x += boss.dir * boss.speed;
        if (boss.x < 10) { boss.x = 10; boss.dir = 1; }
        if (boss.x + boss.w > canvas.width - 10) { boss.x = canvas.width - boss.w - 10; boss.dir = -1; }
        boss.shootTimer++;
        if (boss.shootTimer > 40) {
            // shoot a spread of bullets
            bossBullets.push({ x: boss.x + boss.w*0.25, y: boss.y + boss.h, w:6, h:10, speed:3 });
            bossBullets.push({ x: boss.x + boss.w*0.5, y: boss.y + boss.h, w:6, h:10, speed:3 });
            bossBullets.push({ x: boss.x + boss.w*0.75, y: boss.y + boss.h, w:6, h:10, speed:3 });
            boss.shootTimer = 0;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // background stars
        ctx.fillStyle = '#001';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // draw stars (simple, low-cost)
        ctx.fillStyle = 'white';
        for (let i = 0; i < 20; i++) {
            const sx = (i * 37) % canvas.width;
            const sy = (i * 53 + frames) % canvas.height;
            ctx.fillRect(sx, sy, 1, 1);
        }

        // draw player (sprite or vector)
        if (spritesEnabled && spritesLoaded) {
            try { ctx.drawImage(playerImg, player.x, player.y, player.w, player.h); } catch(e) { drawPlayerShip(player); }
        } else {
            drawPlayerShip(player);
        }
        bullets.forEach(b => drawBullet(b));
        enemies.forEach(e => {
            if (spritesEnabled && spritesLoaded) {
                try { ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h); } catch(e) { drawEnemyShip(e); }
            } else {
                drawEnemyShip(e);
            }
        });
        // draw boss and its bullets
        if (boss) {
            drawBoss(boss);
            bossBullets.forEach(bb => drawBossBullet(bb));
            // boss health bar
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(boss.x, boss.y - 12, boss.w, 8);
            ctx.fillStyle = 'lime';
            const hpWidth = Math.max(0, (boss.health / 100) * boss.w);
            ctx.fillRect(boss.x, boss.y - 12, hpWidth, 8);
        }

        // debug overlay / score
        ctx.fillStyle = 'white';
        ctx.font = '16px sans-serif';
        ctx.fillText('Score: ' + score, 10, 20);
    }

    function drawBoss(b) {
        // stylized boss shape
        ctx.save();
        const cx = b.x + b.w/2;
        ctx.translate(0,0);
        const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
        grad.addColorStop(0, '#ffaa00');
        grad.addColorStop(1, '#aa4400');
        ctx.beginPath();
        ctx.moveTo(cx, b.y);
        ctx.lineTo(b.x + b.w*0.9, b.y + b.h*0.3);
        ctx.lineTo(b.x + b.w, b.y + b.h*0.6);
        ctx.lineTo(b.x + b.w*0.6, b.y + b.h);
        ctx.lineTo(b.x + b.w*0.4, b.y + b.h);
        ctx.lineTo(b.x, b.y + b.h*0.6);
        ctx.lineTo(b.x + b.w*0.1, b.y + b.h*0.3);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        // windows
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(b.x + b.w*0.25, b.y + b.h*0.35, b.w*0.12, b.h*0.15);
        ctx.fillRect(b.x + b.w*0.55, b.y + b.h*0.35, b.w*0.12, b.h*0.15);
        ctx.restore();
    }

    function drawBossBullet(bb) {
        ctx.fillStyle = 'orange';
        ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    }

    // wire UI controls if present
    try {
        const diff = document.getElementById('difficulty');
        const soundToggle = document.getElementById('soundToggle');
        const spriteToggle = document.getElementById('spriteToggle');
        const shareBtn = document.getElementById('shareBtn');
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const shootBtn = document.getElementById('shootBtn');
        if (diff) {
            function applyDifficulty() {
                const v = diff.value;
                if (v === 'easy') { spawnInterval = 90; enemySpeedMultiplier = 0.8; }
                else if (v === 'normal') { spawnInterval = 60; enemySpeedMultiplier = 1; }
                else { spawnInterval = 40; enemySpeedMultiplier = 1.5; }
            }
            diff.addEventListener('change', applyDifficulty);
            applyDifficulty();
        }
        if (soundToggle) {
            soundToggle.checked = audioEnabled;
            soundToggle.addEventListener('change', ()=>{ audioEnabled = !!soundToggle.checked; if (audioEnabled) ensureAudio(); });
        }
        if (spriteToggle) {
            spriteToggle.checked = spritesEnabled;
            spriteToggle.addEventListener('change', ()=>{ spritesEnabled = !!spriteToggle.checked; });
        }
        if (shareBtn) {
            shareBtn.addEventListener('click', ()=>{
                const raw = localStorage.getItem('space_leaderboard') || '[]';
                navigator.clipboard?.writeText(raw).then(()=>{ alert('Leaderboard copied to clipboard'); }).catch(()=>{});
                const a = document.createElement('a');
                const blob = new Blob([raw], {type:'application/json'});
                a.href = URL.createObjectURL(blob);
                a.download = 'leaderboard.json';
                a.click();
                URL.revokeObjectURL(a.href);
            });
        }
        // touch controls
        function bindTouch(btn, key) {
            if (!btn) return;
            btn.addEventListener('pointerdown', (e)=>{ e.preventDefault(); keys[key]=true; });
            btn.addEventListener('pointerup', (e)=>{ e.preventDefault(); keys[key]=false; });
            btn.addEventListener('pointerleave', (e)=>{ e.preventDefault(); keys[key]=false; });
        }
        bindTouch(leftBtn, 'ArrowLeft');
        bindTouch(rightBtn, 'ArrowRight');
        bindTouch(shootBtn, ' ');
    } catch (err) { console.warn('UI wiring skipped', err); }

    window.addEventListener('keydown', e => { keys[e.key] = true; });
    window.addEventListener('keyup', e => { keys[e.key] = false; });

    updateScore();
    update();

    // leaderboard helpers
    function getLeaderboard() {
        const raw = localStorage.getItem('space_leaderboard');
        return raw ? JSON.parse(raw) : [];
    }
    function saveScore(name, score) {
        const board = getLeaderboard();
        board.push({ name, score });
        board.sort((a, b) => b.score - a.score);
        while (board.length > 5) board.pop();
        localStorage.setItem('space_leaderboard', JSON.stringify(board));
    }
    function showLeaderboard() {
        const board = getLeaderboard();
        const list = document.getElementById('leaderList');
        list.innerHTML = '';
        board.forEach(entry => {
            const li = document.createElement('li');
            li.textContent = `${entry.name}: ${entry.score}`;
            list.appendChild(li);
        });
        document.getElementById('leaderboard').hidden = false;
    }

    } catch (err) {
        console.error('Game initialization error', err);
        alert('Game initialization error — check console for details');
    }
})();