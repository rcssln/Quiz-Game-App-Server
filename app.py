from flask import Flask, render_template, jsonify, request
import json

games = {}  # store active game room, such as the names of the players and their score

app = Flask(__name__)

def load_questions():
    with open('questions.json') as f:
        return json.load(f)

def load_leaderboard():
    with open('leaderboard.json') as f:
        return json.load(f)

def save_leaderboard(data):
    with open('leaderboard.json', 'w') as f:
        json.dump(data, f)

@app.route('/create', methods=['POST'])
def create_game():
    data = request.json
    name = data['name']

    room = "1234"  #fixed room, for demo lang haha hassle ag type random code

    # Always reset the game state so Try Again starts fresh
    games[room] = {
        "players": [name],
        "scores": [0, 0],
        "current": 0,
        "turn": 0
    }

    return jsonify({"room": room})

@app.route('/join', methods=['POST'])
def join_game():
    data = request.json
    name = data['name']

    room = "1234"

    if room not in games:
        games[room] = {
            "players": [],
            "scores": [0, 0],
            "current": 0,
            "turn": 0
        }

    if len(games[room]["players"]) < 2:
        games[room]["players"].append(name)

    return jsonify({"message": "Joined room 1234"})

@app.route('/state/<room>') # dynamic route
def get_state(room):
    game = games.get(room, {})

    if not game:
        return jsonify({})
    
    questions = load_questions()
    result = dict(game) # copies the game data
    result['gameOver'] = game.get('current', 0) >= len(questions) # check if the game is finished
    return jsonify(result)

@app.route('/answer', methods=['POST'])
def answer():
    data = request.json
    room = data['room']
    choice = data['choice']
    player = data['player']

    game = games[room]
    questions = load_questions()

    # GAME OVER CHECK (BEFORE DOING ANYTHING)
    if game["current"] >= len(questions): # check if no more questions
        return jsonify({
            "gameOver": True,
            "game": game
        })

    # check if wrong player answers
    if game["players"][game["turn"]] != player:
        return jsonify({"error": "Not your turn", "game": game})

    current_q = questions[game["current"]] # get the current question

    if choice == current_q["answer"]:
        game["scores"][game["turn"]] += 1 # if the answer is correct +1

    # move to the next question
    game["current"] += 1
    game["turn"] = (game["turn"] + 1) % 2 # swtich player

    # same as line 80
    if game["current"] >= len(questions):
        return jsonify({
            "gameOver": True,
            "game": game
        })

    return jsonify(game)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/questions')
def get_questions():
    return jsonify(load_questions())

@app.route('/submit', methods=['POST'])
def submit_score():
    data = request.json

    leaderboard = load_leaderboard()
    leaderboard.append(data)

    # Sort highest score first
    leaderboard = sorted(leaderboard, key=lambda x: x['score'], reverse=True)

    save_leaderboard(leaderboard)

    return jsonify({"message": "Score saved!"})

@app.route('/leaderboard/<room>')
def leaderboard(room):
    game = games.get(room)

    if not game:
        return jsonify([])

    players = game["players"]
    scores = game["scores"]

    result = []

    for i in range(len(players)):
        result.append({
            "name": players[i],
            "score": scores[i]
        })

    result = sorted(result, key=lambda x: x["score"], reverse=True)

    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)