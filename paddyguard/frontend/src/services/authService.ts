import { authApi } from "./api";
import { useAuthStore } from "../store/authStore";

const decodeUserId = (accessToken: string): string => {
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1]));
    return payload.sub ?? "";
  } catch {
    return "";
  }
};

export const register = async (
  email: string,
  password: string,
  full_name: string
) => {
  const tokens = await authApi.register(email, password, full_name);
  const user = { id: decodeUserId(tokens.access_token), email, full_name };
  useAuthStore.getState().setAuth(user, tokens.access_token, tokens.refresh_token);
  return tokens;
};

export const login = async (email: string, password: string) => {
  const tokens = await authApi.login(email, password);
  const user = { id: decodeUserId(tokens.access_token), email, full_name: null };
  useAuthStore.getState().setAuth(user, tokens.access_token, tokens.refresh_token);
  return tokens;
};

export const logout = () => {
  useAuthStore.getState().logout();
};

export const refreshToken = async () => {
  const { refreshToken: current, setTokens } = useAuthStore.getState();
  if (!current) throw new Error("No refresh token available");
  const tokens = await authApi.refresh(current);
  setTokens(tokens.access_token, tokens.refresh_token);
  return tokens;
};
