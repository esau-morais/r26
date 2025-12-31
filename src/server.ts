import { Database } from "bun:sqlite";
import type {
	GameType,
	LeaderboardEntry,
	Player,
	Score,
	WSMessage,
} from "./types";

const db = new Database("./data/scores.db", { create: true });

const lastScoreTime = new Map<string, number>();

function validateScore(score: Score): string | null {
	if (score.game === "reaction") {
		if (score.score < 50) return "Reaction time too fast";
		if (score.score > 5000) return "Reaction time too slow";
	}
	if (score.game === "typing") {
		if (score.score < 0) return "Invalid typing score";
		if (score.score > 300) return "WPM too high";
	}
	if (score.game === "pattern") {
		if (score.score < 0) return "Invalid pattern score";
		if (score.score > 200) return "Pattern score too high";
	}

	const lastTime = lastScoreTime.get(`${score.playerId}:${score.game}`);
	if (lastTime && Date.now() - lastTime < 5000) {
		return "Rate limited - wait 5s between scores";
	}

	return null;
}

function recordScoreTime(score: Score): void {
	lastScoreTime.set(`${score.playerId}:${score.game}`, Date.now());
}

db.run(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    game TEXT NOT NULL,
    score INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
  )
`);
db.run(`CREATE INDEX IF NOT EXISTS idx_player ON scores(player_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_game ON scores(game)`);

const insertScore = db.prepare<Score, [string, string, string, number, number]>(
	"INSERT INTO scores (player_id, player_name, game, score, timestamp) VALUES (?, ?, ?, ?, ?)",
);

const getScoresStmt = db.prepare<
	{ player_id: string; player_name: string; game: string; score: number },
	[]
>(
	"SELECT player_id, player_name, game, score FROM scores ORDER BY timestamp DESC LIMIT 500",
);

const getRecentStmt = db.prepare<
	{
		player_id: string;
		player_name: string;
		game: string;
		score: number;
		timestamp: number;
	},
	[]
>(
	"SELECT player_id, player_name, game, score, timestamp FROM scores ORDER BY timestamp DESC LIMIT 50",
);

function saveScoreDB(score: Score): void {
	insertScore.run(
		score.playerId,
		score.playerName,
		score.game,
		score.score,
		score.timestamp,
	);
}

function getLeaderboardDB(filterGame?: GameType): LeaderboardEntry[] {
	const rows = getScoresStmt.all();
	const playerMap = new Map<string, LeaderboardEntry>();

	for (const row of rows) {
		if (filterGame && row.game !== filterGame) continue;

		let entry = playerMap.get(row.player_id);
		if (!entry) {
			entry = {
				playerId: row.player_id,
				playerName: row.player_name,
				totalScore: 0,
				games: [],
			};
			playerMap.set(row.player_id, entry);
		}

		const game = row.game as GameType;
		const existing = entry.games.find((g) => g.game === game);
		if (existing) {
			if (game === "reaction") {
				if (row.score < existing.score) existing.score = row.score;
			} else {
				if (row.score > existing.score) existing.score = row.score;
			}
		} else {
			entry.games.push({ game, score: row.score });
		}
	}

	for (const entry of playerMap.values()) {
		entry.totalScore = entry.games.reduce((sum, g) => {
			const weight = g.game === "reaction" ? 2 : g.game === "typing" ? 3 : 2.5;
			const normalized =
				g.game === "reaction" ? Math.max(0, 500 - g.score) : g.score;
			return sum + normalized * weight;
		}, 0);
	}

	return Array.from(playerMap.values())
		.sort((a, b) => b.totalScore - a.totalScore)
		.slice(0, 20);
}

function getRecentScores(): Score[] {
	return getRecentStmt.all().map((row) => ({
		playerId: row.player_id,
		playerName: row.player_name,
		game: row.game as GameType,
		score: row.score,
		timestamp: row.timestamp,
	}));
}

const players = new Map<string, Player>();

const PORT = Number(process.env.PORT) || 3026;
const HOST = process.env.FLY_APP_NAME
	? `${process.env.FLY_APP_NAME}.fly.dev`
	: `localhost:${PORT}`;
const WS_PROTOCOL = process.env.FLY_APP_NAME ? "wss" : "ws";

const server = Bun.serve({
	port: PORT,
	async fetch(req, server) {
		const url = new URL(req.url);

		if (url.pathname === "/health") {
			return new Response(`r26 ws server - ${WS_PROTOCOL}://${HOST}`);
		}

		if (url.pathname === "/leaderboard") {
			const game = url.searchParams.get("game") as GameType | undefined;
			return Response.json(getLeaderboardDB(game || undefined));
		}

		if (url.pathname === "/scores") {
			if (req.method === "POST") {
				const score = (await req.json()) as Score;
				const error = validateScore(score);
				if (error) {
					return Response.json({ ok: false, error }, { status: 400 });
				}
				recordScoreTime(score);
				saveScoreDB(score);
				server.publish("lobby", JSON.stringify({ type: "score", score }));
				const leaderboard = getLeaderboardDB();
				server.publish(
					"lobby",
					JSON.stringify({ type: "leaderboard", entries: leaderboard }),
				);
				return Response.json({ ok: true });
			}
			return Response.json(getRecentScores());
		}

		const name = url.searchParams.get("name") || "anon";
		const id = url.searchParams.get("id") || crypto.randomUUID();

		const upgraded = server.upgrade(req, {
			data: { player: { id, name } },
		});
		if (upgraded) return undefined;

		return new Response(`r26 ws server - ${WS_PROTOCOL}://${HOST}`);
	},
	websocket: {
		open(ws) {
			const { player } = ws.data as { player: Player };
			players.set(player.id, player);
			ws.subscribe("lobby");

			const joinMsg: WSMessage = { type: "join", player };
			server.publish("lobby", JSON.stringify(joinMsg));

			const playersMsg: WSMessage = {
				type: "players",
				players: Array.from(players.values()),
			};
			ws.send(JSON.stringify(playersMsg));

			const scores = getRecentScores();
			if (scores.length > 0) {
				const scoresMsg: WSMessage = { type: "scores", scores };
				ws.send(JSON.stringify(scoresMsg));
			}

			const leaderboard = getLeaderboardDB();
			const lbMsg: WSMessage = { type: "leaderboard", entries: leaderboard };
			ws.send(JSON.stringify(lbMsg));
		},
		message(_ws, message) {
			const msg = JSON.parse(String(message)) as WSMessage;

			if (msg.type === "score") {
				const error = validateScore(msg.score);
				if (error) return;
				recordScoreTime(msg.score);
				saveScoreDB(msg.score);
				server.publish("lobby", String(message));

				const leaderboard = getLeaderboardDB();
				const lbMsg: WSMessage = { type: "leaderboard", entries: leaderboard };
				server.publish("lobby", JSON.stringify(lbMsg));
			} else if (msg.type === "playing") {
				server.publish("lobby", String(message));
			}
		},
		close(ws) {
			const { player } = ws.data as { player: Player };
			players.delete(player.id);
			ws.unsubscribe("lobby");

			const leaveMsg: WSMessage = { type: "leave", playerId: player.id };
			server.publish("lobby", JSON.stringify(leaveMsg));
		},
	},
});

console.log(`r26 server running on ${WS_PROTOCOL}://${HOST}`);
