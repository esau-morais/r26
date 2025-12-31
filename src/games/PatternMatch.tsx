import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useState } from "react";
import { bell, doubleBell } from "../lib/sound";
import { postScore } from "../lib/ws";
import type { Player } from "../types";

type Props = {
	player: Player;
	onComplete: (level: number) => void;
	onExit: () => void;
	onScore?: (score: number) => void;
};

type GamePhase = "ready" | "showing" | "input" | "success" | "fail" | "done";
type Direction = "up" | "down" | "left" | "right";

const ARROWS: Record<Direction, string> = {
	up: "↑",
	down: "↓",
	left: "←",
	right: "→",
};

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

export function PatternMatch({ player, onComplete, onExit, onScore }: Props) {
	const [phase, setPhase] = useState<GamePhase>("ready");
	const [level, setLevel] = useState(1);
	const [pattern, setPattern] = useState<Direction[]>([]);
	const [input, setInput] = useState<Direction[]>([]);
	const [showIndex, setShowIndex] = useState(0);
	const [bestLevel, setBestLevel] = useState(0);

	const generatePattern = useCallback((len: number) => {
		const newPattern: Direction[] = [];
		for (let i = 0; i < len; i++) {
			newPattern.push(DIRECTIONS[Math.floor(Math.random() * 4)] ?? "up");
		}
		return newPattern;
	}, []);

	const startLevel = useCallback(() => {
		const len = level + 2;
		const newPattern = generatePattern(len);
		setPattern(newPattern);
		setInput([]);
		setShowIndex(0);
		setPhase("showing");
	}, [level, generatePattern]);

	useEffect(() => {
		const timer = setTimeout(startLevel, 1500);
		return () => clearTimeout(timer);
	}, [startLevel]);

	useEffect(() => {
		if (phase !== "showing") return;

		if (showIndex < pattern.length) {
			const timer = setTimeout(() => {
				bell();
				setShowIndex((i) => i + 1);
			}, 600);
			return () => clearTimeout(timer);
		}
		const timer = setTimeout(() => setPhase("input"), 400);
		return () => clearTimeout(timer);
	}, [phase, showIndex, pattern.length]);

	const handleInput = useCallback(
		async (dir: Direction) => {
			if (phase !== "input") return;

			const newInput = [...input, dir];
			setInput(newInput);

			const idx = newInput.length - 1;
			if (newInput[idx] !== pattern[idx]) {
				setPhase("fail");
				if (level > bestLevel) setBestLevel(level);

				const score = (level - 1) * 10;
				await postScore({
					playerId: player.id,
					playerName: player.name,
					game: "pattern",
					score,
					timestamp: Date.now(),
				});
				onScore?.(score);

				if (level > 1) {
					setTimeout(() => setPhase("done"), 1000);
				} else {
					setTimeout(() => {
						setInput([]);
						startLevel();
					}, 1000);
				}
				return;
			}

			if (newInput.length === pattern.length) {
				setPhase("success");
				doubleBell();

				setTimeout(() => {
					setLevel((l) => l + 1);
					setInput([]);
					const newLen = level + 3;
					const newPattern = generatePattern(newLen);
					setPattern(newPattern);
					setShowIndex(0);
					setPhase("showing");
				}, 1000);
			}
		},
		[
			phase,
			input,
			pattern,
			level,
			bestLevel,
			player,
			generatePattern,
			startLevel,
		],
	);

	useKeyboard((key) => {
		if (key.name === "escape") {
			onExit();
			return;
		}

		if (phase === "done") {
			if (key.name === "return" || key.name === "space") {
				onComplete(level - 1);
			}
			return;
		}

		if (phase === "input") {
			if (key.name === "up") handleInput("up");
			if (key.name === "down") handleInput("down");
			if (key.name === "left") handleInput("left");
			if (key.name === "right") handleInput("right");
		}
	});

	const renderPattern = () => {
		if (phase === "showing") {
			return pattern.map((dir, i) => (
				<text key={i} fg={i < showIndex ? "#ffd700" : "#333"}>
					{ARROWS[dir]}{" "}
				</text>
			));
		}

		if (phase === "input" || phase === "success" || phase === "fail") {
			return pattern.map((dir, i) => {
				let fg = "#333";
				if (i < input.length) {
					fg = input[i] === dir ? "#22c55e" : "#ef4444";
				} else if (i === input.length) {
					fg = "#ffd700";
				}
				return (
					<text key={i} fg={fg}>
						{ARROWS[dir]}{" "}
					</text>
				);
			});
		}

		return null;
	};

	return (
		<box flexDirection="column" flexGrow={1}>
			<box border borderColor="#4a4a4a" padding={1}>
				<text fg="#ffd700">PATTERN MATCH</text>
				<text fg="#888"> Level {level}</text>
				{bestLevel > 0 && <text fg="#888"> Best: {bestLevel}</text>}
			</box>

			<box
				flexGrow={1}
				alignItems="center"
				justifyContent="center"
				padding={2}
				margin={1}
				border
				borderColor="#333"
			>
				{phase === "ready" && <text fg="#888">Get ready...</text>}

				{(phase === "showing" || phase === "input") && (
					<box flexDirection="column" alignItems="center" gap={1}>
						<text fg="#888">
							{phase === "showing" ? "Watch the pattern..." : "Repeat it!"}
						</text>
						<box marginTop={1}>{renderPattern()}</box>
						{phase === "input" && (
							<text fg="#666" marginTop={1}>
								{input.length}/{pattern.length}
							</text>
						)}
					</box>
				)}

				{phase === "success" && (
					<box flexDirection="column" alignItems="center">
						<text fg="#22c55e">Correct! Level {level} complete</text>
					</box>
				)}

				{phase === "fail" && (
					<box flexDirection="column" alignItems="center">
						<text fg="#ef4444">Wrong!</text>
						<box marginTop={1}>{renderPattern()}</box>
					</box>
				)}

				{phase === "done" && (
					<box flexDirection="column" alignItems="center" gap={1}>
						<text fg="#ffd700">Game Over!</text>
						<text fg="#888">Reached Level {level - 1}</text>
						<text fg="#888">Score: {(level - 1) * 10}</text>
						<text fg="#666" marginTop={1}>
							Press ENTER to continue
						</text>
					</box>
				)}
			</box>

			<box padding={1}>
				<text fg="#666">[ESC] Exit [ARROWS] Input pattern</text>
			</box>
		</box>
	);
}
