import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  getCurrentUser,
  login,
  logout,
  register,
} from "../services/authApi";
import type { AuthUser } from "../types/auth";

type AuthStatus = "loading" | "guest" | "authenticated";
type AuthMode = "login" | "register";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  requestAuth: (reason: string) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    void getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setStatus(currentUser ? "authenticated" : "guest");
      })
      .catch(() => {
        setUser(null);
        setStatus("guest");
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      requestAuth: (nextReason) => {
        setReason(nextReason);
        setDialogOpen(true);
      },
      signOut: async () => {
        await logout();
        setUser(null);
        setStatus("guest");
      },
    }),
    [status, user],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {dialogOpen ? (
        <AuthDialog
          reason={reason}
          onAuthenticated={(nextUser) => {
            setUser(nextUser);
            setStatus("authenticated");
            setDialogOpen(false);
          }}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

type AuthDialogProps = {
  reason: string;
  onAuthenticated: (user: AuthUser) => void;
  onClose: () => void;
};

function AuthDialog({
  reason,
  onAuthenticated,
  onClose,
}: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const nextUser =
        mode === "login"
          ? await login({ email, password })
          : await register({ name, email, password });

      onAuthenticated(nextUser);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="auth-dialog-title"
        aria-modal="true"
        className="auth-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="auth-dialog-header">
          <div>
            <h2 id="auth-dialog-title">
              {mode === "login" ? "Sign in to ArchFlow" : "Create your account"}
            </h2>
            <p>{reason || "Access your saved boards from this browser."}</p>
          </div>
          <button
            aria-label="Close authentication dialog"
            className="icon-button"
            type="button"
            onClick={onClose}
          >
            X
          </button>
        </div>

        <div className="auth-mode-tabs" role="tablist" aria-label="Authentication mode">
          <button
            aria-selected={mode === "login"}
            className={mode === "login" ? "auth-mode-active" : ""}
            role="tab"
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Sign in
          </button>
          <button
            aria-selected={mode === "register"}
            className={mode === "register" ? "auth-mode-active" : ""}
            role="tab"
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label>
              Name
              <input
                autoComplete="name"
                className="text-input"
                maxLength={60}
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          ) : null}
          <label>
            Email
            <input
              autoComplete="email"
              className="text-input"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="text-input"
              minLength={8}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="status-text status-error">{error}</p> : null}
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="auth-guest-note">
          You can close this and continue designing as a guest.
        </p>
      </section>
    </div>
  );
}
