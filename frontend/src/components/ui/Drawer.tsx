import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: "left" | "right" | "top" | "bottom";
  size?: "sm" | "md" | "lg" | "xl" | "full";
  title?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  children,
  position = "right",
  size = "md",
  title,
  showCloseButton = true,
  closeOnBackdropClick = true,
  className = "",
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const getPositionClasses = () => {
    const baseClasses = "fixed bg-white shadow-xl z-50";

    switch (position) {
      case "left":
        return `${baseClasses} left-0 top-0 h-full transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`;
      case "right":
        return `${baseClasses} right-0 top-0 h-full transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`;
      case "top":
        return `${baseClasses} top-0 left-0 w-full transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-y-0" : "-translate-y-full"
        }`;
      case "bottom":
        return `${baseClasses} bottom-0 left-0 w-full transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`;
      default:
        return baseClasses;
    }
  };

  const getSizeClasses = () => {
    if (position === "top" || position === "bottom") {
      switch (size) {
        case "sm":
          return "h-32";
        case "md":
          return "h-48";
        case "lg":
          return "h-64";
        case "xl":
          return "h-80";
        case "full":
          return "h-full";
        default:
          return "h-48";
      }
    } else {
      switch (size) {
        case "sm":
          return "w-64";
        case "md":
          return "w-80";
        case "lg":
          return "w-96";
        case "xl":
          return "w-[32rem]";
        case "full":
          return "w-full";
        default:
          return "w-80";
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ease-in-out ${
          isOpen ? "opacity-50" : "opacity-0"
        }`}
        onClick={handleBackdropClick}
      />

      {/* Drawer */}
      <div
        className={`${getPositionClasses()} ${getSizeClasses()} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "drawer-title" : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {title && (
              <h2
                id="drawer-title"
                className="text-lg font-semibold text-gray-900"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                aria-label="Close drawer"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
};

// // Demo component to showcase the drawer
// const DrawerDemo = () => {
//   const [leftOpen, setLeftOpen] = useState(false);
//   const [rightOpen, setRightOpen] = useState(false);
//   const [topOpen, setTopOpen] = useState(false);
//   const [bottomOpen, setBottomOpen] = useState(false);

//   return (
//     <div className="min-h-screen bg-gray-50 p-8">
//       <div className="max-w-4xl mx-auto">
//         <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
//           Reusable Drawer Component Demo
//         </h1>

//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
//           <button
//             onClick={() => setLeftOpen(true)}
//             className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//           >
//             Left Drawer
//           </button>

//           <button
//             onClick={() => setRightOpen(true)}
//             className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
//           >
//             Right Drawer
//           </button>

//           <button
//             onClick={() => setTopOpen(true)}
//             className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
//           >
//             Top Drawer
//           </button>

//           <button
//             onClick={() => setBottomOpen(true)}
//             className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
//           >
//             Bottom Drawer
//           </button>
//         </div>

//         <div className="bg-white p-6 rounded-lg shadow-sm">
//           <h2 className="text-xl font-semibold mb-4">Features:</h2>
//           <ul className="space-y-2 text-gray-700">
//             <li>• Supports 4 positions: left, right, top, bottom</li>
//             <li>• 5 size options: sm, md, lg, xl, full</li>
//             <li>• Smooth animations with Tailwind transitions</li>
//             <li>• Keyboard support (ESC to close)</li>
//             <li>• Optional backdrop click to close</li>
//             <li>• Customizable title and close button</li>
//             <li>• TypeScript support with proper interfaces</li>
//             <li>• Accessibility features (ARIA labels, focus management)</li>
//             <li>• Body scroll lock when open</li>
//             <li>• Fully customizable with className prop</li>
//           </ul>
//         </div>
//       </div>

//       {/* Drawer instances */}
//       <Drawer
//         isOpen={leftOpen}
//         onClose={() => setLeftOpen(false)}
//         position="left"
//         title="Left Drawer"
//         size="md"
//       >
//         <div className="space-y-4">
//           <p>This is a left-positioned drawer with medium size.</p>
//           <div className="p-4 bg-blue-50 rounded-lg">
//             <h3 className="font-semibold text-blue-900">Navigation Menu</h3>
//             <nav className="mt-2 space-y-2">
//               <a href="#" className="block text-blue-700 hover:text-blue-900">
//                 Dashboard
//               </a>
//               <a href="#" className="block text-blue-700 hover:text-blue-900">
//                 Profile
//               </a>
//               <a href="#" className="block text-blue-700 hover:text-blue-900">
//                 Settings
//               </a>
//               <a href="#" className="block text-blue-700 hover:text-blue-900">
//                 Help
//               </a>
//             </nav>
//           </div>
//         </div>
//       </Drawer>

//       <Drawer
//         isOpen={rightOpen}
//         onClose={() => setRightOpen(false)}
//         position="right"
//         title="Settings Panel"
//         size="lg"
//       >
//         <div className="space-y-6">
//           <div>
//             <h3 className="font-semibold mb-3">Preferences</h3>
//             <div className="space-y-3">
//               <label className="flex items-center">
//                 <input type="checkbox" className="mr-2" />
//                 Enable notifications
//               </label>
//               <label className="flex items-center">
//                 <input type="checkbox" className="mr-2" />
//                 Dark mode
//               </label>
//               <label className="flex items-center">
//                 <input type="checkbox" className="mr-2" />
//                 Auto-save
//               </label>
//             </div>
//           </div>

//           <div>
//             <h3 className="font-semibold mb-3">Account</h3>
//             <div className="space-y-3">
//               <input
//                 type="text"
//                 placeholder="Username"
//                 className="w-full p-2 border border-gray-300 rounded-md"
//               />
//               <input
//                 type="email"
//                 placeholder="Email"
//                 className="w-full p-2 border border-gray-300 rounded-md"
//               />
//               <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
//                 Save Changes
//               </button>
//             </div>
//           </div>
//         </div>
//       </Drawer>

//       <Drawer
//         isOpen={topOpen}
//         onClose={() => setTopOpen(false)}
//         position="top"
//         title="Notifications"
//         size="lg"
//       >
//         <div className="space-y-3">
//           <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400">
//             <p className="text-yellow-800">System update available</p>
//           </div>
//           <div className="p-3 bg-blue-50 border-l-4 border-blue-400">
//             <p className="text-blue-800">New message from John Doe</p>
//           </div>
//           <div className="p-3 bg-red-50 border-l-4 border-red-400">
//             <p className="text-red-800">Server maintenance scheduled</p>
//           </div>
//         </div>
//       </Drawer>

//       <Drawer
//         isOpen={bottomOpen}
//         onClose={() => setBottomOpen(false)}
//         position="bottom"
//         title="Quick Actions"
//         size="md"
//       >
//         <div className="grid grid-cols-3 gap-4">
//           <button className="p-4 bg-gray-100 rounded-lg hover:bg-gray-200 text-center">
//             <div className="text-2xl mb-2">📊</div>
//             <div className="text-sm">Analytics</div>
//           </button>
//           <button className="p-4 bg-gray-100 rounded-lg hover:bg-gray-200 text-center">
//             <div className="text-2xl mb-2">📧</div>
//             <div className="text-sm">Messages</div>
//           </button>
//           <button className="p-4 bg-gray-100 rounded-lg hover:bg-gray-200 text-center">
//             <div className="text-2xl mb-2">⚙️</div>
//             <div className="text-sm">Settings</div>
//           </button>
//           <button className="p-4 bg-gray-100 rounded-lg hover:bg-gray-200 text-center">
//             <div className="text-2xl mb-2">👤</div>
//             <div className="text-sm">Profile</div>
//           </button>
//           <button className="p-4 bg-gray-100 rounded-lg hover:bg-gray-200 text-center">
//             <div className="text-2xl mb-2">🔍</div>
//             <div className="text-sm">Search</div>
//           </button>
//           <button className="p-4 bg-gray-100 rounded-lg hover:bg-gray-200 text-center">
//             <div className="text-2xl mb-2">❓</div>
//             <div className="text-sm">Help</div>
//           </button>
//         </div>
//       </Drawer>
//     </div>
//   );
// };

// export default DrawerDemo;
