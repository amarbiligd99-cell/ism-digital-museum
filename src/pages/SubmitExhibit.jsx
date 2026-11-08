import { useEffect, useState } from "react";
import {
  X,
  Upload,
  ImagePlus,
  Send,
  LoaderCircle,
} from "lucide-react";
import { supabase } from "../services/supabase";
import "./SubmitExhibit.css";

export default function SubmitExhibit({ user, onClose, onSubmitted }) {
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [technology, setTechnology] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) {
        setError("Ангилал татахад алдаа гарлаа: " + error.message);
        return;
      }

      setCategories(data || []);
    };

    loadCategories();
  }, []);

  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(image);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Зөвхөн зураг файл сонгоно уу.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Зургийн хэмжээ 5MB-аас бага байх ёстой.");
      return;
    }

    setError("");
    setImage(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!user?.id) {
      setError("Бүтээл илгээхийн тулд эхлээд нэвтэрнэ үү.");
      return;
    }

    if (!categoryId) {
      setError("Бүтээлийн ангиллаа сонгоно уу.");
      return;
    }

    setLoading(true);

    let uploadedPath = null;

    try {
      let imageUrl = null;

      if (image) {
        const extension =
          image.name.split(".").pop()?.toLowerCase() || "jpg";

        const filePath = `${user.id}/${Date.now()}.${extension}`;

        const { data: uploadData, error: uploadError } =
          await supabase.storage
            .from("museum-images")
            .upload(filePath, image, {
              cacheControl: "3600",
              upsert: false,
              contentType: image.type,
            });

        if (uploadError) throw uploadError;

        uploadedPath = uploadData.path;

        const { data: publicData } = supabase.storage
          .from("museum-images")
          .getPublicUrl(uploadedPath);

        imageUrl = publicData?.publicUrl || uploadedPath;
      }

      const { error: insertError } = await supabase
        .from("submissions")
        .insert({
          title: title.trim(),
          description: description.trim(),
          category_id: categoryId,
          technology: technology.trim() || null,
          image_url: imageUrl,
          project_url: projectUrl.trim() || null,
          submitted_by: user.id,
          status: "pending",
        });

      if (insertError) throw insertError;

      setSuccess(
        "Таны бүтээл амжилттай илгээгдлээ. Администратор хянасны дараа нийтлэгдэнэ."
      );

      setTitle("");
      setDescription("");
      setCategoryId("");
      setTechnology("");
      setProjectUrl("");
      setImage(null);

      onSubmitted?.();
    } catch (err) {
      console.error("Submission error:", err);

      if (uploadedPath) {
        await supabase.storage
          .from("museum-images")
          .remove([uploadedPath]);
      }

      setError(err.message || "Бүтээл илгээхэд алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="submit-overlay" onClick={onClose}>
      <section
        className="submit-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="submit-close"
          onClick={onClose}
          aria-label="Хаах"
        >
          <X size={21} />
        </button>

        <div className="submit-heading">
          <span className="submit-eyebrow">
            ISM DIGITAL MUSEUM
          </span>

          <h2>Бүтээлээ илгээх</h2>

          <p>
            Өөрийн бүтээл, судалгаа болон технологийн
            шийдлээ музейн санд бүртгүүлээрэй.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="submit-field">
            <span>Бүтээлийн нэр *</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Бүтээлийн нэрээ оруулна уу"
              maxLength={150}
              required
            />
          </label>

          <label className="submit-field">
            <span>Тайлбар *</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Бүтээлийнхээ тухай дэлгэрэнгүй бичнэ үү"
              rows={4}
              maxLength={3000}
              required
            />
          </label>

          <label className="submit-field">
            <span>Ангилал *</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              required
            >
              <option value="">Ангилал сонгох</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="submit-field">
            <span>Ашигласан технологи</span>
            <input
              type="text"
              value={technology}
              onChange={(event) => setTechnology(event.target.value)}
              placeholder="Жишээ: React, JavaScript, Supabase"
            />
          </label>

          <label className="submit-field">
            <span>Төслийн холбоос</span>
            <input
              type="url"
              value={projectUrl}
              onChange={(event) => setProjectUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>

          <div className="submit-field">
            <span>Бүтээлийн зураг</span>

            <label className="submit-upload">
              {preview ? (
                <img src={preview} alt="Сонгосон бүтээлийн зураг" />
              ) : (
                <>
                  <ImagePlus size={30} />
                  <strong>Зураг сонгох</strong>
                  <small>PNG, JPG, WEBP · 5MB хүртэл</small>
                </>
              )}

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
              />
            </label>

            {image && (
              <button
                type="button"
                className="submit-remove-image"
                onClick={() => setImage(null)}
              >
                Зураг солих
              </button>
            )}
          </div>

          {error && (
            <p className="submit-message submit-error">
              {error}
            </p>
          )}

          {success && (
            <p className="submit-message submit-success">
              {success}
            </p>
          )}

          <button
            className="submit-button"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle size={18} className="submit-spinner" />
                Илгээж байна...
              </>
            ) : (
              <>
                <Upload size={18} />
                Бүтээл илгээх
                <Send size={16} />
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
}