import { createFileRoute } from "@tanstack/react-router";
import { KanaFeed } from "#/components/KanaFeed";

export const Route = createFileRoute("/feed")({
	component: FeedPage,
});

function FeedPage() {
	return <KanaFeed />;
}
