import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  X,
  RefreshCw,
  Clock3,
  CheckCircle2,
  Pencil,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";

import { supabase } from "../services/supabase";
import "./AdminDashboard.css";

const imageUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  return (
    supabase.storage.from("museum-images").getPublicUrl(path).data
      ?.publicUrl || ""
  );
};

export default function AdminDashboard({ user, onClose }) {
  const [submissions, setSubmissions] = useState([]);
  const [editRequests, setEditRequests] = useState([]);
  const [deleteRequests, setDeleteRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [profiles, setProfiles] = useState([]);

  const [filter, setFilter] = useState("pending");
  const [activeSection, setActiveSection] = useState("submissions");

  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [
        submissionResult,
        requestResult,
        categoryResult,
        profileResult,
        deleteResult,
      ] = await Promise.all([
        supabase
          .from("submissions")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("exhibit_edit_requests")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase.from("categories").select("id, name"),

        supabase.from("profiles").select("id, full_name, email"),

        supabase
          .from("exhibit_delete_requests")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (submissionResult.error) throw submissionResult.error;
      if (requestResult.error) throw requestResult.error;
      if (categoryResult.error) throw categoryResult.error;
      if (profileResult.error) throw profileResult.error;
      if (deleteResult.error) throw deleteResult.error;

      setSubmissions(submissionResult.data || []);
      setEditRequests(requestResult.data || []);
      setCategories(categoryResult.data || []);
      setProfiles(profileResult.data || []);
      setDeleteRequests(deleteResult.data || []);
    } catch (err) {
      console.error("Admin dashboard error:", err);
      setError(err.message || "Мэдээлэл татахад алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCategory = (id) =>
    categories.find((item) => String(item.id) === String(id))?.name ||
    "Ангилал тодорхойгүй";

  const getAuthor = (id) => {
    const profile = profiles.find(
      (item) => String(item.id) === String(id)
    );

    return profile?.full_name || profile?.email || "Оюутан";
  };

  const approveSubmission = async (item) => {
    if (!window.confirm(`"${item.title}" бүтээлийг музейд нийтлэх үү?`)) {
      return;
    }

    setWorkingId(item.id);
    setError("");
    setNotice("");

    try {
      const { error: publishError } = await supabase
        .from("exhibits")
        .insert({
          title: item.title,
          description: item.description,
          category_id: item.category_id,
          image_url: item.image_url,
          author: getAuthor(item.submitted_by),
          technology: item.technology,
          year: new Date().getFullYear(),
          status: "published",
          created_by: item.submitted_by,
        });

      if (publishError) throw publishError;

      const { error: updateError } = await supabase
        .from("submissions")
        .update({ status: "approved" })
        .eq("id", item.id);

      if (updateError) {
        throw new Error(
          "Бүтээл нийтлэгдсэн боловч хүсэлтийн төлөв шинэчлэгдсэнгүй: " +
            updateError.message
        );
      }

      setNotice("Бүтээл амжилттай нийтлэгдлээ.");
      await loadData();
    } catch (err) {
      console.error("Approve submission error:", err);
      setError(err.message || "Нийтлэхэд алдаа гарлаа.");
    } finally {
      setWorkingId(null);
    }
  };

  const rejectSubmission = async (item) => {
    if (!window.confirm(`"${item.title}" бүтээлээс татгалзах уу?`)) {
      return;
    }

    setWorkingId(item.id);
    setError("");
    setNotice("");

    try {
      const { error: updateError } = await supabase
        .from("submissions")
        .update({ status: "rejected" })
        .eq("id", item.id);

      if (updateError) throw updateError;

      setNotice("Бүтээлийг татгалзсан төлөвт орууллаа.");
      await loadData();
    } catch (err) {
      console.error("Reject submission error:", err);
      setError(err.message || "Төлөв өөрчлөхөд алдаа гарлаа.");
    } finally {
      setWorkingId(null);
    }
  };

  const approveEditRequest = async (item) => {
    if (
      !window.confirm(
        `"${item.title}" бүтээлийн засварлах хүсэлтийг зөвшөөрөх үү?`
      )
    ) {
      return;
    }

    setWorkingId(item.id);
    setError("");
    setNotice("");

    try {
      const { data: exhibit, error: findError } = await supabase
        .from("exhibits")
        .select("id")
        .eq("id", item.exhibit_id)
        .maybeSingle();

      if (findError) throw findError;

      if (!exhibit) {
        throw new Error("Засварлах гэж буй бүтээл олдсонгүй.");
      }

      const { error: exhibitError } = await supabase
        .from("exhibits")
        .update({
          title: item.title,
          description: item.description,
          category_id: item.category_id,
          technology: item.technology,
        })
        .eq("id", item.exhibit_id);

      if (exhibitError) throw exhibitError;

      const { error: requestError } = await supabase
        .from("exhibit_edit_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (requestError) {
        throw new Error(
          "Бүтээл шинэчлэгдсэн боловч хүсэлтийн төлөв хадгалагдсангүй: " +
            requestError.message
        );
      }

      setNotice("Засварлах хүсэлтийг зөвшөөрч, бүтээлийг шинэчиллээ.");
      await loadData();
    } catch (err) {
      console.error("Approve edit request error:", err);
      setError(err.message || "Засвар зөвшөөрөхөд алдаа гарлаа.");
    } finally {
      setWorkingId(null);
    }
  };

  const rejectEditRequest = async (item) => {
    const note = window.prompt(
      "Татгалзсан шалтгааныг бичнэ үү (заавал биш):",
      ""
    );

    if (note === null) return;

    setWorkingId(item.id);
    setError("");
    setNotice("");

    try {
      const { error: updateError } = await supabase
        .from("exhibit_edit_requests")
        .update({
          status: "rejected",
          admin_note: note.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (updateError) throw updateError;

      setNotice("Засварлах хүсэлтээс татгалзлаа.");
      await loadData();
    } catch (err) {
      console.error("Reject edit request error:", err);
      setError(err.message || "Хүсэлт татгалзахад алдаа гарлаа.");
    } finally {
      setWorkingId(null);
    }
  };

  const reviewDeleteRequest = async (item, approve) => {
    const note = approve
      ? ""
      : window.prompt("Татгалзсан шалтгаан (заавал биш):", "");

    if (note === null) return;

    if (
      approve &&
      !window.confirm("Энэ бүтээлийг музейгээс бүрмөсөн устгах уу?")
    ) {
      return;
    }

    setWorkingId(item.id);
    setError("");
    setNotice("");

    try {
      if (approve) {
        const { error: deleteError } = await supabase
          .from("exhibits")
          .delete()
          .eq("id", item.exhibit_id);

        if (deleteError) throw deleteError;
      }

      const { error } = await supabase
        .from("exhibit_delete_requests")
        .update({
          status: approve ? "approved" : "rejected",
          admin_note: note?.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;

      setNotice(
        approve
          ? "Бүтээлийг устгаж хүсэлтийг зөвшөөрлөө."
          : "Устгах хүсэлтээс татгалзлаа."
      );

      await loadData();
    } catch (err) {
      setError(err.message || "Хүсэлт шийдвэрлэхэд алдаа гарлаа.");
    } finally {
      setWorkingId(null);
    }
  };

  const filteredSubmissions =
    filter === "all"
      ? submissions
      : submissions.filter((item) => item.status === filter);

  const pendingCount = submissions.filter(
    (item) => item.status === "pending"
  ).length;

  const approvedCount = submissions.filter(
    (item) => item.status === "approved"
  ).length;

  const pendingEditCount = editRequests.filter(
    (item) => item.status === "pending"
  ).length;

  const filteredEditRequests =
    filter === "all"
      ? editRequests
      : editRequests.filter((item) => item.status === filter);

  const pendingDeleteCount = deleteRequests.filter(
    (item) => item.status === "pending"
  ).length;

  const filteredDeleteRequests =
    filter === "all"
      ? deleteRequests
      : deleteRequests.filter((item) => item.status === filter);

  const requestStatus = (status) => {
    if (status === "pending") return "Хүлээгдэж буй";
    if (status === "approved") return "Зөвшөөрсөн";
    if (status === "rejected") return "Татгалзсан";
    return status;
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-brand">
          <span>ISM</span>
          <div>
            <strong>DIGITAL</strong>
            <strong>MUSEUM</strong>
          </div>
        </div>

        <div className="admin-header-right">
          <span className="admin-account">
            Администратор: {user?.email}
          </span>

          <button className="admin-back" onClick={onClose}>
            <ArrowLeft size={16} />
            Нүүр хуудас
          </button>
        </div>
      </header>

      <main className="admin-content">
        <div className="admin-title-row">
          <div>
            <span className="admin-eyebrow">
              ISM DIGITAL MUSEUM / MANAGEMENT
            </span>
            <h1>Админ удирдлагын хэсэг</h1>
            <p>
              Бүтээлийн хүсэлт болон засварлах хүсэлтүүдийг хянаж
              шийдвэрлээрэй.
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

        <div className="admin-stats">
          <button
            className="admin-stat"
            onClick={() => {
              setActiveSection("submissions");
              setFilter("pending");
            }}
          >
            <Clock3 />
            <span>Шинэ бүтээлийн хүсэлт</span>
            <strong>{pendingCount}</strong>
          </button>

          <button
            className="admin-stat"
            onClick={() => {
              setActiveSection("submissions");
              setFilter("approved");
            }}
          >
            <CheckCircle2 />
            <span>Зөвшөөрсөн бүтээл</span>
            <strong>{approvedCount}</strong>
          </button>

          <button
            className="admin-stat"
            onClick={() => {
              setActiveSection("editRequests");
              setFilter("pending");
            }}
          >
            <Pencil />
            <span>Засварлах хүсэлт</span>
            <strong>{pendingEditCount}</strong>
          </button>
        </div>

        <div className="admin-main-tabs">
          <button
            className={activeSection === "submissions" ? "active" : ""}
            onClick={() => {
              setActiveSection("submissions");
              setFilter("pending");
              setError("");
              setNotice("");
            }}
          >
            Шинэ бүтээлийн хүсэлтүүд
          </button>

          <button
            className={activeSection === "editRequests" ? "active" : ""}
            onClick={() => {
              setActiveSection("editRequests");
              setFilter("pending");
              setError("");
              setNotice("");
            }}
          >
            Засварлах хүсэлтүүд ({pendingEditCount})
          </button>

          <button
            className={activeSection === "deleteRequests" ? "active" : ""}
            onClick={() => {
              setActiveSection("deleteRequests");
              setFilter("pending");
              setError("");
              setNotice("");
            }}
          >
            Устгах хүсэлтүүд ({pendingDeleteCount})
          </button>
        </div>

        {error && (
          <div className="admin-alert admin-alert-error">{error}</div>
        )}

        {notice && (
          <div className="admin-alert admin-alert-success">{notice}</div>
        )}

        {loading ? (
          <p className="admin-empty">Мэдээлэл ачаалж байна...</p>
        ) : activeSection === "deleteRequests" ? (
          <section className="admin-submission-list">
            <div className="admin-list-heading">
              <h2>Устгах хүсэлтүүд</h2>

              <div className="admin-filters">
                {[
                  ["pending", "Хүлээгдэж буй"],
                  ["approved", "Зөвшөөрсөн"],
                  ["rejected", "Татгалзсан"],
                  ["all", "Бүгд"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={filter === value ? "selected" : ""}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filteredDeleteRequests.length === 0 ? (
              <p className="admin-empty">Устгах хүсэлт алга байна.</p>
            ) : (
              filteredDeleteRequests.map((item) => (
                <article className="admin-submission-card" key={item.id}>
                  <div className="admin-submission-info">
                    <div className="admin-card-meta">
                      <span>Оюутан: {getAuthor(item.requested_by)}</span>
                      <span className={`admin-status ${item.status}`}>
                        {requestStatus(item.status)}
                      </span>
                    </div>

                    <h3>Бүтээлийн ID: {item.exhibit_id}</h3>
                    <p>Шалтгаан: {item.reason}</p>

                    {item.admin_note && (
                      <p>Админы тайлбар: {item.admin_note}</p>
                    )}

                    {item.status === "pending" && (
                      <div className="admin-actions">
                        <button
                          className="admin-reject"
                          disabled={workingId === item.id}
                          onClick={() => reviewDeleteRequest(item, true)}
                        >
                          <Trash2 size={16} />
                          Устгахыг зөвшөөрөх
                        </button>

                        <button
                          className="admin-approve"
                          disabled={workingId === item.id}
                          onClick={() => reviewDeleteRequest(item, false)}
                        >
                          <X size={16} />
                          Татгалзах
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}
          </section>
        ) : activeSection === "submissions" ? (
          <>
            <div className="admin-list-heading">
              <h2>Бүтээлийн хүсэлтүүд</h2>

              <div className="admin-filters">
                {[
                  ["pending", "Хүлээгдэж буй"],
                  ["approved", "Зөвшөөрсөн"],
                  ["rejected", "Татгалзсан"],
                  ["all", "Бүгд"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={filter === value ? "selected" : ""}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filteredSubmissions.length === 0 ? (
              <div className="admin-empty">
                <ImageIcon size={34} />
                <h3>Бүтээлийн хүсэлт алга байна</h3>
              </div>
            ) : (
              <div className="admin-submission-list">
                {filteredSubmissions.map((item) => (
                  <article
                    className="admin-submission-card"
                    key={item.id}
                  >
                    <div className="admin-submission-image">
                      {item.image_url ? (
                        <img
                          src={imageUrl(item.image_url)}
                          alt={item.title}
                        />
                      ) : (
                        <ImageIcon size={35} />
                      )}
                    </div>

                    <div className="admin-submission-info">
                      <div className="admin-card-meta">
                        <span>{getCategory(item.category_id)}</span>
                        <span className={`admin-status ${item.status}`}>
                          {requestStatus(item.status)}
                        </span>
                      </div>

                      <h3>{item.title}</h3>
                      <p>{item.description}</p>

                      <div className="admin-details">
                        <span>
                          Илгээсэн: {getAuthor(item.submitted_by)}
                        </span>

                        {item.technology && (
                          <span>Технологи: {item.technology}</span>
                        )}

                        {item.project_url && (
                          <a
                            href={item.project_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Төслийн холбоос
                          </a>
                        )}
                      </div>

                      {item.status === "pending" && (
                        <div className="admin-actions">
                          <button
                            className="admin-approve"
                            disabled={workingId === item.id}
                            onClick={() => approveSubmission(item)}
                          >
                            <Check size={16} />
                            Зөвшөөрөх
                          </button>

                          <button
                            className="admin-reject"
                            disabled={workingId === item.id}
                            onClick={() => rejectSubmission(item)}
                          >
                            <X size={16} />
                            Татгалзах
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="admin-list-heading">
              <h2>Оюутнуудын засварлах хүсэлт</h2>

              <div className="admin-filters">
                {[
                  ["pending", "Хүлээгдэж буй"],
                  ["approved", "Зөвшөөрсөн"],
                  ["rejected", "Татгалзсан"],
                  ["all", "Бүгд"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={filter === value ? "selected" : ""}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filteredEditRequests.length === 0 ? (
              <div className="admin-empty">
                <Pencil size={34} />
                <h3>Засварлах хүсэлт алга байна</h3>
                <p>Оюутан хүсэлт илгээсэн үед энд харагдана.</p>
              </div>
            ) : (
              <div className="admin-submission-list">
                {filteredEditRequests.map((item) => (
                  <article
                    className="admin-submission-card"
                    key={item.id}
                  >
                    <div className="admin-submission-info">
                      <div className="admin-card-meta">
                        <span>{getCategory(item.category_id)}</span>
                        <span className={`admin-status ${item.status}`}>
                          {requestStatus(item.status)}
                        </span>
                      </div>

                      <h3>{item.title}</h3>
                      <p>{item.description}</p>

                      <div className="admin-details">
                        <span>
                          Хүсэлт илгээсэн: {getAuthor(item.requested_by)}
                        </span>

                        {item.technology && (
                          <span>Технологи: {item.technology}</span>
                        )}

                        {item.project_url && (
                          <a
                            href={item.project_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Төслийн холбоос
                          </a>
                        )}

                        <span>
                          {new Date(item.created_at).toLocaleDateString(
                            "mn-MN"
                          )}
                        </span>
                      </div>

                      {item.status === "pending" && (
                        <div className="admin-actions">
                          <button
                            className="admin-approve"
                            disabled={workingId === item.id}
                            onClick={() => approveEditRequest(item)}
                          >
                            <Check size={16} />
                            {workingId === item.id
                              ? "Түр хүлээнэ үү..."
                              : "Засварыг зөвшөөрөх"}
                          </button>

                          <button
                            className="admin-reject"
                            disabled={workingId === item.id}
                            onClick={() => rejectEditRequest(item)}
                          >
                            <X size={16} />
                            Татгалзах
                          </button>
                        </div>
                      )}

                      {item.admin_note && (
                        <p className="admin-details">
                          Админы тайлбар: {item.admin_note}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}