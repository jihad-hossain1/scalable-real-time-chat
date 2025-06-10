import React, { useContext } from "react";
import { ChatContext } from "../context/ChatContext";
import type { TUser } from "../types";

export const useChatContext = () => {
  const { state, dispatch } = useContext(ChatContext);
  const { receiverId } = state;

  const messages = React.useMemo(() => state.messages, [state.messages]);

  const updateSearch = React.useCallback(
    (query: string) => {
      dispatch({
        type: "UPDATE_STATE",
        payload: {
          filter: {
            ...state.filter,
            query,
          },
        },
      });
    },
    [dispatch, state.filter]
  );

  const resetFilter = React.useCallback(() => {
    dispatch({
      type: "RESET",
    });
  }, [dispatch]);

  const updateReciverId = React.useCallback((userId: number) => {
    dispatch({
      type: "UPDATE_STATE",
      payload: { receiverId: userId },
    });
  }, []);

  const updateIsChatSelect = React.useCallback((isSelect: boolean) => {
    dispatch({
      type: "UPDATE_STATE",
      payload: { isChatUserSelect: isSelect },
    });
  }, []);

  const updateIsSidebar = React.useCallback((isOpen: boolean) => {
    dispatch({
      type: "UPDATE_STATE",
      payload: { isSidebarOpen: isOpen },
    });
  }, []);

  const updateSelectedUser = React.useCallback((user: TUser) => {
    dispatch({
      type: "UPDATE_STATE",
      payload: { selectedUser: user },
    });
  }, []);

  return {
    messages,
    updateSearch,
    resetFilter,
    updateReciverId,
    receiverId,
    updateIsChatSelect,
    updateIsSidebar,
    updateSelectedUser,
    selectedUser: state.selectedUser,
  };
};
