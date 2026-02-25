 (function () {
     try {
     const canvas = document.getElementById('gameCanvas');
     const ctx = canvas.getContext('2d');
     console.log('space game init', {width: canvas.width, height: canvas.height, hasCtx: !!ctx});
    const keys = {};

    const player = { x: canvas.width/2 - 15, y: canvas.height - 40, w:30, h:30, speed:5 };
    const bullets = [];
    const enemies = [];
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
        // spawn enemies
        if (frames % 60 === 0) {
            enemies.push({ x: Math.random() * (canvas.width - 30), y: -30, w:30, h:30, speed:2 });
        }
        // move enemies
        enemies.forEach((e, i) => {
            e.y += e.speed;
            if (e.y > canvas.height) enemies.splice(i, 1);
        });
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

        drawPlayerShip(player);
        bullets.forEach(b => drawBullet(b));
        enemies.forEach(e => drawEnemyShip(e));

        // debug overlay / score
        ctx.fillStyle = 'white';
        ctx.font = '16px sans-serif';
        ctx.fillText('Score: ' + score, 10, 20);
    }

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
(function(){
    // basic 3D shooter using Three.js
    const container = document.getElementById('gameContainer');
    const keys = {};
    let score = 0;
    let gameOver = false;

    let scene, camera, renderer;
    try {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, 400/600, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(400,600);
        container.appendChild(renderer.domElement);
    } catch (err) {
        console.error('Three.js initialization failed', err);
        const warning = document.getElementById('webgl-warning');
        if (warning) warning.style.display = 'block';
        return; // don't continue if renderer not created
    }

        if (!renderer.getContext()) {
            const warning = document.getElementById('webgl-warning');
            if (warning) warning.style.display = 'block';
        }
    })();