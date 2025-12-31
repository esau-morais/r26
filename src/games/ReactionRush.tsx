import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useState } from "react";
import { bell, doubleBell } from "../lib/sound";
import { postScore } from "../lib/ws";
import type { Player } from "../types";

type RoundState = "waiting" | "ready" | "go" | "early" | "done";

type Props = {
	player: Player;
	onComplete: (avgTime: number) => void;
	onExit: () => void;
	onScore?: (score: number) => void;
};

const TOTAL_ROUNDS = 5;
const MIN_WAIT = 2000;
const MAX_WAIT = 5000;

export function ReactionRush({ player, onComplete, onExit, onScore }: Props) {
	const [round, setRound] = useState(1);
	const [state, setState] = useState<RoundState>("waiting");
	const [times, setTimes] = useState<number[]>([]);
	const [startTime, setStartTime] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [timeoutId, setTimeoutId] = useState<ReturnType<
		typeof setTimeout
	> | null>(null);

	const startRound = useCallback(() => {
		setState("ready");
		const delay = MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
		const id = setTimeout(() => {
			setState("go");
			setStartTime(Date.now());
			bell();
		}, delay);
		setTimeoutId(id);
	}, []);

	useEffect(() => {
		const timer = setTimeout(startRound, 1000);
		return () => clearTimeout(timer);
	}, [startRound]);

	const handlePress = useCallback(() => {
		if (state === "ready") {
			if (timeoutId) clearTimeout(timeoutId);
			setState("early");
			return;
		}

		if (state === "go") {
			const reaction = Date.now() - startTime;
			setCurrentTime(reaction);
			setTimes((prev) => [...prev, reaction]);
			setState("done");
		}
	}, [state, startTime, timeoutId]);

	const nextRound = async () => {
		if (round >= TOTAL_ROUNDS) {
			const allTimes = state === "done" ? [...times, currentTime] : times;
			const validTimes = allTimes.filter((t) => t > 0);
			if (validTimes.length === 0) {
				onExit();
				return;
			}
			const avg = Math.round(
				validTimes.reduce((a, b) => a + b, 0) / validTimes.length,
			);
			await postScore({
				playerId: player.id,
				playerName: player.name,
				game: "reaction",
				score: avg,
				timestamp: Date.now(),
			});
			onScore?.(avg);
			doubleBell();
			onComplete(avg);
			return;
		}
		setRound((r) => r + 1);
		setState("waiting");
		setTimeout(startRound, 500);
	};

	const retryRound = () => {
		setState("waiting");
		setTimeout(startRound, 500);
	};

	useKeyboard((key) => {
		if (key.name === "escape") {
			if (timeoutId) clearTimeout(timeoutId);
			onExit();
			return;
		}
		if (key.name === "space") {
			if (state === "ready" || state === "go") {
				handlePress();
			} else if (state === "done") {
				nextRound();
			} else if (state === "early") {
				retryRound();
			}
		}
	});

	const bgColor =
		state === "go" ? "#22c55e" : state === "early" ? "#ef4444" : "#1a1a2e";
	const message = {
		waiting: "Get ready...",
		ready: "WAIT FOR GREEN",
		go: "NOW! Press SPACE!",
		early: "Too early! Press SPACE to retry",
		done: `${currentTime}ms - Press SPACE to continue`,
	}[state];

	return (
		<box flexDirection="column" flexGrow={1}>
			<box border borderColor="#4a4a4a" padding={1}>
				<text fg="#ffd700">REACTION RUSH</text>
				<text fg="#888">
					{" "}
					Round {round}/{TOTAL_ROUNDS}
				</text>
				{times.length > 0 && (
					<text fg="#888"> Best: {Math.min(...times)}ms</text>
				)}
			</box>

			<box
				flexGrow={1}
				backgroundColor={bgColor}
				alignItems="center"
				justifyContent="center"
				margin={1}
			>
				<text fg={state === "go" ? "#000" : "#fff"}>{message}</text>
			</box>

			<box border borderColor="#333" padding={1}>
				<box flexDirection="row" gap={2}>
					{times.map((t, i) => (
						<text
							// biome-ignore lint/suspicious/noArrayIndexKey: t can repeat
							key={i}
							fg={t < 200 ? "#22c55e" : t < 300 ? "#ffd700" : "#ef4444"}
						>
							R{i + 1}: {t}ms
						</text>
					))}
				</box>
			</box>

			<box padding={1}>
				<text fg="#666">[ESC] Exit [SPACE] React</text>
			</box>
		</box>
	);
}
