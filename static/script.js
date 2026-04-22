let questions = [];
let current = 0;
let currentPlayer = 0;
let players = [];
let scores = [0, 0];
let room = "";
let playerName = "";
let lastQuestionIndex = -1;

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

function endGame() {
    let p1 = players[0];
    let p2 = players[1];

    document.getElementById('quiz').innerHTML = `
        <h2>Game Over</h2>
        <p>${p1}: ${scores[0]}</p>
        <p>${p2}: ${scores[1]}</p>
    `;

    // Save BOTH players
    fetch('/submit', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: p1, score: scores[0] })
    });

    fetch('/submit', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: p2, score: scores[1] })
    }).then(() => loadLeaderboard());
}

function loadLeaderboard() {
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

            html += `<li>${rank} - ${p.name}: ${p.score}</li>`;
        });

        document.getElementById("leaderboard").innerHTML = html;
    });
}

function updateUI(data) {
    if (!data) return;
    
    if (data.gameOver) {
        document.getElementById("waitingScreen").style.display = "none";
        document.getElementById("game").style.display = "block";
        
        document.getElementById("turn").style.display = "none"; 

        document.getElementById("quiz").innerHTML = `
            <h2>Game Over</h2>
            <p>${data.game.players[0]}: ${data.game.scores[0]}</p>
            <p>${data.game.players[1]}: ${data.game.scores[1]}</p>
        `;
        
        return;
    }

    const players = data.players || [];

    if (players.length < 2) {
        document.getElementById("waitingScreen").style.display = "block";
        document.getElementById("game").style.display = "none";
        return;
    } 

    document.getElementById("waitingScreen").style.display = "none";
    document.getElementById("game").style.display = "block";

    if (!data.gameOver) {
        document.getElementById("turn").style.display = "block";
        document.getElementById("turn").innerText =
            "Turn: " + players[data.turn];
    }

    loadLeaderboard();
    renderQuestion(data);
}

function renderQuestion(data) {
    fetch('/questions')
    .then(res => res.json())
    .then(questions => {

        let q = questions[data.current];

        if (!q) {
            document.getElementById("quiz").innerHTML =
                "<h2>Game Over</h2>";
                
            document.getElementById("turn").style.display = "none"; 
            
            return;
        }

        let html = `<h3>${q.question}</h3>`;

        q.choices.forEach(choice => {
            html += `<button onclick="answer('${choice}')">${choice}</button>`;
        });

        document.getElementById("quiz").innerHTML = html;
    });
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