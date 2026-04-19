import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiFetch } from "../lib/api";

function GalleryPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const loadGallery = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await apiFetch("/gallery");

        if (!isCancelled) {
          setItems(response.items || []);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadGallery();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <section className="section page-hero-section gallery-page-section">
      <div className="container gallery-page-stack">
        <div className="section-header left-aligned gallery-page-head">
          <p className="section-eyebrow">Gallery</p>
          <h1>Sparkline projects, machinery, and site work in motion</h1>
          <p>
            Images and videos uploaded from the admin dashboard appear here automatically
            so the Sparkline gallery stays updated with the latest work and equipment.
          </p>
        </div>

        {error ? <p className="status-message error">{error}</p> : null}

        {isLoading ? (
          <div className="empty-state admin-empty">Loading gallery...</div>
        ) : null}

        {!isLoading && !items.length ? (
          <div className="gallery-empty-state">
            <div>
              <p className="section-eyebrow">No Media Yet</p>
              <h2>The Sparkline gallery will show up here after the first upload.</h2>
              <p>
                The admin team can now add both images and videos directly from the
                dashboard.
              </p>
            </div>

            <Link to="/quote" className="btn btn-primary">
              Request Quote
            </Link>
          </div>
        ) : null}

        {!isLoading && items.length ? (
          <div className="gallery-grid">
            {items.map((item) => (
              <article className="gallery-card" key={item.id}>
                <div className="gallery-media-shell">
                  {item.mediaType === "video" ? (
                    <video controls playsInline preload="metadata" src={item.mediaPath} />
                  ) : (
                    <img
                      src={item.mediaPath}
                      alt={item.description || "Sparkline gallery"}
                    />
                  )}
                </div>

                <div className="gallery-card-body">
                  <span className="gallery-item-type">
                    {item.mediaType === "video" ? "Video" : "Image"}
                  </span>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default GalleryPage;
