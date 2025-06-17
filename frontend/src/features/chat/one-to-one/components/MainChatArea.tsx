import { Circle, EllipsisVertical, Send } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { useChatContext } from "../hooks/useChatContext";
import { useSelector } from "react-redux";
import type { RootState } from "../../../../redux/store";
import { ChatAction } from "./actions/ChatAction";
import { CallAction } from "./actions/CallAction";

const SOCKET_URL = "http://localhost:8000";

export type Message = {
  id?: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  timestamp: Date;
};

export const MainChatArea = () => {
  const { receiverId, selectedUser } = useChatContext();
  const { id: userId } = useSelector((state: RootState) => state.auth);
  const [page, setPage] = useState(1);

  const socket = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<any | null>(null);

  // Auto scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessage = useCallback(async () => {
    if (!userId || !receiverId) return;
    const response = await fetch(
      `${SOCKET_URL}/api/messages?senderId=${userId}&receiverId=${receiverId}`
    );
    const data = await response.json();

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

    socket.current.on("typing", (senderId: number) => {
      if (senderId === receiverId) {
        setIsTyping(true);
        // Auto-hide typing indicator after 3 seconds
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
        }, 3000);
      }
    });

    socket.current.on("stop typing", (senderId: number) => {
      if (senderId === receiverId) {
        setIsTyping(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    });

    return () => {
      socket.current?.disconnect();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [userId, receiverId]);

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
    socket.current?.emit("stop typing", { senderId: userId, receiverId });
    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    
    // Emit typing event
    socket.current?.emit("typing", { senderId: userId, receiverId });
    
    // Set timeout to emit stop typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket.current?.emit("stop typing", { senderId: userId, receiverId });
    }, 2000);
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; // Convert to 12-hour format
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  }
  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">
            U{receiverId}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              {selectedUser?.name}
            </h2>
            <p className="text-sm text-green-600 flex items-center">
              <Circle className="w-2 h-2 fill-current mr-1" />
              Online
            </p>
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <CallAction />
          <ChatAction />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message, index) => {
          const isOwnMessage = message.sender_id == userId;
          return (
            <div
              key={index}
              className={`flex ${
                isOwnMessage ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-0.5 rounded-md ${
                  isOwnMessage
                    ? "bg-blue-100  rounded-br-md text-right"
                    : "bg-white text-gray-800 text-start rounded-bl-md shadow-sm border border-gray-100"
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
        {isTyping && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-md bg-gray-100 text-gray-600">
              {selectedUser?.name} is typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
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
