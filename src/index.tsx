#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { useCallback, useEffect, useState } from "react";
import { Fireworks } from "./components/Fireworks";
import { Leaderboard } from "./components/Leaderboard";
import { Lobby } from "./components/Lobby";
import { MainMenu } from "./components/MainMenu";
import { StatsCard } from "./components/StatsCard";
import { PatternMatch } from "./games/PatternMatch";
import { ReactionRush } from "./games/ReactionRush";
import { TypeRacer } from "./games/TypeRacer";
import { isMidnight } from "./lib/countdown";
import { getPlayer, markFireworksSeen, setPlayerName } from "./lib/store";
import { useMultiplayer } from "./lib/ws";
import type { GameType, Player, Score, Screen } from "./types";

type ExtScreen = Screen | "lobby";

function App({ onQuit }: { onQuit: () => void }) {
	const [player, setPlayer] = useState<Player | null>(null);
	const [screen, setScreen] = useState<ExtScreen>("menu");
	const [currentGame, setCurrentGame] = useState<GameType | null>(null);
	const [_lastScore, setLastScore] = useState<number | null>(null);
	const [isMultiplayer, setIsMultiplayer] = useState(false);

	const mp = useMultiplayer(isMultiplayer ? player : null);

	useEffect(() => {
		getPlayer().then(setPlayer);
	}, []);

	useEffect(() => {
		if (!player || player.fireworksSeen) return;
		const check = setInterval(() => {
			if (isMidnight() && screen === "menu") {
				setScreen("fireworks");
			}
		}, 1000);
		return () => clearInterval(check);
	}, [screen, player]);

	const handleScore = useCallback(
		(score: number) => {
			if (!player || !currentGame) return;
			const scoreData: Score = {
				playerId: player.id,
				playerName: player.name,
				game: currentGame,
				score,
				timestamp: Date.now(),
			};
			mp.sendScore(scoreData);
		},
		[player, currentGame, mp.sendScore],
	);

	if (!player) {
		return (
			<box alignItems="center" justifyContent="center" flexGrow={1}>
				<text fg="#888">Loading...</text>
			</box>
		);
	}

	const handleStartGame = (game: GameType) => {
		setCurrentGame(game);
		setScreen("game");
	};

	const handleGameComplete = (score: number) => {
		setLastScore(score);
		setScreen(isMultiplayer ? "lobby" : "menu");
		setCurrentGame(null);
	};

	const handleGameExit = () => {
		setScreen(isMultiplayer ? "lobby" : "menu");
		setCurrentGame(null);
	};

	const handleMultiplayer = () => {
		setIsMultiplayer(true);
		setScreen("lobby");
	};

	const handleLobbyExit = () => {
		mp.disconnect();
		setIsMultiplayer(false);
		setScreen("menu");
	};

	const handleFireworksComplete = async () => {
		const updated = await markFireworksSeen();
		setPlayer(updated);
		setScreen("menu");
	};

	if (screen === "fireworks") {
		return <Fireworks onComplete={handleFireworksComplete} />;
	}

	if (screen === "stats") {
		return <StatsCard player={player} onExit={() => setScreen("menu")} />;
	}

	if (screen === "leaderboard") {
		return <Leaderboard onExit={() => setScreen("menu")} />;
	}

	if (screen === "lobby" && player) {
		return (
			<Lobby
				player={player}
				connected={mp.connected}
				connecting={mp.connecting}
				players={mp.players}
				recentScores={mp.recentScores}
				leaderboard={mp.leaderboard}
				onStartGame={handleStartGame}
				onExit={handleLobbyExit}
			/>
		);
	}

	if (screen === "game" && currentGame === "reaction") {
		return (
			<ReactionRush
				player={player}
				onComplete={handleGameComplete}
				onExit={handleGameExit}
				onScore={isMultiplayer ? handleScore : undefined}
			/>
		);
	}

	if (screen === "game" && currentGame === "typing") {
		return (
			<TypeRacer
				player={player}
				onComplete={handleGameComplete}
				onExit={handleGameExit}
				onScore={isMultiplayer ? handleScore : undefined}
			/>
		);
	}

	if (screen === "game" && currentGame === "pattern") {
		return (
			<PatternMatch
				player={player}
				onComplete={handleGameComplete}
				onExit={handleGameExit}
				onScore={isMultiplayer ? handleScore : undefined}
			/>
		);
	}

	const handleNameChange = async (name: string) => {
		const updated = await setPlayerName(name);
		setPlayer(updated);
	};

	return (
		<MainMenu
			player={player}
			onStartGame={handleStartGame}
			onShowLeaderboard={() => setScreen("leaderboard")}
			onShowStats={() => setScreen("stats")}
			onMultiplayer={handleMultiplayer}
			onNameChange={handleNameChange}
			onQuit={onQuit}
		/>
	);
}

const renderer = await createCliRenderer();
const root = createRoot(renderer);

function render() {
	root.render(<App onQuit={() => renderer.destroy()} />);
}

render();
