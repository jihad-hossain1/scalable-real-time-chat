import { Circle, Send } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { useChatContext } from "../hooks/useChatContext";
import { useSelector } from "react-redux";
import type { RootState } from "../../../../redux/store";

const SOCKET_URL = "http://localhost:8000";

export type Message = {
  id?: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  timestamp: Date;
};

export const MainChatArea = () => {
  const { receiverId } = useChatContext();
  const { id: userId } = useSelector((state: RootState) => state.auth);

  const socket = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const fetchMessage = useCallback(async () => {
    if (!userId || !receiverId) return;
    const response = await fetch(
      `${SOCKET_URL}/api/messages?senderId=${userId}&receiverId=${receiverId}`
    );
    const data = await response.json();
    console.log("🚀 ~ fetchMessage ~ data:", data);

    setMessages(data);
  }, [userId, receiverId]);

  useEffect(() => {
    fetchMessage();
  }, [userId, receiverId, fetchMessage]);

  useEffect(() => {
    socket.current = io(SOCKET_URL);

    socket.current.emit("register", userId);

    socket.current.on("private_message", (msg: Message) => {
      setMessages((prev) => [...prev, { ...msg, timestamp: new Date() }]);
    });

    // socket.current.on("presence", (users: string[]) => setOnlineUsers(users));

    return () => {
      socket.current?.disconnect();
    };
  }, [userId]);

  const sendMessage = (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const msg: Message = {
      sender_id: Number(userId),
      receiver_id: receiverId!,
      content: input,
      timestamp: new Date(),
    };

    socket.current?.emit("private_message", msg);
    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">
            U{receiverId}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">User {receiverId}</h2>
            <p className="text-sm text-green-600 flex items-center">
              <Circle className="w-2 h-2 fill-current mr-1" />
              Online
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => {
          const isOwnMessage = message.sender_id == userId;
          // const isReciverMessage = message.receiver_id == receiverId;

          return (
            <div
              key={index}
              className={`flex ${
                isOwnMessage ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  isOwnMessage
                    ? "bg-blue-500 text-white rounded-br-md"
                    : "bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    isOwnMessage ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  {message.timestamp ? formatTime(message.timestamp) : "Now"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage(e)}
              placeholder="Type your message..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="flex items-center justify-center w-12 h-12 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-2xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
