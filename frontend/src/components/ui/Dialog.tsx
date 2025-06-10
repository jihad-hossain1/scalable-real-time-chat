"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface DialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onClose?: () => void;
}

const DialogContext = createContext<DialogContextType>({
  open: false,
  onOpenChange: () => {},
});

const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("Dialog components must be used within a Dialog provider");
  }
  return context;
};

const Dialog: React.FC<DialogProps> = ({
  children,
  open = false,
  onOpenChange = () => {},
}) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, className = "", onClose, ...props }, ref) => {
    const { open, onOpenChange } = useDialog();
    const contentRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    const handleContentClick = (e: React.MouseEvent) => {
      e.stopPropagation();
    };

    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          onOpenChange(false);
          onClose?.();
        }
      };

      const handleClickOutside = (event: MouseEvent) => {
        if (overlayRef.current === event.target) {
          onOpenChange(false);
          onClose?.();
        }
      };

      if (open) {
        document.addEventListener("keydown", handleEscape);
        document.addEventListener("mousedown", handleClickOutside);
        document.body.style.overflow = "hidden";
      }

      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.removeEventListener("mousedown", handleClickOutside);
        document.body.style.overflow = "unset";
      };
    }, [open, onOpenChange, onClose]);

    if (!open) return null;

    return createPortal(
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
      >
        <div
          role="dialog"
          aria-modal="true"
          ref={contentRef}
          onClick={handleContentClick}
          onMouseDown={handleContentClick}
          className={`fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%] gap-4 border border-gray-200 bg-white p-6 shadow-lg duration-200 sm:rounded-lg ${className}`}
          {...props}
        >
          {children}
        </div>
      </div>,
      document.body
    );
  }
);
DialogContent.displayName = "DialogContent";

const DialogClose: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  ...props
}) => {
  const { onOpenChange } = useDialog();
  return (
    <button type="button" onClick={() => onOpenChange(false)} {...props}>
      {children}
    </button>
  );
};

Dialog.displayName = "Dialog";
export { DialogClose, DialogContent };
export { Dialog };
