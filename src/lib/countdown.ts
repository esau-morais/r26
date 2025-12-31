const TARGET = new Date("2026-01-01T00:00:00").getTime();

export function getTimeUntilMidnight(): number {
	return Math.max(0, TARGET - Date.now());
}

export function formatCountdown(ms: number): string {
	if (ms <= 0) return "00:00:00:00";

	const days = Math.floor(ms / (1000 * 60 * 60 * 24));
	const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((ms % (1000 * 60)) / 1000);

	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function isMidnight(): boolean {
	return Date.now() >= TARGET;
}
