import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Wheat, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { login } from "../services/authService";
import Button from "../components/ui/Button";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "විද්‍යුත් තැපෑල හෝ මුරපදය වැරදිය | Invalid email or password";
      setError(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-cream">
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-6 pt-16">
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest">
            <Wheat size={32} className="text-amber" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-forest">PaddyGuard AI</h1>
          <p className="font-sinhala mt-1 text-sm text-forest-light">
            ඔබේ ගිණුමට ඇතුළු වන්න
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col gap-4 rounded-[20px] bg-white p-6 shadow-card"
        >
          <div>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="විද්‍යුත් තැපෑල"
              className="font-sinhala h-12 w-full rounded-[10px] border border-transparent bg-beige px-4 text-sm text-forest transition-all duration-200 focus:border-forest focus:outline-none"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="මුරපදය"
              className="font-sinhala h-12 w-full rounded-[10px] border border-transparent bg-beige px-4 pr-11 text-sm text-forest transition-all duration-200 focus:border-forest focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-muted"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div className="animate-slide-up rounded-full bg-red-soft/10 px-4 py-2 text-center text-xs font-medium text-red-soft">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            <span className="font-sinhala">ඇතුළු වන්න | Login</span>
          </Button>

          <div className="my-1 flex items-center gap-3">
            <div className="h-px flex-1 bg-beige" />
            <span className="font-sinhala text-xs text-gray-muted">හෝ | or</span>
            <div className="h-px flex-1 bg-beige" />
          </div>

          <Link
            to="/register"
            className="font-sinhala text-center text-sm font-medium text-forest underline"
          >
            ගිණුමක් නැද්ද? ලියාපදිංචි වන්න
          </Link>
        </form>
      </div>

      <div
        className="pointer-events-none h-[30vh] w-full"
        style={{
          background:
            "linear-gradient(180deg, rgba(52,79,31,0) 0%, rgba(74,107,42,0.15) 60%, rgba(52,79,31,0.35) 100%)",
        }}
      />
    </div>
  );
};

export default Login;
