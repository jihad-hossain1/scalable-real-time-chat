import { useState, useEffect } from "react";
import {
  MessageCircle,
  Users,
  Zap,
  Heart,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const ChatLanding = () => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const features = [
    {
      icon: MessageCircle,
      text: "Real-time messaging",
      color: "text-blue-500",
    },
    { icon: Users, text: "Connect with friends", color: "text-green-500" },
    { icon: Zap, text: "Lightning fast", color: "text-yellow-500" },
    { icon: Heart, text: "Built with love", color: "text-red-500" },
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-20 animate-bounce delay-1000">
        <div className="w-3 h-3 bg-blue-400 rounded-full opacity-60"></div>
      </div>
      <div className="absolute top-40 right-32 animate-bounce delay-2000">
        <div className="w-2 h-2 bg-purple-400 rounded-full opacity-60"></div>
      </div>
      <div className="absolute bottom-32 left-32 animate-bounce">
        <div className="w-4 h-4 bg-green-400 rounded-full opacity-60"></div>
      </div>

      {/* Main Content */}
      <div
        className={`text-center z-10 transition-all duration-1000 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Logo/Icon */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/25 transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <MessageCircle className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-2 -right-2">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
        </div>

        {/* Welcome Text */}
        <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Welcome to Chat
        </h1>

        <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
          Connect, share, and stay in touch with friends in real-time
        </p>

        {/* Animated Feature Display */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-4 shadow-lg border border-white/20">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`flex items-center space-x-2 transition-all duration-500 ${
                    index === currentFeature
                      ? "opacity-100 scale-110"
                      : "opacity-40 scale-90"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${feature.color}`} />
                  {index === currentFeature && (
                    <span className="text-gray-700 font-medium whitespace-nowrap">
                      {feature.text}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Call to Action */}
        <div className="space-y-4">
          <div className="flex items-center justify-center text-gray-500 text-sm">
            <ArrowRight className="w-4 h-4 mr-2" />
            Select a user from the sidebar to start chatting
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-center space-x-8 mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">24/7</div>
              <div className="text-sm text-gray-500">Online</div>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">∞</div>
              <div className="text-sm text-gray-500">Messages</div>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">0ms</div>
              <div className="text-sm text-gray-500">Delay</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave Animation */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          className="w-full h-24 text-white/30"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,60 C150,90 350,30 600,60 C850,90 1050,30 1200,60 L1200,120 L0,120 Z"
            className="fill-current opacity-50"
          >
            <animate
              attributeName="d"
              dur="10s"
              repeatCount="indefinite"
              values="M0,60 C150,90 350,30 600,60 C850,90 1050,30 1200,60 L1200,120 L0,120 Z;
                        M0,60 C150,30 350,90 600,60 C850,30 1050,90 1200,60 L1200,120 L0,120 Z;
                        M0,60 C150,90 350,30 600,60 C850,90 1050,30 1200,60 L1200,120 L0,120 Z"
            />
          </path>
        </svg>
      </div>
    </div>
  );
};
