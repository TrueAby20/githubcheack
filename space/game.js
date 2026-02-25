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

    // draw a triangular player ship pointing up
    function drawPlayerShip(p) {
        ctx.fillStyle = 'lime';
        ctx.beginPath();
        ctx.moveTo(p.x + p.w/2, p.y); // tip
        ctx.lineTo(p.x, p.y + p.h); // bottom left
        ctx.lineTo(p.x + p.w, p.y + p.h); // bottom right
        ctx.closePath();
        ctx.fill();
        // small cockpit
        ctx.fillStyle = 'black';
        ctx.fillRect(p.x + p.w/2 - 3, p.y + p.h/3, 6, 6);
    }

    // draw an inverted triangular enemy ship pointing down
    function drawEnemyShip(e) {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.moveTo(e.x + e.w/2, e.y + e.h); // tip (bottom)
        ctx.lineTo(e.x, e.y); // top left
        ctx.lineTo(e.x + e.w, e.y); // top right
        ctx.closePath();
        ctx.fill();
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