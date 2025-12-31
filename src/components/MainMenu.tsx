import { useKeyboard, useRenderer } from "@opentui/react";
import { useEffect, useState } from "react";
import {
	formatCountdown,
	getTimeUntilMidnight,
	isMidnight,
} from "../lib/countdown";
import { fetchLeaderboard } from "../lib/ws";
import type { GameType, LeaderboardEntry, Player } from "../types";

type Props = {
	player: Player;
	onStartGame: (game: GameType) => void;
	onShowLeaderboard: () => void;
	onShowStats: () => void;
	onMidnight: () => void;
	onMultiplayer: () => void;
};

export function MainMenu({
	player,
	onStartGame,
	onShowLeaderboard,
	onShowStats,
	onMidnight,
	onMultiplayer,
}: Props) {
	const renderer = useRenderer();

	const [countdown, setCountdown] = useState(
		formatCountdown(getTimeUntilMidnight()),
	);
	const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
	const [selectedGame, setSelectedGame] = useState(0);

	const games: { key: GameType; name: string; icon: string }[] = [
		{ key: "reaction", name: "Reaction Rush", icon: "⚡" },
		{ key: "typing", name: "Type Racer", icon: "⌨️" },
		{ key: "pattern", name: "Pattern Match", icon: "🎯" },
	];

	useEffect(() => {
		const interval = setInterval(() => {
			if (isMidnight()) {
				onMidnight();
				clearInterval(interval);
				return;
			}
			setCountdown(formatCountdown(getTimeUntilMidnight()));
		}, 1000);
		return () => clearInterval(interval);
	}, [onMidnight]);

	useEffect(() => {
		fetchLeaderboard().then((data) => setTopPlayers(data.slice(0, 5)));
	}, []);

	useKeyboard((key) => {
		if (key.name === "j" || key.name === "down") {
			setSelectedGame((s) => Math.min(s + 1, games.length - 1));
		}
		if (key.name === "k" || key.name === "up") {
			setSelectedGame((s) => Math.max(s - 1, 0));
		}
		if (key.name === "return") {
			const game = games[selectedGame];
			if (game) onStartGame(game.key);
		}
		if (key.name === "l") {
			onShowLeaderboard();
		}
		if (key.name === "m") {
			onMultiplayer();
		}
		if (key.name === "s") {
			onShowStats();
		}
		if (key.name === "q") {
			renderer.destroy();
		}
	});

	return (
		<box flexDirection="column" flexGrow={1}>
			<box
				border
				borderColor="#ffd700"
				alignItems="center"
				justifyContent="center"
			>
				<ascii-font text="MMXXVI" font="block" />
			</box>

			<box alignItems="center" padding={1}>
				<text fg="#888">
					Time until 2026:
					<span fg="#22c55e"> {countdown}</span>
				</text>
			</box>

			<box flexDirection="row" flexGrow={1} gap={2} padding={1}>
				<box flexDirection="column" flexGrow={1}>
					<box border borderColor="#4a4a4a" padding={1} flexShrink={0}>
						<text fg="#ffd700">SELECT GAME</text>
					</box>

					{games.map((game, i) => (
						<box
							key={game.key}
							padding={1}
							backgroundColor={i === selectedGame ? "#333" : undefined}
							flexShrink={0}
						>
							<text fg={i === selectedGame ? "#ffd700" : "#888"}>
								{i === selectedGame ? "▶ " : "  "}
								{game.icon} {game.name}
							</text>
						</box>
					))}

					<box padding={1} marginTop={1} flexShrink={0}>
						<text fg="#666">Player: </text>
						<text fg="#fff">{player.name}</text>
					</box>
				</box>

				<box flexDirection="column" width={30}>
					<box border borderColor="#4a4a4a" padding={1}>
						<text fg="#ffd700">TOP 5</text>
					</box>

					{topPlayers.length === 0 ? (
						<box padding={1}>
							<text fg="#666">No scores yet</text>
						</box>
					) : (
						topPlayers.map((entry, i) => {
							const medal =
								i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
							return (
								<box key={entry.playerId} padding={1} flexDirection="row">
									<text fg="#888">{medal} </text>
									<text fg="#fff" style={{ width: 14 }}>
										{entry.playerName}
									</text>
									<text fg="#22c55e">{Math.round(entry.totalScore)}</text>
								</box>
							);
						})
					)}
				</box>
			</box>

			<box border borderColor="#333" padding={1} flexShrink={0}>
				<text fg="#666">
					[j/k] Navigate [ENTER] Play [m] Multiplayer [l] Leaderboard [s] Stats
					[q] Quit
				</text>
			</box>
		</box>
	);
}
