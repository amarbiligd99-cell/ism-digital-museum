import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Pencil,
  Clock3,
  CheckCircle2,
  XCircle,
  Send,
  Trash2,
} from "lucide-react";
import { supabase } from "../services/supabase";
import "./StudentDashboard.css";

const emptyForm = {
  title: "",
  description: "",
  category_id: "",
  technology: "",
  project_url: "",
};

export default function StudentDashboard({ user, onClose }) {
  const [exhibits, setExhibits] = useState([]);
  const [requests, setRequests] = useState([]);
  const [deleteRequests, setDeleteRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError("");

    try {
      const [exhibitResult, requestResult, categoryResult, deleteResult] =
        await Promise.all([
          supabase
            .from("exhibits")
            .select("*")
            .eq("created_by", user.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("exhibit_edit_requests")
            .select("*")
            .eq("requested_by", user.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("categories")
            .select("id, name")
            .order("name"),

          supabase
            .from("exhibit_delete_requests")
            .select("*")
            .eq("requested_by", user.id)
            .order("created_at", { ascending: false }),
        ]);

      if (exhibitResult.error) throw exhibitResult.error;
      if (requestResult.error) throw requestResult.error;
      if (categoryResult.error) throw categoryResult.error;
      if (deleteResult.error) throw deleteResult.error;

      setExhibits(exhibitResult.data || []);
      setRequests(requestResult.data || []);
      setCategories(categoryResult.data || []);
      setDeleteRequests(deleteResult.data || []);
    } catch (err) {
      console.error("Student dashboard error:", err);
      setError(err.message || "Мэдээлэл татахад алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCategory = (id) =>
    categories.find((item) => String(item.id) === String(id))?.name ||
    "Ангилал тодорхойгүй";

  const getRequest = (exhibitId) =>
    requests.find(
      (item) =>
        String(item.exhibit_id) === String(exhibitId) &&
        item.status === "pending"
    );

  const startEdit = (item) => {
    if (getRequest(item.id)) {
      setError("Энэ бүтээлд хүлээгдэж буй хүсэлт аль хэдийн байна.");
      return;
    }

    setEditing(item);
    setForm({
      title: item.title || "",
      description: item.description || "",
      category_id: item.category_id || "",
      technology: item.technology || "",
      project_url: item.project_url || "",
    });
    setError("");
    setNotice("");
  };

  const sendRequest = async (event) => {
    event.preventDefault();

    if (!editing || !user?.id) return;

    if (!form.title.trim() || !form.description.trim()) {
      setError("Бүтээлийн нэр болон тайлбарыг бөглөнө үү.");
      return;
    }

    setSending(true);
    setError("");
    setNotice("");

    try {
      const { error: insertError } = await supabase
        .from("exhibit_edit_requests")
        .insert({
          exhibit_id: editing.id,
          requested_by: user.id,
          title: form.title.trim(),
          description: form.description.trim(),
          category_id: form.category_id || null,
          technology: form.technology.trim() || null,
          project_url: form.project_url.trim() || null,
          status: "pending",
        });

      if (insertError) throw insertError;

      setEditing(null);
      setForm(emptyForm);
      setNotice("Засварлах хүсэлт амжилттай илгээгдлээ.");
      await loadData();
    } catch (err) {
      console.error("Edit request error:", err);
      setError(err.message || "Хүсэлт илгээхэд алдаа гарлаа.");
    } finally {
      setSending(false);
    }
  };

  const requestDelete = async (item) => {
    if (
      deleteRequests.some(
        (r) => r.exhibit_id === item.id && r.status === "pending"
      )
    ) {
      setError("Энэ бүтээлийн устгах хүсэлт хянагдаж байна.");
      return;
    }

    const reason = window.prompt(
      `"${item.title}" бүтээлийг устгуулах шалтгаанаа бичнэ үү:`
    );

    if (reason === null) return;

    if (!reason.trim()) {
      setError("Устгах шалтгаанаа бичнэ үү.");
      return;
    }

    setSending(true);
    setError("");
    setNotice("");

    try {
      const { error } = await supabase
        .from("exhibit_delete_requests")
        .insert({
          exhibit_id: item.id,
          requested_by: user.id,
          reason: reason.trim(),
          status: "pending",
        });

      if (error) throw error;

      setNotice("Устгах хүсэлтийг администраторт илгээлээ.");
      await loadData();
    } catch (err) {
      setError(err.message || "Устгах хүсэлт илгээхэд алдаа гарлаа.");
    } finally {
      setSending(false);
    }
  };

  const statusLabel = (status) => {
    if (status === "pending") return "Хүлээгдэж буй";
    if (status === "approved") return "Зөвшөөрсөн";
    if (status === "rejected") return "Татгалзсан";
    return status;
  };

  return (
    <div className="student-page">
      <header className="student-header">
        <div className="admin-brand">
          <span>ISM</span>
          <div>
            <strong>DIGITAL</strong>
            <strong>MUSEUM</strong>
          </div>
        </div>

        <div className="student-header-right">
          <span>{user?.email}</span>
          <button className="admin-back" onClick={onClose}>
            <ArrowLeft size={16} />
            Нүүр хуудас
          </button>
        </div>
      </header>

      <main className="student-content">
        <div className="student-title-row">
          <div>
            <span className="admin-eyebrow">
              ISM DIGITAL MUSEUM / STUDENT
            </span>
            <h1>Миний бүтээлүүд</h1>
            <p>
              Нийтлэгдсэн бүтээлүүдээ харах болон засварлах хүсэлт
              илгээх боломжтой.
            </p>
          </div>

          <button
            className="admin-refresh"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Шинэчлэх
          </button>
        </div>

        {error && (
          <div className="admin-alert admin-alert-error">{error}</div>
        )}

        {notice && (
          <div className="admin-alert admin-alert-success">{notice}</div>
        )}

        {editing && (
          <section className="student-edit-panel">
            <h2>Засварлах хүсэлт илгээх</h2>
            <p>
              Администратор таны хүсэлтийг шалгаж шийдвэрлэсний дараа
              бүтээлийн мэдээлэл шинэчлэгдэнэ.
            </p>

            <form onSubmit={sendRequest}>
              <label>
                Бүтээлийн нэр *
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  required
                  maxLength={150}
                />
              </label>

              <label>
                Тайлбар *
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  required
                  maxLength={3000}
                />
              </label>

              <label>
                Ангилал
                <select
                  value={form.category_id}
                  onChange={(e) =>
                    setForm({ ...form, category_id: e.target.value })
                  }
                >
                  <option value="">Ангилал сонгох</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Ашигласан технологи
                <input
                  value={form.technology}
                  onChange={(e) =>
                    setForm({ ...form, technology: e.target.value })
                  }
                />
              </label>

              <label>
                Төслийн холбоос
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.project_url}
                  onChange={(e) =>
                    setForm({ ...form, project_url: e.target.value })
                  }
                />
              </label>

              <div className="student-form-actions">
                <button
                  className="admin-approve"
                  type="submit"
                  disabled={sending}
                >
                  <Send size={16} />
                  {sending ? "Илгээж байна..." : "Хүсэлт илгээх"}
                </button>

                <button
                  className="admin-reject"
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setError("");
                  }}
                >
                  Болих
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="student-section">
          <h2>Миний нийтлэгдсэн бүтээлүүд</h2>

          {loading ? (
            <div className="admin-empty">Мэдээлэл ачаалж байна...</div>
          ) : exhibits.length === 0 ? (
            <div className="admin-empty">
              <h3>Одоогоор нийтлэгдсэн бүтээл алга байна.</h3>
              <p>Таны илгээсэн бүтээл админ зөвшөөрсний дараа энд харагдана.</p>
            </div>
          ) : (
            <div className="admin-submission-list">
              {exhibits.map((item) => {
                const pending = getRequest(item.id);

                return (
                  <article className="admin-submission-card" key={item.id}>
                    <div className="student-exhibit-info">
                      <div className="admin-card-meta">
                        <span>{getCategory(item.category_id)}</span>
                        <span className="admin-status approved">
                          Нийтлэгдсэн
                        </span>
                      </div>

                      <h3>{item.title}</h3>
                      <p>{item.description}</p>

                      <div className="admin-details">
                        {item.technology && (
                          <span>Технологи: {item.technology}</span>
                        )}
                        {item.year && <span>Он: {item.year}</span>}
                      </div>

                      {pending ? (
                        <p className="student-pending-note">
                          <Clock3 size={15} />
                          Засварлах хүсэлт хянагдаж байна.
                        </p>
                      ) : (
                        <button
                          className="admin-approve student-edit-button"
                          onClick={() => startEdit(item)}
                        >
                          <Pencil size={16} />
                          Засварлах хүсэлт илгээх
                        </button>
                      )}

                      {deleteRequests.some(
                        (r) =>
                          r.exhibit_id === item.id && r.status === "pending"
                      ) ? (
                        <p className="student-pending-note">
                          <Clock3 size={15} />
                          Устгах хүсэлт хянагдаж байна.
                        </p>
                      ) : (
                        <button
                          className="admin-reject student-delete-button"
                          type="button"
                          disabled={sending}
                          onClick={() => requestDelete(item)}
                        >
                          <Trash2 size={16} />
                          Устгах хүсэлт илгээх
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="student-section">
          <h2>Миний устгах хүсэлтүүд</h2>

          {deleteRequests.length === 0 ? (
            <p className="admin-empty">
              Одоогоор устгах хүсэлт алга байна.
            </p>
          ) : (
            <div className="student-request-list">
              {deleteRequests.map((r) => (
                <article className="student-request-card" key={r.id}>
                  <div>
                    <strong>
                      {exhibits.find((e) => e.id === r.exhibit_id)?.title ||
                        "Бүтээл"}
                    </strong>
                    <p>Шалтгаан: {r.reason}</p>
                    {r.admin_note && <p>Админы тайлбар: {r.admin_note}</p>}
                  </div>
                  <span className={`admin-status ${r.status}`}>
                    {statusLabel(r.status)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="student-section">
          <h2>Миний засварлах хүсэлтүүд</h2>

          {requests.length === 0 ? (
            <div className="admin-empty">
              Одоогоор засварлах хүсэлт илгээгээгүй байна.
            </div>
          ) : (
            <div className="student-request-list">
              {requests.map((item) => (
                <article className="student-request-card" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>
                      Илгээсэн:{" "}
                      {new Date(item.created_at).toLocaleDateString("mn-MN")}
                    </p>
                    {item.admin_note && (
                      <p>Админы тайлбар: {item.admin_note}</p>
                    )}
                  </div>

                  <span className={`admin-status ${item.status}`}>
                    {item.status === "approved" ? (
                      <CheckCircle2 size={14} />
                    ) : item.status === "rejected" ? (
                      <XCircle size={14} />
                    ) : (
                      <Clock3 size={14} />
                    )}
                    {statusLabel(item.status)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}