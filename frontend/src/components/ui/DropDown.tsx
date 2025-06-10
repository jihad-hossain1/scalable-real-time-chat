"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";

// Add position configuration types
type DropdownPosition = "left" | "right" | "center";

type Position = {
  top: number;
  left: number;
};

type DropdownContextType = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  position: Position;
  setPosition: (position: Position) => void;
  close: () => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  dropdownPosition: DropdownPosition;
};

// Update props types to include position
type DropdownMenuProps = {
  children: React.ReactNode;
  onOpenChange?: (isOpen: boolean) => void;
  position?: DropdownPosition;
};

// Other type definitions remain the same
type DropdownMenuTriggerProps = {
  children: React.ReactNode;
  disabled?: boolean;
};

type DropdownMenuContentProps = {
  children: React.ReactNode;
  sideOffset?: number;
};

type DropdownMenuItemProps = {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
};

// Context
const DropdownContext = createContext<DropdownContextType | null>(null);

export const useDropdown = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("useDropdown must be used within a DropdownMenu");
  }
  return context;
};

// Updated DropdownMenu component with position prop
export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  children,
  onOpenChange,
  position = "left",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <DropdownContext.Provider
      value={{
        isOpen,
        setIsOpen,
        position: pos,
        setPosition,
        close,
        activeIndex,
        setActiveIndex,
        dropdownPosition: position,
      }}
    >
      <div ref={containerRef} className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

// Updated DropdownMenuTrigger with position-aware logic
export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({
  children,
  disabled = false,
}) => {
  const { isOpen, setIsOpen, setPosition } = useDropdown();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const offset = 4; // Added small offset

      setPosition({
        top: rect.height + offset,
        left: 0,
      });
    }
  }, [setPosition]);

  const handleClick = () => {
    if (disabled) return;

    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      const handleResize = () => updatePosition();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [isOpen, updatePosition]);

  return (
    <button
      ref={triggerRef}
      onClick={handleClick}
      aria-haspopup="true"
      aria-expanded={isOpen}
      disabled={disabled}
      className={`
        inline-flex items-center px-3 text-sm py-1
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      {children}
    </button>
  );
};

// Updated DropdownMenuContent with position-based styling
export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({
  children,
  sideOffset = 0,
}) => {
  const { isOpen, position, dropdownPosition } = useDropdown();
  const contentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const getPositionStyles = () => {
    const styles: React.CSSProperties = {
      top: position.top,
    };

    switch (dropdownPosition) {
      case "right":
        styles.right = 0;
        break;
      case "center":
        styles.left = "50%";
        styles.transform = "translateX(-50%)";
        break;
      case "left":
      default:
        styles.left = 0;
        break;
    }

    return styles;
  };

  return (
    <div
      ref={contentRef}
      className="absolute z-50 w-56 bg-white rounded-md shadow-lg ring-1 ring-black 
                 ring-opacity-5 focus:outline-none animate-in fade-in-80 
                 data-[side=bottom]:slide-in-from-top-2"
      style={getPositionStyles()}
      role="menu"
      aria-orientation="vertical"
    >
      <div className="py-1" role="none">
        {children}
      </div>
    </div>
  );
};

// Other components remain the same
export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  onClick,
  disabled = false,
  className = "",
}) => {
  const { close } = useDropdown();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onClick?.(e);
    close();
  };

  return (
    <button
      className={`
        w-full text-left px-4 py-2 text-sm text-gray-700
        ${!disabled && "hover:bg-gray-100 hover:text-gray-900"}
        focus:outline-none focus:bg-gray-100 focus:text-gray-900
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
      role="menuitem"
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const DropdownMenuLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div
      className="px-4 py-2 text-sm font-medium text-gray-900"
      role="presentation"
    >
      {children}
    </div>
  );
};

export const DropdownMenuSeparator: React.FC = () => {
  return <div className="h-px my-1 bg-gray-200" role="separator" />;
};
