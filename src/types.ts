export type GameType = "reaction" | "typing" | "pattern";

export type Player = {
	id: string;
	name: string;
};

export type Score = {
	playerId: string;
	playerName: string;
	game: GameType;
	score: number;
	timestamp: number;
};

export type LeaderboardEntry = {
	playerId: string;
	playerName: string;
	totalScore: number;
	games: { game: GameType; score: number }[];
};

export type GameState = "idle" | "countdown" | "playing" | "result";

export type Screen = "menu" | "game" | "leaderboard" | "stats" | "fireworks";

export type AppState = {
	player: Player;
	screen: Screen;
	currentGame: GameType | null;
};

export type WSMessage =
	| { type: "join"; player: Player }
	| { type: "leave"; playerId: string }
	| { type: "score"; score: Score }
	| { type: "playing"; player: Player; game: GameType }
	| { type: "players"; players: Player[] }
	| { type: "scores"; scores: Score[] }
	| { type: "leaderboard"; entries: LeaderboardEntry[] };

export type MultiplayerState = {
	connected: boolean;
	connecting: boolean;
	players: Player[];
	recentScores: Score[];
	leaderboard: LeaderboardEntry[];
};
