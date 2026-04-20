import { useState } from "react";
import { Link } from "react-router-dom";

import {
  getCatalogEntryDescription,
  getCatalogEntryImage
} from "../lib/media";

function CatalogEntryCard({
  entry,
  description,
  chips = [],
  actions = [],
  headingTag = "h3",
  cardClassName = "",
  bodyClassName = "",
  imageAlt = ""
}) {
  const [failedImage, setFailedImage] = useState("");
  const HeadingTag = headingTag;
  const title = entry?.name || "";
  const entryImage = getCatalogEntryImage(entry);
  const displayDescription =
    typeof description === "string"
      ? description.trim()
      : getCatalogEntryDescription(entry);

  const normalizedChips = chips
    .map((chip) =>
      typeof chip === "string"
        ? { key: chip, label: chip }
        : chip?.label
          ? { key: chip.key || chip.label, label: chip.label }
          : null
    )
    .filter(Boolean);

  const normalizedActions = actions.filter(
    (action) => action?.to && action?.label
  );

  const hasImageError = Boolean(entryImage) && failedImage === entryImage;

  return (
    <article className={`info-card product-range-card catalog-entry-card ${cardClassName}`.trim()}>
      <div className="catalog-entry-media">
        {entryImage && !hasImageError ? (
          <img
            src={entryImage}
            alt={imageAlt || title}
            loading="lazy"
            decoding="async"
            onError={() => setFailedImage(entryImage)}
          />
        ) : (
          <div className="catalog-entry-placeholder">
            <span>{title || "Image unavailable"}</span>
          </div>
        )}
      </div>

      <div className={`info-card-body product-range-body catalog-entry-body ${bodyClassName}`.trim()}>
        <HeadingTag>{title}</HeadingTag>

        {displayDescription ? (
          <p className="catalog-entry-description">{displayDescription}</p>
        ) : null}

        {normalizedChips.length ? (
          <div className="chip-list">
            {normalizedChips.map((chip) => (
              <span className="chip" key={chip.key}>
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}

        {normalizedActions.length ? (
          <div className="button-row catalog-entry-actions">
            {normalizedActions.map((action) => (
              <Link
                key={`${action.to}-${action.label}`}
                className={action.className || "btn btn-outline"}
                to={action.to}
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default CatalogEntryCard;
