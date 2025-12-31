import { useKeyboard } from "@opentui/react";
import { useEffect, useState } from "react";
import { fetchScores } from "../lib/ws";
import type { Player, Score } from "../types";

type Props = {
	player: Player;
	onExit: () => void;
};

async function copyToClipboard(text: string): Promise<boolean> {
	try {
		const isLinux = process.platform === "linux";
		const isMac = process.platform === "darwin";
		const cmd = isMac
			? ["pbcopy"]
			: isLinux
				? ["xclip", "-selection", "clipboard"]
				: ["clip.exe"];
		const proc = Bun.spawn(cmd, { stdin: "pipe" });
		proc.stdin.write(text);
		proc.stdin.end();
		await proc.exited;
		return true;
	} catch {
		return false;
	}
}

export function StatsCard({ player, onExit }: Props) {
	const [scores, setScores] = useState<Score[]>([]);
	const [loading, setLoading] = useState(true);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		fetchScores().then((data) => {
			const playerScores = data.filter((s) => s.playerId === player.id);
			setScores(playerScores);
			setLoading(false);
		});
	}, [player.id]);

	const stats = calculateStats(scores);

	useKeyboard((key) => {
		if (key.name === "escape" || key.name === "q") {
			onExit();
		}
		if (key.ctrl && key.name === "s") {
			const text = generateShareText(player.name, stats);
			copyToClipboard(text).then((ok) => {
				if (ok) {
					setCopied(true);
					setTimeout(() => setCopied(false), 2000);
				}
			});
		}
	});

	if (loading) {
		return (
			<box alignItems="center" justifyContent="center" flexGrow={1}>
				<text fg="#888">Loading stats...</text>
			</box>
		);
	}

	return (
		<box
			flexDirection="column"
			flexGrow={1}
			alignItems="center"
			justifyContent="center"
		>
			<box alignItems="center">
				<ascii-font text="2025" font="block" />
			</box>

			<box alignItems="center" marginBottom={2}>
				<text fg="#ffd700">{player.name}'s Year in Review</text>
			</box>

			<box flexDirection="column" width={40} gap={1}>
				<box flexDirection="row" justifyContent="space-between">
					<text fg="#888">Games played</text>
					<text fg="#e5c07b">{stats.totalGames}</text>
				</box>

				<box flexDirection="row" justifyContent="space-between">
					<text fg="#888">Best reaction</text>
					<text fg="#56b6c2">
						{stats.bestReaction > 0 ? `${stats.bestReaction}ms` : "-"}
					</text>
				</box>

				<box flexDirection="row" justifyContent="space-between">
					<text fg="#888">Best typing</text>
					<text fg="#56b6c2">
						{stats.bestTyping > 0 ? `${stats.bestTyping} WPM` : "-"}
					</text>
				</box>

				<box flexDirection="row" justifyContent="space-between">
					<text fg="#888">Best pattern</text>
					<text fg="#56b6c2">
						{stats.bestPattern > 0 ? `${stats.bestPattern} steps` : "-"}
					</text>
				</box>
			</box>

			{stats.insight && (
				<box alignItems="center" marginTop={2}>
					<text fg="#e06c75">{stats.insight}</text>
				</box>
			)}

			<box marginTop={2} alignItems="center">
				<text fg="#666">
					esc to cancel · ctrl+s to copy
					{copied && <span fg="#22c55e"> Copied!</span>}
				</text>
			</box>
		</box>
	);
}

function calculateStats(scores: Score[]) {
	const reactionScores = scores
		.filter((s) => s.game === "reaction")
		.map((s) => s.score);
	const typingScores = scores
		.filter((s) => s.game === "typing")
		.map((s) => s.score);
	const patternScores = scores
		.filter((s) => s.game === "pattern")
		.map((s) => s.score);

	const bestReaction =
		reactionScores.length > 0 ? Math.min(...reactionScores) : 0;
	const bestTyping = typingScores.length > 0 ? Math.max(...typingScores) : 0;
	const bestPattern = patternScores.length > 0 ? Math.max(...patternScores) : 0;

	let insight = "";
	if (bestReaction > 0 && bestReaction < 150) {
		insight = "Lightning reflexes! Top 1% reaction time.";
	} else if (bestReaction > 0 && bestReaction < 200) {
		insight = "Quick hands! Faster than most.";
	} else if (bestTyping >= 100) {
		insight = "Speed demon! You type faster than 95% of people.";
	} else if (bestTyping >= 60) {
		insight = "Solid typing speed! Above average.";
	} else if (bestPattern >= 10) {
		insight = "Pattern master! Impressive memory.";
	} else if (scores.length >= 20) {
		insight = "Dedicated player! Keep pushing your limits.";
	} else if (scores.length > 0) {
		insight = "Keep playing to unlock more insights!";
	}

	return {
		totalGames: scores.length,
		bestReaction,
		bestTyping,
		bestPattern,
		insight,
	};
}

function generateShareText(
	playerName: string,
	stats: ReturnType<typeof calculateStats>,
): string {
	let text = `Pre-2026 Stats

${playerName}

Games played      ${stats.totalGames}
Best reaction     ${stats.bestReaction > 0 ? `${stats.bestReaction}ms` : "-"}
Best typing       ${stats.bestTyping > 0 ? `${stats.bestTyping} WPM` : "-"}
Best pattern      ${stats.bestPattern > 0 ? `${stats.bestPattern} steps` : "-"}
`;

	text += `\ngithub.com/sst/r26`;
	return text;
}
