import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Wheat, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { register as registerUser } from "../services/authService";
import Button from "../components/ui/Button";

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!fullName.trim()) next.fullName = "සම්පූර්ණ නම අවශ්‍යයි | Required";
    if (!email.trim()) next.email = "විද්‍යුත් තැපෑල අවශ්‍යයි | Required";
    if (password.length < 8)
      next.password = "අවම වශයෙන් අකුරු 8ක් | Min 8 characters";
    if (password !== confirmPassword)
      next.confirmPassword = "මුරපද නොගැලපේ | Passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await registerUser(email, password, fullName);
      navigate("/", { replace: true });
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "ලියාපදිංචි වීමට නොහැකි විය | Registration failed";
      setSubmitError(detail);
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-cream">
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-6 pt-12">
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest">
            <Wheat size={32} className="text-amber" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-forest">PaddyGuard AI</h1>
          <p className="font-sinhala mt-1 text-sm text-forest-light">
            නව ගිණුමක් සාදන්න
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4 rounded-[20px] bg-white p-6 shadow-card"
        >
          <div>
            <input
              type="text"
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="සම්පූර්ණ නම | Full Name"
              className="font-sinhala h-12 w-full rounded-[10px] border border-transparent bg-beige px-4 text-sm text-forest transition-all duration-200 focus:border-forest focus:outline-none"
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-soft">{errors.fullName}</p>
            )}
          </div>

          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="විද්‍යුත් තැපෑල | Email"
              className="font-sinhala h-12 w-full rounded-[10px] border border-transparent bg-beige px-4 text-sm text-forest transition-all duration-200 focus:border-forest focus:outline-none"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-soft">{errors.email}</p>
            )}
          </div>

          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="මුරපදය | Password"
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
            {errors.password && (
              <p className="mt-1 text-xs text-red-soft">{errors.password}</p>
            )}
          </div>

          <div>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="මුරපදය තහවුරු කරන්න | Confirm"
              className="font-sinhala h-12 w-full rounded-[10px] border border-transparent bg-beige px-4 text-sm text-forest transition-all duration-200 focus:border-forest focus:outline-none"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-soft">{errors.confirmPassword}</p>
            )}
          </div>

          {submitError && (
            <div className="animate-slide-up rounded-full bg-red-soft/10 px-4 py-2 text-center text-xs font-medium text-red-soft">
              {submitError}
            </div>
          )}

          <Button type="submit" variant="primary" fullWidth loading={loading}>
            <span className="font-sinhala">ලියාපදිංචි වන්න | Register</span>
          </Button>

          <Link
            to="/login"
            className="font-sinhala text-center text-sm font-medium text-forest underline"
          >
            දැනටමත් ගිණුමක් තිබේද? ඇතුළු වන්න
          </Link>
        </form>
      </div>

      <div
        className="pointer-events-none h-[20vh] w-full"
        style={{
          background:
            "linear-gradient(180deg, rgba(52,79,31,0) 0%, rgba(74,107,42,0.15) 60%, rgba(52,79,31,0.35) 100%)",
        }}
      />
    </div>
  );
};

export default Register;
