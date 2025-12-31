import type { GameType, LeaderboardEntry, Score } from "../types";

const EVENT_END = new Date("2026-01-01T12:00:00Z").getTime();

export function isEventOver(): boolean {
	return Date.now() >= EVENT_END;
}

export function validateScore(score: Score): string | null {
	if (isEventOver()) return "Event ended";
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
	return null;
}

export function calculateTotalScore(
	games: { game: GameType; score: number }[],
): number {
	return games.reduce((sum, g) => {
		const weight = g.game === "reaction" ? 2 : g.game === "typing" ? 3 : 2.5;
		const normalized =
			g.game === "reaction" ? Math.max(0, 500 - g.score) : g.score;
		return sum + normalized * weight;
	}, 0);
}

type ScoreRow = {
	player_id: string;
	player_name: string;
	game: string;
	score: number;
};

export function buildLeaderboard(
	rows: ScoreRow[],
	filterGame?: GameType,
): LeaderboardEntry[] {
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
		entry.totalScore = calculateTotalScore(entry.games);
	}

	return Array.from(playerMap.values())
		.sort((a, b) => b.totalScore - a.totalScore)
		.slice(0, 20);
}
