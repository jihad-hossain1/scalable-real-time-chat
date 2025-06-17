import { Circle, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useChatContext } from "../hooks/useChatContext";
import type { TUser } from "../types";
import { useSelector } from "react-redux";
import type { RootState } from "../../../../redux/store";
import io from "socket.io-client";

// Debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

export const OnlineUser = () => {
  const { updateReciverId, updateIsChatSelect, updateSelectedUser } =
    useChatContext();
  // const {state} = useContext(ChatContext)
  const { id: loggedUserId } = useSelector((state: RootState) => state.auth);
  const [onlineUsers, setOnlineUsers] = useState<TUser[]>([]);
  const [query, setQuery] = useState<string>("");
  const [isSearchSelected, setIsSearchSelected] = useState<boolean>(false);

  const debouncedQuery = useDebounce(query, 500);

  const fetchOnlineUsers = useCallback(async (search = "") => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/users?query=${search}&loggedUserId=${loggedUserId}`
      );
      const data = await res.json();
      console.log(data);
      setOnlineUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchOnlineUsers();
  }, [fetchOnlineUsers]);

  // Fetch when debounced query changes
  useEffect(() => {
    if (isSearchSelected && debouncedQuery !== "") {
      fetchOnlineUsers(debouncedQuery);
    }
  }, [debouncedQuery, fetchOnlineUsers, isSearchSelected]);

  const handleClick = (isUser: TUser | null) => {
    updateReciverId(Number(isUser?.id!));
    updateIsChatSelect(true);
    updateSelectedUser(isUser!);
  };

  useEffect(() => {
    const socket = io("http://localhost:8000");
    socket.emit("register", loggedUserId);

    socket.on("presence", (userIds: string[]) => {
      // Update online status for users
      setOnlineUsers(prev => prev.map(user => ({
        ...user,
        isOnline: userIds.includes(String(user.id))
      })));
    });

    return () => {
      socket.disconnect();
    };
  }, [loggedUserId]);

  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex justify-between">
        <div className="flex items-center space-x-2 mb-3">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Online Users
          </span>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
            {onlineUsers.length}
          </span>
        </div>
        <button
          onClick={() => {
            setIsSearchSelected(!isSearchSelected);
            setQuery(""); // reset search on toggle
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          {isSearchSelected ? "cancel" : "search"}
        </button>
      </div>

      {isSearchSelected && (
        <div className="flex items-center space-x-2 mb-3">
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          />
          <button
            onClick={() => fetchOnlineUsers(query)}
            className="text-gray-500 hover:text-gray-700"
          >
            search
          </button>
        </div>
      )}

      <div className="space-y-2">
        {onlineUsers.map((user) => (
          <div
            onClick={() => handleClick(user)}
            key={user.id}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <Circle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-green-500 fill-current" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {user.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
