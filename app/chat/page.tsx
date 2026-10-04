import { redirect } from "next/navigation";

import { AgentChat } from "@/components/application/agent-chat/agent-chat";
import { auth } from "@/lib/auth";
import { CHAT_PATH, withBasePath } from "@/lib/constants";

export default async function ChatPage() {
  const session = await auth();

  if (!session?.user) {
    const chatPath = withBasePath(CHAT_PATH);
    redirect(
      withBasePath(
        `/api/auth/guest?redirectUrl=${encodeURIComponent(chatPath)}`,
      ),
    );
  }

  return <AgentChat />;
}
