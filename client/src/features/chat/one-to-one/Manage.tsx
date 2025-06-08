import { Header } from "./components/Header";
import { OnlineUser } from "./components/OnlineUser";
import { MainChatArea } from "./components/MainChatArea";
import { ChatContext, ChatProvider } from "./context/ChatContext";
import { useContext } from "react";
import { ChatLanding } from "./components/ChatLanding";
import { Logout } from "../../auth/Logout";

export const ChatManage = () => {
  return (
    <ChatProvider>
      <Chat />
    </ChatProvider>
  );
};

const Chat = () => {
  const { state } = useContext(ChatContext);

  return (
    <div className="flex h-screen bg-gray-50 ">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col relative">
        {/* Header */}
        <Header />

        {/* Online Users */}
        <OnlineUser />

        <div className="absolute z-10 bottom-3 left-[25%] right-[25%] ">
          <Logout />
        </div>
      </div>

      {/* Main Chat Area */}
      {state.isChatUserSelect ? <MainChatArea /> : <ChatLanding />}
    </div>
  );
};
