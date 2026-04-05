import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("ErrorBoundary caught:", error, info.componentStack);
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback;

			return (
				<div className="min-h-screen flex items-center justify-center bg-surface text-text-primary p-6">
					<div className="max-w-md text-center space-y-4">
						<h1 className="text-2xl font-bold">Something went wrong</h1>
						<p className="text-text-secondary">
							An unexpected error occurred. Please reload the page.
						</p>
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
						>
							Reload
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
