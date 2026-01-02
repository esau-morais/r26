import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { useEffect, useState } from "react";
import { bell } from "../lib/sound";

type Props = {
	onComplete: () => void;
};

type Particle = {
	id: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	char: string;
	color: string;
};

const COLORS = [
	"#ff0000",
	"#ffd700",
	"#00ff00",
	"#00ffff",
	"#ff00ff",
	"#ff6600",
	"#ffffff",
];
const CHARS = ["*", ".", "o", "+"];
const DURATION = 6000;
const GRAVITY = 0.08;

let particleId = 0;

function createExplosion(cx: number, cy: number, count: number): Particle[] {
	const particles: Particle[] = [];
	const color = COLORS[Math.floor(Math.random() * COLORS.length)] ?? "#fff";
	for (let i = 0; i < count; i++) {
		const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
		const speed = 0.5 + Math.random() * 1.5;
		particles.push({
			id: particleId++,
			x: cx,
			y: cy,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed * 0.5,
			life: 40 + Math.random() * 30,
			char: CHARS[Math.floor(Math.random() * CHARS.length)] ?? "*",
			color,
		});
	}
	return particles;
}

export function Fireworks({ onComplete }: Props) {
	const { width, height } = useTerminalDimensions();
	const [particles, setParticles] = useState<Particle[]>([]);
	const [startTime] = useState(Date.now());
	const [showText, setShowText] = useState(false);

	useEffect(() => {
		bell();

		const spawnInterval = setInterval(() => {
			const x = 10 + Math.random() * (width - 20);
			const y = 5 + Math.random() * (height * 0.4);
			const count = 30 + Math.floor(Math.random() * 20);
			setParticles((p) => [...p, ...createExplosion(x, y, count)]);
			bell();
		}, 400);

		const showTimer = setTimeout(() => setShowText(true), 1500);

		const endTimer = setTimeout(() => {
			clearInterval(spawnInterval);
			onComplete();
		}, DURATION);

		return () => {
			clearInterval(spawnInterval);
			clearTimeout(showTimer);
			clearTimeout(endTimer);
		};
	}, [width, height, onComplete]);

	useEffect(() => {
		const frame = setInterval(() => {
			setParticles((prev) =>
				prev
					.map((p) => ({
						...p,
						x: p.x + p.vx,
						y: p.y + p.vy,
						vy: p.vy + GRAVITY,
						life: p.life - 1,
					}))
					.filter(
						(p) =>
							p.life > 0 && p.x > 0 && p.x < width && p.y > 0 && p.y < height,
					),
			);
		}, 50);

		return () => clearInterval(frame);
	}, [width, height]);

	useKeyboard((key) => {
		if (
			key.name === "escape" ||
			key.name === "return" ||
			key.name === "space" ||
			(key.ctrl && key.name === "c")
		) {
			onComplete();
		}
	});

	const elapsed = Date.now() - startTime;
	const remaining = Math.max(0, Math.ceil((DURATION - elapsed) / 1000));

	return (
		<box flexDirection="column" flexGrow={1} backgroundColor="#0a0a1a">
			{particles.map((p) => (
				<box
					key={p.id}
					position="absolute"
					left={Math.round(p.x)}
					top={Math.round(p.y)}
				>
					<text fg={p.color}>{p.char}</text>
				</box>
			))}

			{showText && (
				<box
					position="absolute"
					left={Math.floor((width - 52) / 2)}
					top={Math.floor((height - 12) / 2)}
					flexDirection="column"
					alignItems="center"
				>
					<ascii-font text="2026" font="huge" color="#ffd700" />
					<text fg="#fff" marginTop={2}>
						HAPPY NEW YEAR!
					</text>
				</box>
			)}

			<box position="absolute" bottom={1} left={2}>
				<text fg="#666">Press any key to continue ({remaining}s)</text>
			</box>
		</box>
	);
}
