import { useState } from "react";
import { LogOut, X, AlertTriangle } from "lucide-react";
import { Dialog, DialogClose, DialogContent } from "../../components/ui/Dialog";
import { useDispatch } from "react-redux";
import { logoutUser } from "../../redux/features/authSlice";

export const Logout = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const handleLogout = () => {
    setIsLoading(true);
    dispatch(logoutUser());
    setIsLoading(false);
    window.location.href = "/";
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    console.log("Logout cancelled");
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 text-red-600 font-semibold hover:text-red-700 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span>Logout</span>
      </button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md mx-auto rounded-xl p-6 bg-white shadow-xl space-y-6">
          <DialogClose className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </DialogClose>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="bg-red-100 text-red-600 p-4 rounded-full">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              Are you sure you want to log out?
            </h2>
            <p className="text-gray-500 text-sm">
              You’ll be signed out of your account. Make sure your work is
              saved.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition flex items-center justify-center gap-2 ${
                isLoading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              )}
              <span>Logout</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
