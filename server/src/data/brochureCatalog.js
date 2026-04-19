export const brochureCatalog = {
  "bar-cutting-machine-scm": {
    fileName: "bar-cutting.pdf",
    requestedItem: "Bar Cutting Machine (SCM) Brochure"
  },
  "bar-bending-machine-sbm": {
    fileName: "bar-bending.pdf",
    requestedItem: "Bar Bending Machine (SBM) Brochure"
  },
  "series-of-rope-suspended-platform-srp": {
    fileName: "rope-suspended-platform.pdf",
    requestedItem: "Series of Rope Suspended Platform (SRP) Brochure"
  },
  "series-of-passenger-material-hoist-spm": {
    fileName: "spm-and-smh.pdf",
    requestedItem: "Series of Passenger & Material Hoist (SPM) Brochure"
  },
  "multi-functional-passenger-material-hoist-smh": {
    fileName: "spm-and-smh.pdf",
    requestedItem: "Multi-functional Passenger & Material Hoist (SMH) Brochure"
  },
  "scrap-straightening-machine": {
    fileName: "scrap-and-ring.pdf",
    requestedItem: "Scrap Straightening Machine Brochure"
  },
  "ring-making-machine": {
    fileName: "scrap-and-ring.pdf",
    requestedItem: "Ring Making Machine Brochure"
  },
  "self-loading-concrete-batching-vehicle": {
    fileName: "self-loading-concrete-batching-vehicle.pdf",
    requestedItem: "Self Loading Concrete Batching Vehicle Brochure"
  }
};

export const getBrochureConfig = (categorySlug) =>
  brochureCatalog[String(categorySlug || "").trim()] || null;
