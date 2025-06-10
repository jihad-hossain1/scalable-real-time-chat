import { Header } from "./components/Header";
import { OnlineUser } from "./components/OnlineUser";
import { MainChatArea } from "./components/MainChatArea";
import { ChatContext, ChatProvider } from "./context/ChatContext";
import { useContext } from "react";
import { ChatLanding } from "./components/ChatLanding";
import { Logout } from "../../auth/Logout";
import { cn } from "../../../utils/cn";
import { AlignJustify, X } from "lucide-react";
import { useChatContext } from "./hooks/useChatContext";

export const ChatManage = () => {
  return (
    <ChatProvider>
      <Chat />
    </ChatProvider>
  );
};

const Chat = () => {
  const { state } = useContext(ChatContext);
  const { updateIsSidebar } = useChatContext();

  return (
    <div className="flex h-[90vh] xl:h-screen bg-gray-50 relative">
      {/* Sidebar */}
      <button
        className={cn(
          "flex-shrink-0 xl:hidden absolute left-0 top-0 z-20",
          state.isSidebarOpen ? "hidden" : "block"
        )}
        onClick={() => updateIsSidebar(true)}
      >
        <AlignJustify />
      </button>

      <div
        className={cn(
          "hidden xl:flex w-80 bg-white border-r border-gray-200  flex-col relative",
          state.isSidebarOpen ? "block" : "hidden"
        )}
      >
        <button
          className={cn(
            "absolute right-0 top-0 z-20",
            state.isSidebarOpen ? "block" : "hidden"
          )}
          onClick={() => updateIsSidebar(false)}
        >
          <X />
        </button>
        {/* Header */}
        <Header />

        {/* Online Users */}
        <OnlineUser />

        <div className="absolute z-10 bottom-3 left-[25%] right-[25%]">
          <Logout />
        </div>
      </div>

      {/* Main Chat Area */}
      {state.isChatUserSelect ? <MainChatArea /> : <ChatLanding />}
    </div>
  );
};
