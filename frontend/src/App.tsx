import { useSelector } from "react-redux";
import { ChatManage } from "./features/chat/one-to-one/Manage";
import type { RootState } from "./redux/store";
import { Login } from "./features/auth/Login";

const App = () => {
  const { authToken } = useSelector((state: RootState) => state.auth);

  function renderChat() {
    if (!authToken) return <Login />;
    return <ChatManage />;
  }

  return <div>{renderChat()}</div>;
};

export default App;
