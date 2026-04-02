import { useId } from "react";

export function AppIcon({ size = 28 }: { size?: number }) {
	const gradientId = useId();
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 512 512"
			width={size}
			height={size}
			className="rounded-md"
		>
			<defs>
				<linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style={{ stopColor: "var(--color-primary-500)" }} />
					<stop
						offset="100%"
						style={{ stopColor: "var(--color-primary-600)" }}
					/>
				</linearGradient>
			</defs>
			<rect width="512" height="512" rx="96" fill={`url(#${gradientId})`} />
			<text
				x="256"
				y="300"
				fontFamily="serif"
				fontSize="280"
				fill="white"
				textAnchor="middle"
				dominantBaseline="central"
			>
				あ
			</text>
		</svg>
	);
}
