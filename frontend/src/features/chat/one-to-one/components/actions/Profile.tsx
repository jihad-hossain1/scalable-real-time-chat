import { useChatContext } from "../../hooks/useChatContext";

export const Profile = () => {
  const { selectedUser } = useChatContext();

  return (
    <div className="">
      <h4 className="text-xl font-bold mb-4 text-center">Profile</h4>
      <div className="space-y-2">
        <p>
          <strong>Name:</strong> {selectedUser?.name}
        </p>
        <p>
          <strong>Email:</strong> {selectedUser?.email}
        </p>
        <p>
          <strong>ID:</strong> {selectedUser?.id}
        </p>
      </div>
    </div>
  );
};
