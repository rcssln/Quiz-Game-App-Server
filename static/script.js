let questions = [];
let current = 0;
let currentPlayer = 0;
let players = [];
let scores = [0, 0];
let room = "";
let playerName = "";

function createGame() {
    let name = document.getElementById('name').value.trim();

    if (!name) {
        alert("Please enter your name first");
        return;
    }

    playerName = name;

    fetch('/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: playerName })
    })
    .then(res => res.json())
    .then(data => {
    room = data.room;

    document.getElementById('menu').style.display = "none";
    document.getElementById('waitingScreen').style.display = "block";

    document.getElementById('waitingRoom').innerText =
        "Room: " + room + " (waiting for player 2)";

    startPolling();
});
}

function joinGame() {
    let name = document.getElementById('name').value.trim();

    if (!name) {
        alert("Please enter your name first");
        return;
    }

    playerName = name;
    room = "1234";

    fetch('/join', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: playerName })
    })
    .then(() => {
        startPolling();

        document.getElementById('menu').style.display = "none";
        document.getElementById('game').style.display = "block";

        document.getElementById('roomCode').innerText = "Room: 1234";
    });
}

function startGame() {
    players[0] = document.getElementById('player1').value;
    players[1] = document.getElementById('player2').value;

    fetch('/questions')
    .then(res => res.json())
    .then(data => {
        questions = data;
        showQuestion();
    });
}

function showQuestion() {
    let q = questions[current];

    let html = `<h3>${q.question}</h3>`;
    html += `<p>Turn: ${players[currentPlayer]}</p>`;

    q.choices.forEach(choice => {
        html += `<button onclick="answer('${choice}')">${choice}</button>`;
    });

    document.getElementById('quiz').innerHTML = html;
}

function answer(choice) {
    fetch('/answer', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            room,
            choice,
            player: playerName
        })
    })
    .then(res => res.json())
    .then(data => {
        updateUI(data);
    });
}

function nextQuestion() {
    current++;

    if (current < questions.length) {
        showQuestion();
    } else {
        endGame();
    }
}

function loadLeaderboard(callback) {
    if (!room) return;

    fetch('/leaderboard/' + room)
    .then(res => res.json())
    .then(data => {

        let html = "";

        data.forEach((p, index) => {
            let rank = "";

            if (index === 0) rank = "1st";
            else if (index === 1) rank = "2nd";
            else rank = "#" + (index + 1);

            html += `${rank} - ${p.name}: ${p.score} <br>`;
        });

        document.getElementById("leaderboard").innerHTML = html;

        if (typeof callback === "function") callback();
    });
}

function updateUI(data) {
    if (!data) return;

    const players = data.players || [];

    if (players.length < 2) {
        document.getElementById("waitingScreen").style.display = "block";
        document.getElementById("game").style.display = "none";
        return;
    }

    document.getElementById("waitingScreen").style.display = "none";
    document.getElementById("game").style.display = "block";

    if (data.gameOver) {
        document.getElementById("turn").style.display = "none";
        document.getElementById("quiz").innerHTML = "<h2>Game Over</h2>";

        loadLeaderboard(function() {
            if (!document.getElementById("tryAgainBtn")) {
                let leaderboardEl = document.getElementById("leaderboard");
                let btn = document.createElement("button");
                btn.id = "tryAgainBtn";
                btn.innerText = "Try Again";
                btn.onclick = resetGame;
                leaderboardEl.insertAdjacentElement("afterend", btn);
            }
        });
    } else {
        document.getElementById("turn").style.display = "block";
        document.getElementById("turn").innerText =
            "Turn: " + players[data.turn];

        loadLeaderboard();
        renderQuestion(data);
    }
}

function renderQuestion(data) {
    fetch('/questions')
    .then(res => res.json())
    .then(questions => {
        let q = questions[data.current];

        if (!q) return;

        let html = `<h3>${q.question}</h3>`;

        q.choices.forEach(choice => {
            html += `<button onclick="answer('${choice}')">${choice}</button>`;
        });

        document.getElementById("quiz").innerHTML = html;
    });
}

function resetGame() {
    // Reset all client-side state
    questions = [];
    current = 0;
    currentPlayer = 0;
    players = [];
    scores = [0, 0];
    room = "";
    playerName = "";

    // Clear name input
    let nameInput = document.getElementById('name');
    if (nameInput) nameInput.value = "";

    // Remove Try Again button if it exists
    let btn = document.getElementById("tryAgainBtn");
    if (btn) btn.remove();

    // Clear leaderboard
    let leaderboardEl = document.getElementById("leaderboard");
    if (leaderboardEl) leaderboardEl.innerHTML = "";

    // Clear quiz area
    let quizEl = document.getElementById("quiz");
    if (quizEl) quizEl.innerHTML = "";

    // Hide turn indicator
    let turnEl = document.getElementById("turn");
    if (turnEl) turnEl.style.display = "none";

    // Show menu, hide game and waiting screens
    document.getElementById("menu").style.display = "block";
    document.getElementById("game").style.display = "none";
    document.getElementById("waitingScreen").style.display = "none";
}

function startPolling() {
    setInterval(() => {
        if (!room) return;

        fetch('/state/' + room)
        .then(res => res.json())
        .then(data => {
            console.log("Game state:", data);
            updateUI(data);
        })
        .catch(err => console.error(err));
    }, 1000);
}