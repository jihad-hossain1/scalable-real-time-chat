import { Header } from "./components/Header";
import { OnlineUser } from "./components/OnlineUser";
import { MainChatArea } from "./components/MainChatArea";
import { ChatProvider } from "./context/ChatContext";

export const ChatManage = () => {
  return (
    <ChatProvider>
      <Chat />
    </ChatProvider>
  );
};

const Chat = () => {
  // const { isLoading, error, refetch } = useFetchAccount();
  // const { accounts, pagination, updatePage, updatePageSize } =
  //   useAccountContext();
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <Header />

        {/* Online Users */}
        <OnlineUser />
      </div>

      {/* Main Chat Area */}
      <MainChatArea />
    </div>
  );
};
