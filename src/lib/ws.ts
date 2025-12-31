import { useCallback, useEffect, useRef, useState } from "react";
import type {
	GameType,
	LeaderboardEntry,
	MultiplayerState,
	Player,
	Score,
	WSMessage,
} from "../types";

const SERVER_URL = process.env.R26_SERVER || "localhost:3026";
const WS_URL = `ws://${SERVER_URL}`;
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useMultiplayer(player: Player | null) {
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectAttempts = useRef(0);
	const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [state, setState] = useState<MultiplayerState>({
		connected: false,
		connecting: false,
		players: [],
		recentScores: [],
		leaderboard: [],
	});

	const connect = useCallback(() => {
		if (!player || wsRef.current?.readyState === WebSocket.OPEN) return;

		setState((s) => ({ ...s, connecting: true }));

		try {
			const ws = new WebSocket(
				`${WS_URL}?id=${player.id}&name=${encodeURIComponent(player.name)}`,
			);
			wsRef.current = ws;

			ws.onopen = () => {
				reconnectAttempts.current = 0;
				setState((s) => ({ ...s, connected: true, connecting: false }));
			};

			ws.onclose = () => {
				wsRef.current = null;
				setState((s) => ({ ...s, connected: false, connecting: false }));

				if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
					reconnectAttempts.current++;
					reconnectTimeout.current = setTimeout(connect, RECONNECT_DELAY);
				}
			};

			ws.onerror = () => {
				ws.close();
			};

			ws.onmessage = (e) => {
				const msg = JSON.parse(e.data) as WSMessage;

				switch (msg.type) {
					case "players":
						setState((s) => ({ ...s, players: msg.players }));
						break;
					case "join":
						setState((s) => ({
							...s,
							players: s.players.some((p) => p.id === msg.player.id)
								? s.players
								: [...s.players, msg.player],
						}));
						break;
					case "leave":
						setState((s) => ({
							...s,
							players: s.players.filter((p) => p.id !== msg.playerId),
						}));
						break;
					case "scores":
						setState((s) => ({ ...s, recentScores: msg.scores }));
						break;
					case "score":
						setState((s) => ({
							...s,
							recentScores: [...s.recentScores.slice(-49), msg.score],
						}));
						break;
					case "leaderboard":
						setState((s) => ({ ...s, leaderboard: msg.entries }));
						break;
				}
			};
		} catch {
			setState((s) => ({ ...s, connecting: false }));
		}
	}, [player]);

	const disconnect = useCallback(() => {
		if (reconnectTimeout.current) {
			clearTimeout(reconnectTimeout.current);
			reconnectTimeout.current = null;
		}
		reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS;
		wsRef.current?.close();
		wsRef.current = null;
		setState((s) => ({
			...s,
			connected: false,
			connecting: false,
			players: [],
			recentScores: [],
			leaderboard: [],
		}));
	}, []);

	useEffect(() => {
		if (player) {
			connect();
		}

		return () => {
			if (reconnectTimeout.current) {
				clearTimeout(reconnectTimeout.current);
			}
			wsRef.current?.close();
		};
	}, [player, connect]);

	const sendScore = useCallback((score: Score) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			const msg: WSMessage = { type: "score", score };
			wsRef.current.send(JSON.stringify(msg));
		}
	}, []);

	const sendPlaying = useCallback(
		(game: Score["game"]) => {
			if (!player || wsRef.current?.readyState !== WebSocket.OPEN) return;
			const msg: WSMessage = { type: "playing", player, game };
			wsRef.current.send(JSON.stringify(msg));
		},
		[player],
	);

	return { ...state, connect, disconnect, sendScore, sendPlaying };
}

const API_URL = `http://${SERVER_URL}`;

export async function fetchLeaderboard(
	game?: GameType,
): Promise<LeaderboardEntry[]> {
	try {
		const url = game
			? `${API_URL}/leaderboard?game=${game}`
			: `${API_URL}/leaderboard`;
		const res = await fetch(url);
		if (!res.ok) return [];
		return (await res.json()) as LeaderboardEntry[];
	} catch {
		return [];
	}
}

export async function fetchScores(): Promise<Score[]> {
	try {
		const res = await fetch(`${API_URL}/scores`);
		if (!res.ok) return [];
		return (await res.json()) as Score[];
	} catch {
		return [];
	}
}

export async function postScore(score: Score): Promise<boolean> {
	try {
		const res = await fetch(`${API_URL}/scores`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(score),
		});
		return res.ok;
	} catch {
		return false;
	}
}
