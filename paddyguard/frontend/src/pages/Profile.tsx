import React from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Mail } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { logout } from "../services/authService";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex flex-col px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
      <h1 className="font-sinhala text-lg font-bold text-forest">ගිණුම | Profile</h1>

      <Card className="mt-4 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-beige">
          <User size={26} className="text-forest" />
        </div>
        <div>
          <p className="font-bold text-forest">{user?.full_name || "ගොවියා"}</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-muted">
            <Mail size={12} />
            <span>{user?.email}</span>
          </div>
        </div>
      </Card>

      <div className="mt-6">
        <Button variant="danger" fullWidth icon={LogOut} onClick={handleLogout}>
          <span className="font-sinhala">ඉවත් වන්න | Logout</span>
        </Button>
      </div>
    </div>
  );
};

export default Profile;
