import { useEffect, useState, useRef } from "react";
import io, { Socket } from "socket.io-client";
import { Send, Circle, Users, MessageCircle } from "lucide-react";

const SOCKET_URL = "http://localhost:8000";

export type Message = {
  id?: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  timestamp: Date;
};

export const ChatManage = () => {
  const socket = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState(1);
  const [receiverId, setReceiverId] = useState(2);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    socket.current = io(SOCKET_URL);

    socket.current.emit("register", userId);

    socket.current.on("private_message", (msg: Message) => {
      setMessages((prev) => [...prev, { ...msg, timestamp: new Date() }]);
    });

    socket.current.on("presence", (users: string[]) => setOnlineUsers(users));

    return () => {
      socket.current?.disconnect();
    };
  }, [userId]);

  const sendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const msg: Message = {
      sender_id: userId,
      receiver_id: receiverId,
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">ChatApp</h1>
              <p className="text-sm text-gray-500">Professional Messaging</p>
            </div>
          </div>
        </div>

        {/* Online Users */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2 mb-3">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Online Users
            </span>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
              {onlineUsers.length}
            </span>
          </div>
          <div className="space-y-2">
            {onlineUsers.map((user, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user.charAt(0).toUpperCase()}
                  </div>
                  <Circle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 text-green-500 fill-current" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* User Settings */}
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your ID
            </label>
            <input
              type="number"
              value={userId}
              onChange={(e) => setUserId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Receiver ID
            </label>
            <input
              type="number"
              value={receiverId}
              onChange={(e) => setReceiverId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
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
            const isOwnMessage = message.sender_id === userId;
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
    </div>
  );
};
