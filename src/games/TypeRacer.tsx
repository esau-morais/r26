import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useState } from "react";
import { bell, doubleBell } from "../lib/sound";
import { postScore } from "../lib/ws";
import type { Player } from "../types";

type Props = {
	player: Player;
	onComplete: (wpm: number) => void;
	onExit: () => void;
	onScore?: (score: number) => void;
};

type GamePhase = "ready" | "playing" | "done";

const PHRASES = [
	"the quick brown fox jumps over the lazy dog",
	"pack my box with five dozen liquor jugs",
	"how vexingly quick daft zebras jump",
	"sphinx of black quartz judge my vow",
	"two driven jocks help fax my big quiz",
	"the five boxing wizards jump quickly",
	"bright vixens jump dozy fowl quack",
	"jackdaws love my big sphinx of quartz",
	"crazy frederick bought many very exquisite opal jewels",
	"we promptly judged antique ivory buckles for the next prize",
];

export function TypeRacer({ player, onComplete, onExit, onScore }: Props) {
	const [phase, setPhase] = useState<GamePhase>("ready");
	const [phrase, setPhrase] = useState("");
	const [typed, setTyped] = useState("");
	const [startTime, setStartTime] = useState(0);
	const [wpm, setWpm] = useState(0);
	const [accuracy, setAccuracy] = useState(100);
	const [errors, setErrors] = useState(0);

	const startGame = useCallback(() => {
		const randomPhrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
		setPhrase(randomPhrase ?? PHRASES[0] ?? "");
		setTyped("");
		setErrors(0);
		setPhase("playing");
		setStartTime(Date.now());
		bell();
	}, []);

	useEffect(() => {
		const timer = setTimeout(startGame, 1500);
		return () => clearTimeout(timer);
	}, [startGame]);

	const finishGame = useCallback(async () => {
		const elapsed = (Date.now() - startTime) / 1000 / 60;
		const words = phrase.split(" ").length;
		const calcWpm = Math.round(words / elapsed);
		const calcAcc = Math.round(
			((phrase.length - errors) / phrase.length) * 100,
		);
		const score = Math.round(calcWpm * (calcAcc / 100));

		setWpm(calcWpm);
		setAccuracy(calcAcc);
		setPhase("done");
		doubleBell();

		await postScore({
			playerId: player.id,
			playerName: player.name,
			game: "typing",
			score,
			timestamp: Date.now(),
		});
		onScore?.(score);
	}, [startTime, phrase, errors, player, onScore]);

	useKeyboard((key) => {
		if (key.name === "escape") {
			onExit();
			return;
		}

		if (phase === "done") {
			if (key.name === "return" || key.name === "space") {
				onComplete(wpm);
			}
			return;
		}

		if (phase !== "playing") return;

		if (key.name === "backspace") {
			setTyped((t) => t.slice(0, -1));
			return;
		}

		const char = key.raw;
		if (char && char.length === 1 && char >= " " && char <= "~") {
			const newTyped = typed + char;
			setTyped(newTyped);

			if (char !== phrase[typed.length]) {
				setErrors((e) => e + 1);
			}

			if (newTyped.length >= phrase.length) {
				finishGame();
			}
		}
	});

	const renderPhrase = () => {
		return phrase.split("").map((char, i) => {
			let fg = "#666";
			if (i < typed.length) {
				fg = typed[i] === char ? "#22c55e" : "#ef4444";
			} else if (i === typed.length) {
				fg = "#ffd700";
			}
			return (
				<span key={i} fg={fg} bg={i === typed.length ? "#333" : undefined}>
					{char}
				</span>
			);
		});
	};

	return (
		<box flexDirection="column" flexGrow={1}>
			<box border borderColor="#4a4a4a" padding={1}>
				<text fg="#ffd700">TYPE RACER</text>
				{phase === "playing" && (
					<text fg="#888">
						{" "}
						{typed.length}/{phrase.length} chars
					</text>
				)}
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
				{phase === "ready" && <text fg="#888">Get ready to type...</text>}

				{phase === "playing" && (
					<box flexDirection="column" alignItems="center" gap={1}>
						<text>{renderPhrase()}</text>
						<box marginTop={1}>
							<text fg="#666">Errors: </text>
							<text fg={errors > 0 ? "#ef4444" : "#22c55e"}>{errors}</text>
						</box>
					</box>
				)}

				{phase === "done" && (
					<box flexDirection="column" alignItems="center" gap={1}>
						<text fg="#22c55e">Complete!</text>
						<text fg="#ffd700">{wpm} WPM</text>
						<text fg="#888">Accuracy: {accuracy}%</text>
						<text fg="#888">Score: {Math.round(wpm * (accuracy / 100))}</text>
						<text fg="#666" marginTop={1}>
							Press ENTER to continue
						</text>
					</box>
				)}
			</box>

			<box padding={1}>
				<text fg="#666">[ESC] Exit [BACKSPACE] Delete</text>
			</box>
		</box>
	);
}
