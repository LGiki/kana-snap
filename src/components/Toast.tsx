import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

const DEFAULT_DURATION_MS = 2000;
const EXIT_ANIMATION_MS = 300;

type ToastItem = { id: number; message: string };

type ToastContextValue = {
	showToast: (message: string, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toast, setToast] = useState<ToastItem | null>(null);
	const [visible, setVisible] = useState(false);
	const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const unmountTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => {
		return () => {
			if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
			if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
		};
	}, []);

	const showToast = useCallback(
		(message: string, durationMs = DEFAULT_DURATION_MS) => {
			if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
			if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
			setToast({ id: Date.now(), message });
			setVisible(true);
			hideTimerRef.current = setTimeout(() => {
				setVisible(false);
				unmountTimerRef.current = setTimeout(
					() => setToast(null),
					EXIT_ANIMATION_MS,
				);
			}, durationMs);
		},
		[],
	);

	const value = useMemo(() => ({ showToast }), [showToast]);

	return (
		<ToastContext.Provider value={value}>
			{children}
			{toast && (
				<output
					key={toast.id}
					className={`fixed top-20 left-1/2 z-55 px-4 py-2.5 rounded-full bg-primary-600 text-white text-sm font-semibold shadow-lg whitespace-nowrap pointer-events-none ${
						visible ? "animate-toast-in" : "animate-toast-out"
					}`}
				>
					{toast.message}
				</output>
			)}
		</ToastContext.Provider>
	);
}

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) {
		throw new Error("useToast must be used within ToastProvider");
	}
	return ctx;
}
