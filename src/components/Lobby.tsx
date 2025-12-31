import { useKeyboard } from "@opentui/react";
import type { GameType, LeaderboardEntry, Player, Score } from "../types";

type Props = {
	player: Player;
	connected: boolean;
	connecting: boolean;
	players: Player[];
	recentScores: Score[];
	leaderboard: LeaderboardEntry[];
	onStartGame: (game: GameType) => void;
	onExit: () => void;
};

export function Lobby({
	player,
	connected,
	connecting,
	players,
	recentScores,
	leaderboard,
	onStartGame,
	onExit,
}: Props) {
	useKeyboard((key) => {
		if (key.name === "escape") onExit();
		if (key.raw === "1") onStartGame("reaction");
		if (key.raw === "2") onStartGame("typing");
		if (key.raw === "3") onStartGame("pattern");
	});

	const last5 = recentScores.slice(-5).reverse();
	const top5 = leaderboard.slice(0, 5);
	const statusColor = connected
		? "#22c55e"
		: connecting
			? "#ffd700"
			: "#ef4444";
	const statusText = connected
		? "LIVE"
		: connecting
			? "CONNECTING..."
			: "OFFLINE";

	return (
		<box flexDirection="column" flexGrow={1}>
			<box border borderColor="#ffd700" padding={1}>
				<text fg="#ffd700">MULTIPLAYER LOBBY</text>
				<text fg={statusColor}> {statusText}</text>
				{connected && <text fg="#666"> ({players.length} online)</text>}
			</box>

			<box flexDirection="row" flexGrow={1} padding={1} gap={2}>
				<box flexDirection="column" width={25} border borderColor="#333">
					<box padding={1}>
						<text fg="#888">PLAYERS ({players.length})</text>
					</box>
					<box flexDirection="column" padding={1}>
						{players.slice(0, 8).map((p) => (
							<text key={p.id} fg={p.id === player.id ? "#ffd700" : "#fff"}>
								{p.id === player.id ? "> " : "  "}
								{p.name.slice(0, 12)}
							</text>
						))}
						{players.length > 8 && (
							<text fg="#666">+{players.length - 8} more</text>
						)}
						{players.length === 0 && <text fg="#666">Waiting...</text>}
					</box>
				</box>

				<box flexDirection="column" width={30} border borderColor="#333">
					<box padding={1}>
						<text fg="#888">LEADERBOARD</text>
					</box>
					<box flexDirection="column" padding={1}>
						{top5.length === 0 ? (
							<text fg="#666">No scores yet</text>
						) : (
							top5.map((entry, i) => {
								const medal =
									i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
								return (
									<box key={entry.playerId} flexDirection="row">
										<text fg="#888">{medal} </text>
										<text
											fg={entry.playerId === player.id ? "#ffd700" : "#fff"}
										>
											{entry.playerName.slice(0, 10).padEnd(10)}
										</text>
										<text fg="#22c55e">{Math.round(entry.totalScore)}</text>
									</box>
								);
							})
						)}
					</box>
				</box>

				<box flexDirection="column" flexGrow={1} border borderColor="#333">
					<box padding={1}>
						<text fg="#888">RECENT</text>
					</box>
					<box flexDirection="column" padding={1}>
						{last5.length === 0 ? (
							<text fg="#666">No activity</text>
						) : (
							last5.map((s, i) => (
								<text
									key={`${s.playerId}-${s.timestamp}`}
									fg={i === 0 ? "#22c55e" : "#888"}
								>
									{s.playerName.slice(0, 8)} {s.game.slice(0, 3)}: {s.score}
									{s.game === "reaction" ? "ms" : ""}
								</text>
							))
						)}
					</box>
				</box>
			</box>

			<box border borderColor="#333" padding={1} flexDirection="column">
				<text fg="#888">SELECT GAME:</text>
				<box flexDirection="row" gap={4} marginTop={1}>
					<text fg="#ffd700">[1] Reaction Rush</text>
					<text fg="#ffd700">[2] Type Racer</text>
					<text fg="#ffd700">[3] Pattern Match</text>
				</box>
			</box>

			<box padding={1}>
				<text fg="#666">[ESC] Back to Menu</text>
			</box>
		</box>
	);
}
