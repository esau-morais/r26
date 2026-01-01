import type { InputRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useEffect, useRef, useState } from "react";
import { formatCountdown, getTimeUntilMidnight } from "../lib/countdown";
import { fetchLeaderboard } from "../lib/ws";
import type { GameType, LeaderboardEntry, Player } from "../types";

type Props = {
	player: Player;
	onStartGame: (game: GameType) => void;
	onShowLeaderboard: () => void;
	onShowStats: () => void;
	onMultiplayer: () => void;
	onNameChange: (name: string) => void;
	onQuit: () => void;
};

const COMMANDS = ["name", "quit"] as const;

export function MainMenu({
	player,
	onStartGame,
	onShowLeaderboard,
	onShowStats,
	onMultiplayer,
	onNameChange,
	onQuit,
}: Props) {
	const [countdown, setCountdown] = useState(
		formatCountdown(getTimeUntilMidnight()),
	);
	const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
	const [selectedGame, setSelectedGame] = useState(0);
	const [cmdMode, setCmdMode] = useState(false);
	const [cmdInput, setCmdInput] = useState("");
	const inputRef = useRef<InputRenderable>(null);

	const games: { key: GameType; name: string; icon: string }[] = [
		{ key: "reaction", name: "Reaction Rush", icon: "⚡" },
		{ key: "typing", name: "Type Racer", icon: "⌨️" },
		{ key: "pattern", name: "Pattern Match", icon: "🎯" },
	];

	const cmdParts = cmdInput.split(" ");
	const cmdBase = cmdParts[0] ?? "";
	const hasArgs = cmdParts.length > 1;
	const autocomplete = !hasArgs
		? COMMANDS.find((c) => c.startsWith(cmdBase) && c !== cmdBase)
		: undefined;

	useEffect(() => {
		const interval = setInterval(() => {
			setCountdown(formatCountdown(getTimeUntilMidnight()));
		}, 1000);
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		fetchLeaderboard().then((data) => setTopPlayers(data.slice(0, 5)));
	}, []);

	useKeyboard((key) => {
		if (cmdMode) {
			if (key.name === "escape") {
				setCmdMode(false);
				setCmdInput("");
			}

			if (key.name === "backspace" && key.meta && inputRef.current) {
				const val = inputRef.current.value;
				const pos = inputRef.current.cursorPosition;

				let start = pos;
				// Skip trailing spaces
				while (start > 0 && /\s/.test(val[start - 1] ?? "")) start--;
				// Skip word characters
				while (start > 0 && !/\s/.test(val[start - 1] ?? "")) start--;

				const newValue = val.slice(0, start) + val.slice(pos);
				inputRef.current.value = newValue;
				inputRef.current.cursorPosition = start;
				setCmdInput(newValue);
				return;
			}

			if (key.name === "tab" && autocomplete && inputRef.current) {
				const newValue = `${autocomplete} `;
				inputRef.current.value = newValue;
				inputRef.current.cursorPosition = newValue.length;
				setCmdInput(newValue);
			}
			return;
		}
		if (key.sequence === ":") {
			setCmdMode(true);
			setCmdInput("");
			return;
		}
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
			onQuit();
		}
	});

	const handleCmdSubmit = (input: string) => {
		const [cmd, ...args] = input.trim().split(" ");
		if (cmd === "name") {
			const name = args.join(" ").trim().slice(0, 16);
			if (name.length >= 2) onNameChange(name);
		}
		if (cmd === "quit") {
			onQuit();
		}
		setCmdMode(false);
		setCmdInput("");
	};

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

			{cmdMode ? (
				<box border borderColor="#ffd700" flexShrink={0} height={3}>
					<input
						ref={inputRef}
						value={cmdInput}
						focused
						placeholder={`name <newname> | quit${autocomplete ? ` → ${autocomplete} [tab]` : ""} [esc]`}
						placeholderColor="#555"
						textColor="#fff"
						focusedTextColor="#fff"
						onInput={setCmdInput}
						onSubmit={handleCmdSubmit}
					/>
				</box>
			) : (
				<box border borderColor="#333" flexShrink={0} height={3}>
					<text fg="#666">
						[j/k] Navigate [ENTER] Play [:] Command [m] Multiplayer [l]
						Leaderboard [s] Stats [q] Quit
					</text>
				</box>
			)}
		</box>
	);
}
