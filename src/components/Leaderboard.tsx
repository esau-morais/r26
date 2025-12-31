import { useKeyboard } from "@opentui/react";
import { useCallback, useEffect, useState } from "react";
import { fetchLeaderboard } from "../lib/ws";
import type { GameType, LeaderboardEntry } from "../types";

type Props = {
	onExit: () => void;
};

export function Leaderboard({ onExit }: Props) {
	const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
	const [selected, setSelected] = useState(0);
	const [filter, setFilter] = useState<GameType | undefined>(undefined);
	const [loading, setLoading] = useState(true);

	const loadLeaderboard = useCallback(async () => {
		setLoading(true);
		const data = await fetchLeaderboard(filter);
		setEntries(data);
		setLoading(false);
	}, [filter]);

	useEffect(() => {
		loadLeaderboard();
	}, [loadLeaderboard]);

	useKeyboard((key) => {
		if (key.name === "escape" || key.name === "q") {
			onExit();
			return;
		}
		if (key.name === "j" || key.name === "down") {
			setSelected((s) => Math.min(s + 1, entries.length - 1));
		}
		if (key.name === "k" || key.name === "up") {
			setSelected((s) => Math.max(s - 1, 0));
		}
		if (key.name === "r") {
			loadLeaderboard();
		}
		if (key.name === "1") setFilter(undefined);
		if (key.name === "2") setFilter("reaction");
		if (key.name === "3") setFilter("typing");
		if (key.name === "4") setFilter("pattern");
	});

	const filterLabel = filter
		? filter.charAt(0).toUpperCase() + filter.slice(1)
		: "All";

	return (
		<box flexDirection="column" flexGrow={1}>
			<box
				border
				borderColor="#4a4a4a"
				padding={1}
				flexDirection="row"
				justifyContent="space-between"
			>
				<text fg="#ffd700">LEADERBOARD</text>
				<text fg="#888">Filter: {filterLabel}</text>
			</box>

			<box flexDirection="row" padding={1} gap={2}>
				<text fg={!filter ? "#ffd700" : "#666"}>[1] All</text>
				<text fg={filter === "reaction" ? "#ffd700" : "#666"}>
					[2] Reaction
				</text>
				<text fg={filter === "typing" ? "#ffd700" : "#666"}>[3] Typing</text>
				<text fg={filter === "pattern" ? "#ffd700" : "#666"}>[4] Pattern</text>
			</box>

			<scrollbox
				focused
				flexGrow={1}
				style={{
					rootOptions: { backgroundColor: "#1a1a2e" },
					scrollbarOptions: {
						trackOptions: {
							foregroundColor: "#ffd700",
							backgroundColor: "#333",
						},
					},
				}}
			>
				{loading ? (
					<text fg="#888">Loading...</text>
				) : entries.length === 0 ? (
					<box padding={2}>
						<text fg="#888">No scores yet. Be the first!</text>
					</box>
				) : (
					entries.map((entry, i) => {
						const medal =
							i === 0 ? "🏆" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
						const isSelected = i === selected;
						return (
							<box
								key={entry.playerId}
								flexDirection="row"
								padding={1}
								backgroundColor={isSelected ? "#333" : undefined}
							>
								<text fg="#888" style={{ width: 4 }}>
									{medal}
								</text>
								<text fg="#888" style={{ width: 4 }}>
									#{i + 1}
								</text>
								<text
									fg={isSelected ? "#ffd700" : "#fff"}
									style={{ width: 20 }}
								>
									{entry.playerName}
								</text>
								<text fg="#22c55e" style={{ width: 10 }}>
									{Math.round(entry.totalScore)} pts
								</text>
								<text fg="#666">
									{entry.games
										.map((g) => {
											const label = g.game[0]?.toUpperCase() ?? "?";
											const score =
												g.score != null ? Math.round(g.score) : "null";
											return `${label}:${score}`;
										})
										.join(" ")}
								</text>
							</box>
						);
					})
				)}
			</scrollbox>

			<box padding={1} borderColor="#333" border>
				<text fg="#666">
					[j/k] Navigate [r] Refresh [1-4] Filter [ESC] Back
				</text>
			</box>
		</box>
	);
}
