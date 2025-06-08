import React from "react";
import type { Action, State } from "../types";

const initialState: State = {
  messages: [],
  onlineUsers: [],
  receiverId: null,
  filter: {
    query: "",
  },
  isChatUserSelect: false,
  isSidebarOpen: false,
  selectedUser: null,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_STATE":
      return action.payload;
    case "UPDATE_STATE":
      return {
        ...state,
        ...action.payload,
      };
    case "RESET":
      return initialState;
    default:
      throw new Error("Unknown action type");
  }
};

export const ChatContext = React.createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>({
  state: initialState,
  dispatch: () => {},
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
};
