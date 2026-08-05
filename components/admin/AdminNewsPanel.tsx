"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  addNews,
  deleteNews,
  fetchAllNews,
  newsVariantLabels,
  updateNews,
  type NewsItem,
  type NewsVariant,
} from "@/lib/news";
import {
  defaultNewsPopupSettings,
  fetchNewsPopupSettings,
  updateNewsPopupSettings,
  type NewsPopupSettings,
} from "@/lib/news-settings";
import { siteContact } from "@/lib/contact";

const variantOptions: NewsVariant[] = ["info", "update", "promo", "warning"];

const emptyForm = {
  title: "",
  body: "",
  variant: "info" as NewsVariant,
  active: true,
};

export function AdminNewsPanel() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState(emptyForm.title);
  const [body, setBody] = useState(emptyForm.body);
  const [variant, setVariant] = useState<NewsVariant>(emptyForm.variant);
  const [active, setActive] = useState(emptyForm.active);

  const [popupSettings, setPopupSettings] = useState<NewsPopupSettings>(
    defaultNewsPopupSettings
  );
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);

  const loadItems = async () => {
    try {
      setError("");
      const data = await fetchAllNews();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load news.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setSettingsError("");
      const data = await fetchNewsPopupSettings();
      setPopupSettings(data);
    } catch (err) {
      setSettingsError(
        err instanceof Error ? err.message : "Failed to load popup settings."
      );
    }
  };

  const handleSettingsSave = async (e: FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsError("");
    setSettingsSaved(false);
    try {
      const saved = await updateNewsPopupSettings(popupSettings);
      setPopupSettings(saved);
      setSettingsSaved(true);
    } catch (err) {
      setSettingsError(
        err instanceof Error ? err.message : "Failed to save popup settings."
      );
    } finally {
      setSettingsSaving(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle(emptyForm.title);
    setBody(emptyForm.body);
    setVariant(emptyForm.variant);
    setActive(emptyForm.active);
    setFormError("");
  };

  const startEdit = (item: NewsItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setBody(item.body);
    setVariant(item.variant);
    setActive(item.active);
    setFormError("");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!title.trim() || !body.trim()) {
      setFormError("Title and message are both required.");
      return;
    }

    const payload = { title: title.trim(), body: body.trim(), variant, active };

    setSaving(true);
    try {
      if (editingId) {
        await updateNews(editingId, payload);
      } else {
        await addNews(payload);
      }
      resetForm();
      await loadItems();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save news.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: NewsItem) => {
    try {
      await updateNews(item.id, { active: !item.active });
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update news.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this news item?")) return;
    try {
      await deleteNews(id);
      if (editingId === id) resetForm();
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete news.");
    }
  };

  return (
    <>
      <header className="admin-topbar">
        <div>
          <h1>News &amp; Announcements</h1>
          <p>
            Big, clear updates for customers — published news pops up after login.
          </p>
        </div>
      </header>

      <section className="admin-news__settings-panel glass">
        <div className="admin-form-header">
          <h2>News popup — WhatsApp &amp; contact</h2>
          <small className="auth-form__hint">
            Shown inside the customer news popup after login.
          </small>
        </div>
        <form className="auth-form admin-news__settings-form" onSubmit={handleSettingsSave}>
          <div className="admin-news__settings-grid">
            <div className="auth-form__field">
              <label htmlFor="popup-whatsapp-number">WhatsApp number</label>
              <input
                id="popup-whatsapp-number"
                type="text"
                value={popupSettings.whatsappNumber}
                onChange={(e) =>
                  setPopupSettings((s) => ({ ...s, whatsappNumber: e.target.value }))
                }
                placeholder="+917873557074"
              />
              <small className="auth-form__hint">Used for &quot;Chat on WhatsApp&quot; button.</small>
            </div>
            <div className="auth-form__field">
              <label htmlFor="popup-whatsapp-join">WhatsApp join / channel link</label>
              <input
                id="popup-whatsapp-join"
                type="url"
                value={popupSettings.whatsappJoinLink}
                onChange={(e) =>
                  setPopupSettings((s) => ({ ...s, whatsappJoinLink: e.target.value }))
                }
                placeholder="https://chat.whatsapp.com/..."
              />
              <small className="auth-form__hint">
                Group or channel invite link — update anytime from here.
              </small>
            </div>
            <div className="auth-form__field">
              <label htmlFor="popup-contact-phone">Contact phone</label>
              <input
                id="popup-contact-phone"
                type="text"
                value={popupSettings.contactPhone}
                onChange={(e) =>
                  setPopupSettings((s) => ({ ...s, contactPhone: e.target.value }))
                }
                placeholder="+917873557074"
              />
            </div>
            <div className="auth-form__field">
              <label htmlFor="popup-contact-email">Contact email</label>
              <input
                id="popup-contact-email"
                type="email"
                value={popupSettings.contactEmail}
                onChange={(e) =>
                  setPopupSettings((s) => ({ ...s, contactEmail: e.target.value }))
                }
                placeholder={siteContact.email}
              />
            </div>
          </div>
          {settingsError && <p className="auth-form__error">{settingsError}</p>}
          {settingsSaved && (
            <p className="admin-news__saved-msg">Popup contact settings saved.</p>
          )}
          <button type="submit" className="btn btn--primary btn--sm" disabled={settingsSaving}>
            {settingsSaving ? "Saving…" : "Save popup settings"}
          </button>
        </form>
      </section>

      <div className="admin-news__layout">
        <section
          className={`admin-news__form-panel glass${editingId ? " admin-news__form-panel--editing" : ""}`}
        >
          <div className="admin-form-header">
            <h2>{editingId ? "Edit News" : "Create News"}</h2>
            {editingId && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form__field">
              <label htmlFor="news-title">Title</label>
              <input
                id="news-title"
                type="text"
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New Mumbai VPS stock available"
              />
            </div>

            <div className="auth-form__field">
              <label htmlFor="news-body">Message</label>
              <textarea
                id="news-body"
                value={body}
                rows={7}
                maxLength={1200}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the announcement customers will see…"
              />
            </div>

            <div className="auth-form__field">
              <label htmlFor="news-variant">Category</label>
              <select
                id="news-variant"
                value={variant}
                onChange={(e) => setVariant(e.target.value as NewsVariant)}
              >
                {variantOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {newsVariantLabels[opt]}
                  </option>
                ))}
              </select>
            </div>

            <label className="admin-news__active-toggle">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <span>Active (visible to customers)</span>
            </label>

            {formError && <p className="auth-form__error">{formError}</p>}

            <button type="submit" className="btn btn--primary btn--block" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update News" : "Publish News"}
            </button>
          </form>
        </section>

        <section className="admin-news__list-panel glass">
          <div className="admin-form-header">
            <h2>Published News</h2>
            <span className="admin-news__count">{items.length} total</span>
          </div>

          {error && <p className="auth-form__error">{error}</p>}

          {loading ? (
            <p className="admin-news__empty">Loading news…</p>
          ) : items.length === 0 ? (
            <p className="admin-news__empty">
              No news yet. Create your first announcement on the left.
            </p>
          ) : (
            <ul className="admin-news__items">
              {items.map((item) => (
                <li key={item.id} className="admin-news__item">
                  <div className="admin-news__item-main">
                    <div className="admin-news__item-head">
                      <span className={`news-tag news-tag--${item.variant}`}>
                        {newsVariantLabels[item.variant]}
                      </span>
                      <strong>{item.title}</strong>
                      {!item.active && (
                        <span className="admin-news__badge-off">Hidden</span>
                      )}
                    </div>
                    <p className="admin-news__item-body">{item.body}</p>
                    <span className="admin-news__item-date">
                      {new Date(item.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div className="admin-news__item-actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => toggleActive(item)}
                    >
                      {item.active ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => startEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm admin-news__delete"
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
