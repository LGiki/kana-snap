import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "#/components/Button";

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
						<Button size="lg" onClick={() => window.location.reload()}>
							Reload
						</Button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
