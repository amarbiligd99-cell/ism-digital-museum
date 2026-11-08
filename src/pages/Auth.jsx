import { useState } from "react";
import { supabase } from "../services/supabase";
import { ArrowRight, Lock, Mail, User, X } from "lucide-react";
import "./Auth.css";

export default function Auth({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "register") {
        if (password.length < 6) {
          throw new Error("Нууц үг хамгийн багадаа 6 тэмдэгт байна.");
        }

        const { data, error: signUpError } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: fullName.trim(),
              },
            },
          });

        if (signUpError) throw signUpError;

        if (data.session) {
          onSuccess?.(data.session.user);
          onClose?.();
        } else {
          setMessage(
            "Бүртгэл амжилттай. Имэйл хаягаа шалгаж баталгаажуулна уу."
          );
        }
      } else {
        const { data, error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (loginError) throw loginError;

        onSuccess?.(data.user);
        onClose?.();
      }
    } catch (err) {
      setError(
        err.message || "Үйлдэл амжилтгүй боллоо. Дахин оролдоно уу."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div
        className="auth-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="auth-close"
          onClick={onClose}
          aria-label="Хаах"
        >
          <X size={20} />
        </button>

        <div className="auth-brand">
          <span>ISM</span>
          <div>
            <strong>DIGITAL</strong>
            <strong>MUSEUM</strong>
          </div>
        </div>

        <span className="auth-label">
          WELCOME TO ISM DIGITAL MUSEUM
        </span>

        <h2>
          {mode === "login" ? "Тавтай морилно уу." : "Бүртгэл үүсгэх."}
        </h2>

        <p className="auth-description">
          {mode === "login"
            ? "Өөрийн бүртгэлээр нэвтэрч музейн боломжуудыг ашиглаарай."
            : "ISM Digital Museum-д нэгдэж өөрийн бүтээлээ хуваалцаарай."}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <label className="auth-field">
              <span>Овог, нэр</span>
              <div>
                <User size={18} />
                <input
                  type="text"
                  placeholder="Нэрээ оруулна уу"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </label>
          )}

          <label className="auth-field">
            <span>Имэйл хаяг</span>
            <div>
              <Mail size={18} />
              <input
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Нууц үг</span>
            <div>
              <Lock size={18} />
              <input
                type="password"
                placeholder="Нууц үгээ оруулна уу"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </label>

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-success">{message}</p>}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Түр хүлээнэ үү..."
              : mode === "login"
                ? "Нэвтрэх"
                : "Бүртгүүлэх"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login"
            ? "Бүртгэлгүй юу?"
            : "Бүртгэлтэй юу?"}

          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setMessage("");
            }}
          >
            {mode === "login" ? "Бүртгүүлэх" : "Нэвтрэх"}
          </button>
        </div>
      </div>
    </div>
  );
}