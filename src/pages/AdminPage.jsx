import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import {
  EMAIL_PATTERN,
  PHONE_DIGIT_LIMIT,
  PHONE_PATTERN,
  isValidEmail,
  isValidPhone,
  normalizePhoneInput
} from "../lib/formValidation";

const BASE_SECTIONS = [
  { id: "inquiries", label: "Inquiries", description: "Quote, spare parts, and brochure records" },
  { id: "users", label: "Users", description: "Registered users list" },
  { id: "tasks", label: "Tasks", description: "Assigned work for admins" },
  { id: "overview", label: "Overview", description: "Live dashboard counts" },
  { id: "categories", label: "Add Category", description: "Create catalog categories" },
  { id: "gallery", label: "Gallery", description: "Upload gallery images and videos" },
  { id: "products", label: "Products", description: "Add or edit machinery" },
  { id: "spareparts", label: "Spare Parts", description: "Private spare parts database" },
  { id: "catalog", label: "Catalog", description: "Current live structure" }
];

const OWNER_SECTIONS = [
  { id: "admin-accounts", label: "Staff Accounts", description: "Create and manage staff access" },
  { id: "audits", label: "Audits", description: "All admin updates and actions" }
];
const OWNER_SECTION_IDS = new Set(OWNER_SECTIONS.map((section) => section.id));
const OWNER_PORTAL_SECTIONS = [
  { id: "tasks", label: "Tasks", description: "Track task status and deadlines" },
  ...OWNER_SECTIONS
];
const OWNER_PORTAL_SECTION_IDS = new Set(
  OWNER_PORTAL_SECTIONS.map((section) => section.id)
);

const STAFF_ROLES = ["admin", "owner"];

const INQUIRY_STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "called", label: "Called" },
  { value: "resolved", label: "Resolved" },
  { value: "not_resolved", label: "Not Resolved" }
];

const INQUIRY_FILTERS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "called", label: "Called" },
  { value: "resolved", label: "Resolved" },
  { value: "not_resolved", label: "Not Resolved" }
];

const EMPTY_CATEGORY_FORM = {
  parentSlug: "",
  name: "",
  slug: "",
  shortDescription: "",
  fullDescription: "",
  sortOrder: ""
};

const EMPTY_PRODUCT_FORM = {
  categoryId: "",
  name: "",
  slug: "",
  shortDescription: "",
  fullDescription: "",
  image: "/images/product1.jpg",
  brochureFileName: "SPARKLINE-8.pdf",
  features: "",
  applications: "",
  specifications: ""
};

const EMPTY_SPARE_PART_FORM = {
  name: "",
  slug: "",
  shortDescription: "",
  fullDescription: "",
  image: "",
  relatedProductIds: [],
  features: "",
  applications: "",
  specifications: ""
};

const EMPTY_TASK_FORM = {
  assignedTo: "all",
  description: "",
  dueOn: ""
};

const EMPTY_ADMIN_ACCOUNT_FORM = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  companyName: "Sparkline",
  designation: "Admin",
  role: "admin"
};
const EMPTY_GALLERY_FORM = {
  mediaType: "image",
  description: ""
};
const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_UPLOAD_LABEL = "5 MB";
const MAX_GALLERY_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_GALLERY_IMAGE_UPLOAD_LABEL = "10 MB";
const MAX_GALLERY_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_GALLERY_VIDEO_UPLOAD_LABEL = "100 MB";

const isPdfFile = (file) =>
  Boolean(file) &&
  (String(file.type || "").toLowerCase() === "application/pdf" ||
    String(file.name || "").toLowerCase().endsWith(".pdf"));

const isImageFile = (file) =>
  Boolean(file) &&
  (["image/gif", "image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
    String(file.type || "").toLowerCase()
  ) ||
    [".gif", ".jpeg", ".jpg", ".png", ".webp"].some((extension) =>
      String(file.name || "").toLowerCase().endsWith(extension)
    ));

const isVideoFile = (file) =>
  Boolean(file) &&
  ([
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/ogg",
    "video/x-m4v"
  ].includes(String(file.type || "").toLowerCase()) ||
    [".mp4", ".mov", ".webm", ".ogv", ".m4v"].some((extension) =>
      String(file.name || "").toLowerCase().endsWith(extension)
    ));

const isOversizedImageFile = (file) =>
  Number(file?.size || 0) > MAX_IMAGE_UPLOAD_BYTES;

const isOversizedGalleryImageFile = (file) =>
  Number(file?.size || 0) > MAX_GALLERY_IMAGE_UPLOAD_BYTES;

const isOversizedGalleryVideoFile = (file) =>
  Number(file?.size || 0) > MAX_GALLERY_VIDEO_UPLOAD_BYTES;

const buildFileUploadPayload = (file, fallbackMimeType, errorMessage) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const dataBase64 = result.includes(",") ? result.split(",")[1] : result;

      resolve({
        fileName: file.name,
        mimeType: file.type || fallbackMimeType,
        dataBase64
      });
    };

    reader.onerror = () => {
      reject(new Error(errorMessage));
    };

    reader.readAsDataURL(file);
  });

const buildBrochureUploadPayload = (file) =>
  buildFileUploadPayload(
    file,
    "application/pdf",
    "Unable to read the selected brochure PDF"
  );

const buildImageUploadPayload = (file) =>
  buildFileUploadPayload(
    file,
    "image/jpeg",
    "Unable to read one of the selected category images"
  );

const buildGalleryMediaUploadPayload = (file, mediaType) =>
  buildFileUploadPayload(
    file,
    mediaType === "video" ? "video/mp4" : "image/jpeg",
    `Unable to read the selected gallery ${mediaType}`
  );

const getInquiryKey = (inquiry) => `${inquiry.inquiryType}-${inquiry.id}`;

const buildInquiryDrafts = (inquiries) =>
  Object.fromEntries(
    inquiries.map((inquiry) => [
      getInquiryKey(inquiry),
      {
        status: inquiry.status || "new",
        adminFeedback: inquiry.adminFeedback || ""
      }
    ])
  );

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium"
  }).format(new Date(value));
};

const formatDateTime = (value) => {
  if (!value) {
    return "Not yet recorded";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};

const formatFileSize = (value) => {
  const size = Number(value || 0);

  if (!size) {
    return "Size not available";
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
};

const formatStatusLabel = (value) => String(value || "").replaceAll("_", " ");
const formatInquiryTypeLabel = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ");
const formatTaskStatusLabel = (value) =>
  value === "completed" ? "Completed" : "Open";

const isMissingSparePartsRouteError = (error) =>
  /Cannot (GET|POST|PATCH|DELETE) \/api\/admin\/spare-parts(?:\/\d+)?/i.test(
    String(error?.message || error || "")
  );

const formatCategoryOption = (category) =>
  category.parentId ? `${category.rootName} / ${category.name}` : category.name;

const getCategoriesByRoot = (categories, rootSlug) =>
  categories.filter(
    (category) =>
      category.rootSlug === rootSlug &&
      (rootSlug === "spareparts" ? true : Boolean(category.parentId))
  );

const getProductsByRoot = (products, rootSlug) =>
  products.filter((product) => product.rootSlug === rootSlug);

const createEmptyProductForm = (categories, rootSlug) => {
  const availableCategories = getCategoriesByRoot(categories, rootSlug);

  return {
    ...EMPTY_PRODUCT_FORM,
    categoryId: availableCategories[0] ? String(availableCategories[0].id) : ""
  };
};

const createEmptyCategoryForm = (rootCategories) => ({
  ...EMPTY_CATEGORY_FORM,
  parentSlug: rootCategories[0]?.slug || ""
});

const buildCategoryFormFromRecord = (category) => ({
  parentSlug: category.rootSlug || "",
  name: category.name || "",
  slug: category.slug || "",
  shortDescription: category.shortDescription || "",
  fullDescription: category.fullDescription || "",
  sortOrder: category.sortOrder ? String(category.sortOrder) : ""
});

const buildProductFormFromRecord = (product) => ({
  categoryId: String(product.categoryId || ""),
  name: product.name || "",
  slug: product.slug || "",
  shortDescription: product.shortDescription || "",
  fullDescription: product.fullDescription || "",
  image: product.image || "/images/product1.jpg",
  brochureFileName: product.brochureFileName || "SPARKLINE-8.pdf",
  features: (product.features || []).join("\n"),
  applications: (product.applications || []).join("\n"),
  specifications: (product.specifications || [])
    .map((specification) => `${specification.label}: ${specification.value}`)
    .join("\n")
});

const buildSparePartFormFromRecord = (sparePart) => ({
  name: sparePart.name || "",
  slug: sparePart.slug || "",
  shortDescription: sparePart.shortDescription || "",
  fullDescription: sparePart.fullDescription || "",
  image: sparePart.image || "",
  relatedProductIds: (sparePart.relatedProductIds || []).map((entry) => String(entry)),
  features: (sparePart.features || []).join("\n"),
  applications: (sparePart.applications || []).join("\n"),
  specifications: (sparePart.specifications || [])
    .map((specification) => `${specification.label}: ${specification.value}`)
    .join("\n")
});

const buildDashboardSnapshot = async (isOwner) => {
  const sparePartsRequest = apiFetch("/admin/spare-parts").catch((error) => {
    if (isMissingSparePartsRouteError(error)) {
      return {
        spareParts: [],
        routeAvailable: false
      };
    }

    throw error;
  });

  const requests = [
    apiFetch("/admin/overview"),
    apiFetch("/admin/inquiries"),
    apiFetch("/admin/users"),
    apiFetch("/admin/tasks"),
    apiFetch("/admin/catalog"),
    apiFetch("/admin/gallery"),
    sparePartsRequest
  ];

  if (isOwner) {
    requests.push(apiFetch("/admin/audits"));
  }

  const responses = await Promise.all(requests);
  const [
    overviewResponse,
    inquiriesResponse,
    usersResponse,
    tasksResponse,
    catalogResponse,
    galleryResponse,
    sparePartsResponse,
    auditsResponse
  ] = responses;

  return {
    overview: overviewResponse.metrics,
    inquiries: inquiriesResponse.inquiries || [],
    users: usersResponse.users || [],
    tasks: tasksResponse.tasks || [],
    galleryItems: galleryResponse.items || [],
    spareParts: sparePartsResponse.spareParts || [],
    sparePartsRouteAvailable: sparePartsResponse.routeAvailable !== false,
    audits: isOwner ? auditsResponse?.audits || [] : [],
    catalog: {
      categories: catalogResponse.categories || [],
      products: catalogResponse.products || []
    }
  };
};

function AdminPage() {
  const location = useLocation();
  const { isReady, user } = useAuth();
  const isOwner = user?.role === "owner";
  const isOwnerRoute = location.pathname === "/owner";
  const availableSections =
    isOwner && isOwnerRoute
      ? OWNER_PORTAL_SECTIONS
      : isOwner
        ? [...BASE_SECTIONS, ...OWNER_SECTIONS]
        : BASE_SECTIONS;

  const [activeSection, setActiveSection] = useState("inquiries");
  const [overview, setOverview] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [audits, setAudits] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [sparePartsRouteAvailable, setSparePartsRouteAvailable] = useState(true);
  const [catalog, setCatalog] = useState({ categories: [], products: [] });
  const [inquiryDrafts, setInquiryDrafts] = useState({});
  const [selectedInquiryKey, setSelectedInquiryKey] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [inquiryFilter, setInquiryFilter] = useState("all");
  const [refreshingSection, setRefreshingSection] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM);
  const [categoryEditor, setCategoryEditor] = useState({
    mode: "create",
    selectedId: ""
  });
  const [categoryImageFiles, setCategoryImageFiles] = useState([]);
  const [categoryImageInputKey, setCategoryImageInputKey] = useState(0);
  const [categoryBrochureFile, setCategoryBrochureFile] = useState(null);
  const [existingCategoryBrochureFile, setExistingCategoryBrochureFile] = useState(null);
  const [selectedBrochureCategoryId, setSelectedBrochureCategoryId] = useState("");
  const [categoryBrochureInputKey, setCategoryBrochureInputKey] = useState(0);
  const [existingCategoryBrochureInputKey, setExistingCategoryBrochureInputKey] =
    useState(0);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
  const [adminAccountForm, setAdminAccountForm] = useState(EMPTY_ADMIN_ACCOUNT_FORM);
  const [galleryForm, setGalleryForm] = useState(EMPTY_GALLERY_FORM);
  const [galleryMediaFile, setGalleryMediaFile] = useState(null);
  const [galleryMediaInputKey, setGalleryMediaInputKey] = useState(0);
  const [productEditors, setProductEditors] = useState({
    machinery: {
      mode: "create",
      selectedId: "",
      form: EMPTY_PRODUCT_FORM
    }
  });
  const [productImageInputs, setProductImageInputs] = useState({
    machinery: {
      file: null,
      inputKey: 0
    }
  });
  const [sparePartEditor, setSparePartEditor] = useState({
    mode: "create",
    selectedId: "",
    form: EMPTY_SPARE_PART_FORM
  });
  const [sparePartImageInput, setSparePartImageInput] = useState({
    file: null,
    inputKey: 0
  });

  const adminUsers = useMemo(
    () => users.filter((entry) => entry.role === "admin"),
    [users]
  );

  const staffUsers = useMemo(
    () => users.filter((entry) => ["admin", "owner"].includes(entry.role)),
    [users]
  );

  const rootCategories = useMemo(
    () => catalog.categories.filter((category) => !category.parentId),
    [catalog.categories]
  );

  const editableCategories = useMemo(
    () =>
      catalog.categories
        .filter((category) => category.parentId)
        .sort((left, right) => {
          const rootComparison = String(left.rootName || "").localeCompare(
            String(right.rootName || "")
          );

          if (rootComparison !== 0) {
            return rootComparison;
          }

          return String(left.name || "").localeCompare(String(right.name || ""));
        }),
    [catalog.categories]
  );

  const selectedCategoryRecord = useMemo(
    () =>
      editableCategories.find(
        (category) => String(category.id) === String(categoryEditor.selectedId)
      ) || null,
    [categoryEditor.selectedId, editableCategories]
  );

  const brochureManagedCategories = useMemo(
    () =>
      catalog.categories.filter(
        (category) => category.parentId && category.rootSlug === "machinery"
      ),
    [catalog.categories]
  );

  const selectedBrochureCategory = useMemo(
    () =>
      brochureManagedCategories.find(
        (category) => String(category.id) === String(selectedBrochureCategoryId)
      ) || null,
    [brochureManagedCategories, selectedBrochureCategoryId]
  );

  const inquiryCounts = useMemo(
    () =>
      inquiries.reduce(
        (counts, inquiry) => ({
          ...counts,
          all: counts.all + 1,
          [inquiry.status]: (counts[inquiry.status] || 0) + 1
        }),
        {
          all: 0,
          new: 0,
          called: 0,
          resolved: 0,
          not_resolved: 0
        }
      ),
    [inquiries]
  );

  const filteredInquiries = useMemo(() => {
    if (inquiryFilter === "all") {
      return inquiries;
    }

    return inquiries.filter((inquiry) => inquiry.status === inquiryFilter);
  }, [inquiries, inquiryFilter]);

  const selectedInquiry = useMemo(
    () =>
      filteredInquiries.find((inquiry) => getInquiryKey(inquiry) === selectedInquiryKey) ||
      null,
    [filteredInquiries, selectedInquiryKey]
  );

  const selectedUser = useMemo(
    () => users.find((entry) => String(entry.id) === String(selectedUserId)) || null,
    [users, selectedUserId]
  );

  const websiteProductOptions = useMemo(
    () =>
      [...catalog.products].sort((left, right) => {
        const rootComparison = String(left.rootName || "").localeCompare(
          String(right.rootName || "")
        );

        if (rootComparison !== 0) {
          return rootComparison;
        }

        const categoryComparison = String(left.categoryName || "").localeCompare(
          String(right.categoryName || "")
        );

        if (categoryComparison !== 0) {
          return categoryComparison;
        }

        return String(left.name || "").localeCompare(String(right.name || ""));
      }),
    [catalog.products]
  );

  const categoryGroups = useMemo(() => {
    const productsByCategory = catalog.products.reduce((map, product) => {
      const nextMap = map;

      if (!nextMap.has(product.categoryId)) {
        nextMap.set(product.categoryId, []);
      }

      nextMap.get(product.categoryId).push(product);
      return nextMap;
    }, new Map());

    const groupMap = new Map();

    catalog.categories.forEach((category) => {
      const groupKey = category.rootId || category.id;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          id: groupKey,
          name: category.rootName || category.name,
          categories: [],
          directProducts: []
        });
      }

      const group = groupMap.get(groupKey);

      if (!category.parentId) {
        group.directProducts = productsByCategory.get(category.id) || [];
      } else {
        group.categories.push({
          ...category,
          products: productsByCategory.get(category.id) || []
        });
      }
    });

    return Array.from(groupMap.values());
  }, [catalog.categories, catalog.products]);

  useEffect(() => {
    if (!STAFF_ROLES.includes(user?.role)) {
      return;
    }

    let isCancelled = false;

    const loadDashboard = async () => {
      setIsLoading(true);
      setError("");

      try {
        const snapshot = await buildDashboardSnapshot(user.role === "owner");

        if (isCancelled) {
          return;
        }

        setOverview(snapshot.overview);
        setInquiries(snapshot.inquiries);
        setUsers(snapshot.users);
        setTasks(snapshot.tasks);
        setAudits(snapshot.audits);
        setGalleryItems(snapshot.galleryItems);
        setSpareParts(snapshot.spareParts);
        setSparePartsRouteAvailable(snapshot.sparePartsRouteAvailable);
        setCatalog(snapshot.catalog);
        setInquiryDrafts(buildInquiryDrafts(snapshot.inquiries));
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

    loadDashboard();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!STAFF_ROLES.includes(user?.role)) {
      return;
    }

    if (OWNER_SECTION_IDS.has(activeSection) && user.role !== "owner") {
      setActiveSection("inquiries");
      return;
    }

    if (
      isOwnerRoute &&
      user.role === "owner" &&
      !OWNER_PORTAL_SECTION_IDS.has(activeSection)
    ) {
      setActiveSection("tasks");
    }
  }, [activeSection, isOwnerRoute, user]);

  useEffect(() => {
    if (!rootCategories.length) {
      return;
    }

    setCategoryForm((currentForm) => {
      if (categoryEditor.mode === "edit") {
        return currentForm;
      }

      return currentForm.parentSlug
        ? currentForm
        : {
            ...currentForm,
            parentSlug: rootCategories[0].slug
          };
    });
  }, [categoryEditor.mode, rootCategories]);

  useEffect(() => {
    if (
      categoryEditor.mode === "edit" &&
      categoryEditor.selectedId &&
      !selectedCategoryRecord
    ) {
      setCategoryEditor({ mode: "create", selectedId: "" });
      setCategoryForm(createEmptyCategoryForm(rootCategories));
      setCategoryImageFiles([]);
      setCategoryImageInputKey((currentKey) => currentKey + 1);
      setCategoryBrochureFile(null);
      setCategoryBrochureInputKey((currentKey) => currentKey + 1);
    }
  }, [categoryEditor, rootCategories, selectedCategoryRecord]);

  useEffect(() => {
    if (!brochureManagedCategories.length) {
      setSelectedBrochureCategoryId("");
      return;
    }

    if (
      !brochureManagedCategories.some(
        (category) => String(category.id) === String(selectedBrochureCategoryId)
      )
    ) {
      setSelectedBrochureCategoryId(String(brochureManagedCategories[0].id));
    }
  }, [brochureManagedCategories, selectedBrochureCategoryId]);

  useEffect(() => {
    if (!filteredInquiries.length) {
      setSelectedInquiryKey("");
      return;
    }

    if (
      !filteredInquiries.some(
        (inquiry) => getInquiryKey(inquiry) === selectedInquiryKey
      )
    ) {
      setSelectedInquiryKey(getInquiryKey(filteredInquiries[0]));
    }
  }, [filteredInquiries, selectedInquiryKey]);

  useEffect(() => {
    if (!users.length) {
      setSelectedUserId("");
      return;
    }

    if (!users.some((entry) => String(entry.id) === String(selectedUserId))) {
      setSelectedUserId(String(users[0].id));
    }
  }, [users, selectedUserId]);

  useEffect(() => {
    const roots = ["machinery"];

    setProductEditors((currentEditors) => {
      let hasChanges = false;
      const nextEditors = { ...currentEditors };

      for (const rootSlug of roots) {
        const currentEditor = currentEditors[rootSlug];
        const availableCategories = getCategoriesByRoot(catalog.categories, rootSlug);
        const selectedProduct = catalog.products.find(
          (product) => String(product.id) === String(currentEditor.selectedId)
        );

        if (!availableCategories.length) {
          nextEditors[rootSlug] = {
            mode: "create",
            selectedId: "",
            form: { ...EMPTY_PRODUCT_FORM, categoryId: "" }
          };
          hasChanges = true;
          continue;
        }

        if (
          currentEditor.mode === "edit" &&
          (!selectedProduct || selectedProduct.rootSlug !== rootSlug)
        ) {
          nextEditors[rootSlug] = {
            mode: "create",
            selectedId: "",
            form: createEmptyProductForm(catalog.categories, rootSlug)
          };
          hasChanges = true;
          continue;
        }

        if (
          currentEditor.mode === "create" &&
          !availableCategories.some(
            (category) => String(category.id) === String(currentEditor.form.categoryId)
          )
        ) {
          nextEditors[rootSlug] = {
            ...currentEditor,
            form: createEmptyProductForm(catalog.categories, rootSlug)
          };
          hasChanges = true;
        }
      }

      return hasChanges ? nextEditors : currentEditors;
    });
  }, [catalog.categories, catalog.products]);

  useEffect(() => {
    if (
      sparePartEditor.mode === "edit" &&
      sparePartEditor.selectedId &&
      !spareParts.some(
        (sparePart) => String(sparePart.id) === String(sparePartEditor.selectedId)
      )
    ) {
      setSparePartEditor({
        mode: "create",
        selectedId: "",
        form: EMPTY_SPARE_PART_FORM
      });
      setSparePartImageInput((currentInput) => ({
        file: null,
        inputKey: currentInput.inputKey + 1
      }));
    }
  }, [sparePartEditor.mode, sparePartEditor.selectedId, spareParts]);

  const refreshDashboard = async (sectionName = "") => {
    if (!user) {
      return;
    }

    setRefreshingSection(sectionName);
    setError("");

    try {
      const snapshot = await buildDashboardSnapshot(user.role === "owner");
      setOverview(snapshot.overview);
      setInquiries(snapshot.inquiries);
      setUsers(snapshot.users);
      setTasks(snapshot.tasks);
      setAudits(snapshot.audits);
      setGalleryItems(snapshot.galleryItems);
      setSpareParts(snapshot.spareParts);
      setSparePartsRouteAvailable(snapshot.sparePartsRouteAvailable);
      setCatalog(snapshot.catalog);
      setInquiryDrafts(buildInquiryDrafts(snapshot.inquiries));
    } catch (refreshError) {
      setError(refreshError.message);
    } finally {
      setRefreshingSection("");
    }
  };

  const handleInquiryDraftChange = (inquiryKey, fieldName, value) => {
    setInquiryDrafts((currentDrafts) => ({
      ...currentDrafts,
      [inquiryKey]: {
        ...currentDrafts[inquiryKey],
        [fieldName]: value
      }
    }));
  };

  const handleInquirySave = async () => {
    if (!selectedInquiry) {
      return;
    }

    const inquiryKey = getInquiryKey(selectedInquiry);
    const draft = inquiryDrafts[inquiryKey];

    if (!draft) {
      return;
    }

    setRefreshingSection(inquiryKey);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(
        `/admin/inquiries/${selectedInquiry.inquiryType}/${selectedInquiry.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(draft)
        }
      );

      setNotice(response.message);
      await refreshDashboard(inquiryKey);
    } catch (saveError) {
      setError(saveError.message);
      setRefreshingSection("");
    }
  };

  const handleCategoryFormChange = (event) => {
    const { name, value } = event.target;

    setCategoryForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  };

  const resetCategoryEditor = () => {
    setCategoryEditor({ mode: "create", selectedId: "" });
    setCategoryForm(createEmptyCategoryForm(rootCategories));
    setCategoryImageFiles([]);
    setCategoryImageInputKey((currentKey) => currentKey + 1);
    setCategoryBrochureFile(null);
    setCategoryBrochureInputKey((currentKey) => currentKey + 1);
  };

  const selectCategoryForEdit = (category) => {
    setCategoryEditor({
      mode: "edit",
      selectedId: String(category.id)
    });
    setCategoryForm(buildCategoryFormFromRecord(category));
    setCategoryImageFiles([]);
    setCategoryImageInputKey((currentKey) => currentKey + 1);
    setCategoryBrochureFile(null);
    setCategoryBrochureInputKey((currentKey) => currentKey + 1);
  };

  const handleCategoryImageFilesChange = (event) => {
    const nextFiles = Array.from(event.target.files || []);

    if (nextFiles.some((file) => !isImageFile(file))) {
      setError("Only JPG, PNG, WEBP, or GIF image files are allowed.");
      setCategoryImageFiles([]);
      event.target.value = "";
      return;
    }

    if (nextFiles.some((file) => isOversizedImageFile(file))) {
      setError(`Each category image must be ${MAX_IMAGE_UPLOAD_LABEL} or smaller.`);
      setCategoryImageFiles([]);
      event.target.value = "";
      return;
    }

    setError("");
    setCategoryImageFiles(nextFiles);
  };

  const handleCategoryBrochureFileChange = (event, mode) => {
    const nextFile = event.target.files?.[0] || null;

    if (nextFile && !isPdfFile(nextFile)) {
      setError("Only PDF brochure files are allowed.");
      event.target.value = "";
      return;
    }

    setError("");

    if (mode === "create") {
      setCategoryBrochureFile(nextFile);
      return;
    }

    setExistingCategoryBrochureFile(nextFile);
  };

  const handleTaskFormChange = (event) => {
    const { name, value } = event.target;

    setTaskForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  };

  const handleAdminAccountChange = (event) => {
    const { name, value } = event.target;

    setAdminAccountForm((currentForm) => {
      const normalizedValue = name === "phone" ? normalizePhoneInput(value) : value;
      const nextForm = {
        ...currentForm,
        [name]: normalizedValue
      };

      if (
        name === "role" &&
        (!currentForm.designation || ["Admin", "Owner"].includes(currentForm.designation))
      ) {
        nextForm.designation = normalizedValue === "owner" ? "Owner" : "Admin";
      }

      return nextForm;
    });
  };

  const handleGalleryFormChange = (event) => {
    const { name, value } = event.target;

    setGalleryForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));

    if (name === "mediaType") {
      setGalleryMediaFile(null);
      setGalleryMediaInputKey((currentKey) => currentKey + 1);
    }
  };

  const handleGalleryMediaFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;

    if (!nextFile) {
      setGalleryMediaFile(null);
      return;
    }

    if (galleryForm.mediaType === "video") {
      if (!isVideoFile(nextFile)) {
        setError("Only MP4, MOV, WEBM, M4V, or OGV video files are allowed.");
        setGalleryMediaFile(null);
        event.target.value = "";
        return;
      }

      if (isOversizedGalleryVideoFile(nextFile)) {
        setError(
          `Each gallery video must be ${MAX_GALLERY_VIDEO_UPLOAD_LABEL} or smaller.`
        );
        setGalleryMediaFile(null);
        event.target.value = "";
        return;
      }
    } else {
      if (!isImageFile(nextFile)) {
        setError("Only JPG, PNG, WEBP, or GIF image files are allowed.");
        setGalleryMediaFile(null);
        event.target.value = "";
        return;
      }

      if (isOversizedGalleryImageFile(nextFile)) {
        setError(
          `Each gallery image must be ${MAX_GALLERY_IMAGE_UPLOAD_LABEL} or smaller.`
        );
        setGalleryMediaFile(null);
        event.target.value = "";
        return;
      }
    }

    setError("");
    setGalleryMediaFile(nextFile);
  };

  const handleProductEditorChange = (rootSlug, event) => {
    const { name, value } = event.target;

    setProductEditors((currentEditors) => ({
      ...currentEditors,
      [rootSlug]: {
        ...currentEditors[rootSlug],
        form: {
          ...currentEditors[rootSlug].form,
          [name]: value
        }
      }
    }));
  };

  const handleProductImageFileChange = (rootSlug, event) => {
    const nextFile = event.target.files?.[0] || null;

    if (nextFile && !isImageFile(nextFile)) {
      setError("Only JPG, PNG, WEBP, or GIF image files are allowed.");
      event.target.value = "";
      return;
    }

    if (nextFile && isOversizedImageFile(nextFile)) {
      setError(`Each product image must be ${MAX_IMAGE_UPLOAD_LABEL} or smaller.`);
      event.target.value = "";
      return;
    }

    setError("");
    setProductImageInputs((currentInputs) => ({
      ...currentInputs,
      [rootSlug]: {
        ...currentInputs[rootSlug],
        file: nextFile
      }
    }));
  };

  const handleSparePartEditorChange = (event) => {
    const { name, value } = event.target;

    setSparePartEditor((currentEditor) => ({
      ...currentEditor,
      form: {
        ...currentEditor.form,
        [name]: value
      }
    }));
  };

  const handleSparePartRelatedProductsChange = (event) => {
    const selectedIds = Array.from(event.target.selectedOptions || []).map(
      (option) => option.value
    );

    setSparePartEditor((currentEditor) => ({
      ...currentEditor,
      form: {
        ...currentEditor.form,
        relatedProductIds: selectedIds
      }
    }));
  };

  const handleSparePartImageFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;

    if (nextFile && !isImageFile(nextFile)) {
      setError("Only JPG, PNG, WEBP, or GIF image files are allowed.");
      event.target.value = "";
      return;
    }

    if (nextFile && isOversizedImageFile(nextFile)) {
      setError(`Each spare part image must be ${MAX_IMAGE_UPLOAD_LABEL} or smaller.`);
      event.target.value = "";
      return;
    }

    setError("");
    setSparePartImageInput((currentInput) => ({
      ...currentInput,
      file: nextFile
    }));
  };

  const resetProductEditor = (rootSlug) => {
    setProductEditors((currentEditors) => ({
      ...currentEditors,
      [rootSlug]: {
        mode: "create",
        selectedId: "",
        form: createEmptyProductForm(catalog.categories, rootSlug)
      }
    }));
    setProductImageInputs((currentInputs) => ({
      ...currentInputs,
      [rootSlug]: {
        file: null,
        inputKey: currentInputs[rootSlug].inputKey + 1
      }
    }));
  };

  const resetSparePartEditor = () => {
    setSparePartEditor({
      mode: "create",
      selectedId: "",
      form: EMPTY_SPARE_PART_FORM
    });
    setSparePartImageInput((currentInput) => ({
      file: null,
      inputKey: currentInput.inputKey + 1
    }));
  };

  const selectProductForEdit = (rootSlug, product) => {
    setProductEditors((currentEditors) => ({
      ...currentEditors,
      [rootSlug]: {
        mode: "edit",
        selectedId: String(product.id),
        form: buildProductFormFromRecord(product)
      }
    }));
    setProductImageInputs((currentInputs) => ({
      ...currentInputs,
      [rootSlug]: {
        file: null,
        inputKey: currentInputs[rootSlug].inputKey + 1
      }
    }));
  };

  const selectSparePartForEdit = (sparePart) => {
    setSparePartEditor({
      mode: "edit",
      selectedId: String(sparePart.id),
      form: buildSparePartFormFromRecord(sparePart)
    });
    setSparePartImageInput((currentInput) => ({
      file: null,
      inputKey: currentInput.inputKey + 1
    }));
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const isEditMode = categoryEditor.mode === "edit" && categoryEditor.selectedId;

    if (!isEditMode && categoryImageFiles.length === 0) {
      setError("Select at least one category image.");
      return;
    }

    setRefreshingSection("category-form");

    try {
      const imageUploads =
        categoryImageFiles.length > 0
          ? await Promise.all(
              categoryImageFiles.map((file) => buildImageUploadPayload(file))
            )
          : [];
      const brochureUpload = categoryBrochureFile
        ? await buildBrochureUploadPayload(categoryBrochureFile)
        : null;
      const response = await apiFetch(
        isEditMode ? `/admin/categories/${categoryEditor.selectedId}` : "/admin/categories",
        {
          method: isEditMode ? "PATCH" : "POST",
          body: JSON.stringify({
            ...categoryForm,
            imageUploads,
            brochureUpload
          })
        }
      );

      setNotice(response.message);
      if (isEditMode) {
        resetCategoryEditor();
      } else {
        setCategoryForm((currentForm) => ({
          ...EMPTY_CATEGORY_FORM,
          parentSlug: currentForm.parentSlug
        }));
      }
      setCategoryImageFiles([]);
      setCategoryImageInputKey((currentKey) => currentKey + 1);
      setCategoryBrochureFile(null);
      setCategoryBrochureInputKey((currentKey) => currentKey + 1);
      await refreshDashboard("category-form");
    } catch (submitError) {
      setError(submitError.message);
      setRefreshingSection("");
    }
  };

  const handleCategoryBrochureSubmit = async (event) => {
    event.preventDefault();

    if (!selectedBrochureCategory) {
      setError("Select a machinery category before uploading a brochure.");
      return;
    }

    if (!existingCategoryBrochureFile) {
      setError("Select a brochure PDF to upload.");
      return;
    }

    setRefreshingSection("category-brochure-form");
    setError("");
    setNotice("");

    try {
      const brochureUpload = await buildBrochureUploadPayload(
        existingCategoryBrochureFile
      );
      const response = await apiFetch(
        `/admin/categories/${selectedBrochureCategory.id}/brochure`,
        {
          method: "PATCH",
          body: JSON.stringify({ brochureUpload })
        }
      );

      setNotice(response.message);
      setExistingCategoryBrochureFile(null);
      setExistingCategoryBrochureInputKey((currentKey) => currentKey + 1);
      await refreshDashboard("category-brochure-form");
    } catch (submitError) {
      setError(submitError.message);
      setRefreshingSection("");
    }
  };

  const submitProductEditor = async (rootSlug) => {
    const editor = productEditors[rootSlug];
    const isEditMode = editor.mode === "edit" && editor.selectedId;
    const imageFile = productImageInputs[rootSlug].file;
    const endpoint = isEditMode
      ? `/admin/products/${editor.selectedId}`
      : "/admin/products";
    const method = isEditMode ? "PATCH" : "POST";
    const loadingKey = `${rootSlug}-product-form`;

    if (!isEditMode && !imageFile) {
      setError("Select a product image before saving.");
      return;
    }

    setRefreshingSection(loadingKey);
    setError("");
    setNotice("");

    try {
      const imageUpload = imageFile
        ? await buildImageUploadPayload(imageFile)
        : null;
      const response = await apiFetch(endpoint, {
        method,
        body: JSON.stringify({
          ...editor.form,
          imageUpload
        })
      });

      setNotice(response.message);
      await refreshDashboard(loadingKey);
      resetProductEditor(rootSlug);
    } catch (submitError) {
      setError(submitError.message);
      setRefreshingSection("");
    }
  };

  const submitSparePartEditor = async () => {
    const isEditMode = sparePartEditor.mode === "edit" && sparePartEditor.selectedId;
    const imageFile = sparePartImageInput.file;
    const endpoint = isEditMode
      ? `/admin/spare-parts/${sparePartEditor.selectedId}`
      : "/admin/spare-parts";
    const method = isEditMode ? "PATCH" : "POST";
    const loadingKey = "spare-parts-form";

    if (!isEditMode && !imageFile) {
      setError("Select a spare part image before saving.");
      return;
    }

    setRefreshingSection(loadingKey);
    setError("");
    setNotice("");

    try {
      const imageUpload = imageFile ? await buildImageUploadPayload(imageFile) : null;
      const response = await apiFetch(endpoint, {
        method,
        body: JSON.stringify({
          ...sparePartEditor.form,
          imageUpload
        })
      });

      setNotice(response.message);
      await refreshDashboard(loadingKey);
      resetSparePartEditor();
    } catch (submitError) {
      setError(
        isMissingSparePartsRouteError(submitError)
          ? "Restart the backend once so the spare parts admin routes become available."
          : submitError.message
      );
      setRefreshingSection("");
    }
  };

  const handleDeleteProduct = async (rootSlug) => {
    const editor = productEditors[rootSlug];

    if (!editor.selectedId) {
      return;
    }

    const selectedProduct = catalog.products.find(
      (product) => String(product.id) === String(editor.selectedId)
    );

    if (!selectedProduct) {
      return;
    }

    if (!window.confirm(`Delete ${selectedProduct.name}?`)) {
      return;
    }

    const loadingKey = `${rootSlug}-delete-product`;
    setRefreshingSection(loadingKey);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(`/admin/products/${selectedProduct.id}`, {
        method: "DELETE"
      });

      setNotice(response.message);
      resetProductEditor(rootSlug);
      await refreshDashboard(loadingKey);
    } catch (deleteError) {
      setError(deleteError.message);
      setRefreshingSection("");
    }
  };

  const handleDeleteSparePart = async (sparePart = null) => {
    const targetSparePart =
      sparePart ||
      spareParts.find(
        (currentSparePart) =>
          String(currentSparePart.id) === String(sparePartEditor.selectedId)
      );

    if (!targetSparePart) {
      return;
    }

    if (!window.confirm(`Delete ${targetSparePart.name}?`)) {
      return;
    }

    const loadingKey = `delete-spare-part-${targetSparePart.id}`;
    setRefreshingSection(loadingKey);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(`/admin/spare-parts/${targetSparePart.id}`, {
        method: "DELETE"
      });

      setNotice(response.message);

      if (String(sparePartEditor.selectedId) === String(targetSparePart.id)) {
        resetSparePartEditor();
      }

      await refreshDashboard(loadingKey);
    } catch (deleteError) {
      setError(
        isMissingSparePartsRouteError(deleteError)
          ? "Restart the backend once so the spare parts admin routes become available."
          : deleteError.message
      );
      setRefreshingSection("");
    }
  };

  const handleDeleteProductById = async (product) => {
    if (!window.confirm(`Delete ${product.name}?`)) {
      return;
    }

    const loadingKey = `delete-product-${product.id}`;
    setRefreshingSection(loadingKey);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(`/admin/products/${product.id}`, {
        method: "DELETE"
      });

      setNotice(response.message);

      if (
        String(productEditors[product.rootSlug]?.selectedId || "") === String(product.id)
      ) {
        resetProductEditor(product.rootSlug);
      }

      await refreshDashboard(loadingKey);
    } catch (deleteError) {
      setError(deleteError.message);
      setRefreshingSection("");
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Delete category ${categoryName}?`)) {
      return;
    }

    const loadingKey = `delete-category-${categoryId}`;
    setRefreshingSection(loadingKey);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(`/admin/categories/${categoryId}`, {
        method: "DELETE"
      });

      setNotice(response.message);
      await refreshDashboard(loadingKey);
    } catch (deleteError) {
      setError(deleteError.message);
      setRefreshingSection("");
    }
  };

  const handleTaskSubmit = async (event) => {
    event.preventDefault();
    setRefreshingSection("task-form");
    setError("");
    setNotice("");

    try {
      const response = await apiFetch("/admin/tasks", {
        method: "POST",
        body: JSON.stringify(taskForm)
      });

      setNotice(response.message);
      setTaskForm(EMPTY_TASK_FORM);
      await refreshDashboard("task-form");
    } catch (submitError) {
      setError(submitError.message);
      setRefreshingSection("");
    }
  };

  const handleTaskStatusUpdate = async (taskId, status) => {
    const loadingKey = `task-status-${taskId}`;
    setRefreshingSection(loadingKey);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(`/admin/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });

      setNotice(response.message);
      await refreshDashboard(loadingKey);
    } catch (submitError) {
      setError(submitError.message);
      setRefreshingSection("");
    }
  };

  const handleAdminAccountSubmit = async (event) => {
    event.preventDefault();
    if (!isValidEmail(adminAccountForm.email)) {
      setError("Enter a valid email address for the staff account.");
      return;
    }

    if (adminAccountForm.phone && !isValidPhone(adminAccountForm.phone)) {
      setError(`Enter a valid ${PHONE_DIGIT_LIMIT}-digit phone number.`);
      return;
    }

    setRefreshingSection("admin-account-form");
    setError("");
    setNotice("");

    try {
      const response = await apiFetch("/admin/admin-accounts", {
        method: "POST",
        body: JSON.stringify(adminAccountForm)
      });

      setNotice(response.message);
      setAdminAccountForm(EMPTY_ADMIN_ACCOUNT_FORM);
      await refreshDashboard("admin-account-form");
    } catch (submitError) {
      setError(submitError.message);
      setRefreshingSection("");
    }
  };

  const handleGallerySubmit = async (event) => {
    event.preventDefault();

    if (!galleryMediaFile) {
      setError(
        `Select a ${galleryForm.mediaType === "video" ? "video" : "image"} file first.`
      );
      return;
    }

    if (!String(galleryForm.description || "").trim()) {
      setError("Add a short description for the gallery item.");
      return;
    }

    setRefreshingSection("gallery-form");
    setError("");
    setNotice("");

    try {
      const mediaUpload = await buildGalleryMediaUploadPayload(
        galleryMediaFile,
        galleryForm.mediaType
      );
      const response = await apiFetch("/admin/gallery", {
        method: "POST",
        body: JSON.stringify({
          ...galleryForm,
          mediaUpload
        })
      });

      setNotice(response.message);
      setGalleryForm(EMPTY_GALLERY_FORM);
      setGalleryMediaFile(null);
      setGalleryMediaInputKey((currentKey) => currentKey + 1);
      await refreshDashboard("gallery-form");
    } catch (submitError) {
      setError(submitError.message);
      setRefreshingSection("");
    }
  };

  const handleDeleteGalleryItem = async (item) => {
    if (!window.confirm("Delete this gallery item?")) {
      return;
    }

    const loadingKey = `delete-gallery-${item.id}`;
    setRefreshingSection(loadingKey);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(`/admin/gallery/${item.id}`, {
        method: "DELETE"
      });

      setGalleryItems((currentItems) =>
        currentItems.filter(
          (currentItem) => String(currentItem.id) !== String(item.id)
        )
      );
      setNotice(response.message);
      await refreshDashboard(loadingKey);
    } catch (deleteError) {
      setError(deleteError.message);
      setRefreshingSection("");
    }
  };

  const renderProductManager = (rootSlug, heading, helperText) => {
    const editor = productEditors[rootSlug];
    const productImageInput = productImageInputs[rootSlug];
    const availableCategories = getCategoriesByRoot(catalog.categories, rootSlug);
    const availableProducts = getProductsByRoot(catalog.products, rootSlug);
    const isEditMode = editor.mode === "edit" && editor.selectedId;
    const loadingKey = `${rootSlug}-product-form`;
    const deletingKey = `${rootSlug}-delete-product`;

    return (
      <div className="admin-content-stack">
        <div className="admin-content-head">
          <p className="section-eyebrow">{heading}</p>
          <h1>{heading === "Products" ? "Manage machinery products" : "Manage spare parts"}</h1>
          <p>{helperText}</p>
        </div>

        <div className="admin-list-layout">
          <article className="admin-section-card admin-list-panel">
            <div className="admin-section-head compact">
              <div>
                <p className="section-eyebrow">Existing Items</p>
                <h2>{availableProducts.length} products</h2>
              </div>

              <button
                type="button"
                className="btn btn-outline btn-small"
                onClick={() => resetProductEditor(rootSlug)}
              >
                Add New
              </button>
            </div>

            {availableProducts.length ? (
              <div className="admin-list">
                {availableProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className={`admin-list-item ${
                      String(product.id) === String(editor.selectedId) ? "is-active" : ""
                    }`}
                    onClick={() => selectProductForEdit(rootSlug, product)}
                  >
                    <div className="admin-list-item-top">
                      <strong>{product.name}</strong>
                      <span className="admin-role-pill">{product.categoryName}</span>
                    </div>
                    <p>{product.shortDescription}</p>
                    <div className="admin-list-item-meta">
                      <span>{product.categoryName}</span>
                      <span>{formatDate(product.updatedAt || product.createdAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state admin-empty">No products found in this section yet.</div>
            )}
          </article>

          <article className="admin-section-card admin-detail-panel">
            <div className="admin-section-head compact">
              <div>
                <p className="section-eyebrow">{isEditMode ? "Edit Product" : "Add Product"}</p>
                <h2>{isEditMode ? "Update selected product" : "Create a new product"}</h2>
              </div>
            </div>

            <form
              className="form-stack"
              onSubmit={(event) => {
                event.preventDefault();
                submitProductEditor(rootSlug);
              }}
            >
              <div className="form-grid">
                <label className="form-field">
                  <span>Placement Category</span>
                  <select
                    name="categoryId"
                    value={editor.form.categoryId}
                    onChange={(event) => handleProductEditorChange(rootSlug, event)}
                    required
                  >
                    <option value="" disabled>
                      Select category
                    </option>
                    {availableCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {formatCategoryOption(category)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Product Name</span>
                  <input
                    name="name"
                    value={editor.form.name}
                    onChange={(event) => handleProductEditorChange(rootSlug, event)}
                    placeholder={rootSlug === "spareparts" ? "Bearing Kit" : "SCM 42"}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Custom Slug</span>
                  <input
                    name="slug"
                    value={editor.form.slug}
                    onChange={(event) => handleProductEditorChange(rootSlug, event)}
                    placeholder="Optional"
                  />
                </label>

                <label className="form-field full-width">
                  <span>Product Image</span>
                  <input
                    key={productImageInput.inputKey}
                    type="file"
                    accept=".gif,.jpeg,.jpg,.png,.webp,image/gif,image/jpeg,image/png,image/webp"
                    onChange={(event) => handleProductImageFileChange(rootSlug, event)}
                    required={!isEditMode}
                  />
                  <small className="admin-field-note">
                    {isEditMode
                      ? `Choose a new image only if you want to replace the current one. Maximum ${MAX_IMAGE_UPLOAD_LABEL}.`
                      : `Upload the product image from this device. Maximum ${MAX_IMAGE_UPLOAD_LABEL}.`}
                  </small>
                  {productImageInput.file ? (
                    <div className="admin-file-list">
                      <span>{productImageInput.file.name}</span>
                    </div>
                  ) : null}
                  {isEditMode ? (
                    <div className="admin-detail-item">
                      <small>Current Image</small>
                      <strong>{editor.form.image || "No image available"}</strong>
                    </div>
                  ) : null}
                </label>

                <label className="form-field">
                  <span>Brochure File Name</span>
                  <input
                    name="brochureFileName"
                    value={editor.form.brochureFileName}
                    onChange={(event) => handleProductEditorChange(rootSlug, event)}
                    placeholder="SPARKLINE-8.pdf"
                  />
                </label>

                <label className="form-field full-width">
                  <span>Short Description</span>
                  <textarea
                    name="shortDescription"
                    rows="3"
                    value={editor.form.shortDescription}
                    onChange={(event) => handleProductEditorChange(rootSlug, event)}
                    required
                  />
                </label>

                <label className="form-field full-width">
                  <span>Full Description</span>
                  <textarea
                    name="fullDescription"
                    rows="5"
                    value={editor.form.fullDescription}
                    onChange={(event) => handleProductEditorChange(rootSlug, event)}
                    required
                  />
                </label>

                <label className="form-field full-width">
                  <span>Features</span>
                  <textarea
                    name="features"
                    rows="4"
                    value={editor.form.features}
                    onChange={(event) => handleProductEditorChange(rootSlug, event)}
                    placeholder={"Use one feature per line\nHeavy-duty frame\nEasy maintenance"}
                  />
                  <small className="admin-field-note">Use one feature per line.</small>
                </label>

                <label className="form-field full-width">
                  <span>Applications</span>
                  <textarea
                    name="applications"
                    rows="4"
                    value={editor.form.applications}
                    onChange={(event) => handleProductEditorChange(rootSlug, event)}
                    placeholder={"Use one application per line\nInfrastructure projects\nCommercial sites"}
                  />
                  <small className="admin-field-note">Use one application per line.</small>
                </label>

                <label className="form-field full-width">
                  <span>Specifications</span>
                  <textarea
                    name="specifications"
                    rows="5"
                    value={editor.form.specifications}
                    onChange={(event) => handleProductEditorChange(rootSlug, event)}
                    placeholder={"Use one specification per line\nCapacity: 42 mm\nMotor: 5 HP"}
                  />
                  <small className="admin-field-note">
                    Use one specification per line in the format Label: Value.
                  </small>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={refreshingSection === loadingKey}
                >
                  {refreshingSection === loadingKey
                    ? "Saving..."
                    : isEditMode
                      ? "Update Product"
                      : "Add Product"}
                </button>
                {isEditMode ? (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => resetProductEditor(rootSlug)}
                  >
                    Cancel Edit
                  </button>
                ) : null}
                {isOwner && isEditMode ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => handleDeleteProduct(rootSlug)}
                    disabled={refreshingSection === deletingKey}
                  >
                    {refreshingSection === deletingKey ? "Deleting..." : "Delete Product"}
                  </button>
                ) : null}
              </div>
            </form>
          </article>
        </div>
      </div>
    );
  };

  const renderSparePartsManager = () => {
    const isEditMode = sparePartEditor.mode === "edit" && sparePartEditor.selectedId;
    const loadingKey = "spare-parts-form";
    const deletingKey = sparePartEditor.selectedId
      ? `delete-spare-part-${sparePartEditor.selectedId}`
      : "delete-spare-part";

    return (
      <div className="admin-content-stack">
        <div className="admin-content-head">
          <p className="section-eyebrow">Spare Parts</p>
          <h1>Build the spare parts database</h1>
          <p>
            Add, update, and delete spare parts here for the internal database only.
            These entries stay inside the admin dashboard for now and will not appear on
            the frontend until phase two.
          </p>
          {!sparePartsRouteAvailable ? (
            <p className="status-message error">
              Restart the backend once so the new spare parts routes become available.
              The dashboard is ready, but the running server has not picked up
              `/api/admin/spare-parts` yet.
            </p>
          ) : null}
        </div>

        <div className="admin-list-layout">
          <article className="admin-section-card admin-list-panel">
            <div className="admin-section-head compact">
              <div>
                <p className="section-eyebrow">Private Inventory</p>
                <h2>{spareParts.length} spare parts</h2>
              </div>

              <button
                type="button"
                className="btn btn-outline btn-small"
                onClick={resetSparePartEditor}
              >
                Add New
              </button>
            </div>

            {spareParts.length ? (
              <div className="admin-list">
                {spareParts.map((sparePart) => (
                  <button
                    key={sparePart.id}
                    type="button"
                    className={`admin-list-item ${
                      String(sparePart.id) === String(sparePartEditor.selectedId)
                        ? "is-active"
                        : ""
                    }`}
                    onClick={() => selectSparePartForEdit(sparePart)}
                  >
                    <div className="admin-list-item-top">
                      <strong>{sparePart.name}</strong>
                      <span className="admin-role-pill">Private DB</span>
                    </div>
                    <p>{sparePart.shortDescription}</p>
                    <div className="admin-list-item-meta">
                      <span>{sparePart.slug}</span>
                      <span>{formatDate(sparePart.updatedAt || sparePart.createdAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state admin-empty">
                No spare parts have been added to the private inventory yet.
              </div>
            )}
          </article>

          <article className="admin-section-card admin-detail-panel">
            <div className="admin-section-head compact">
              <div>
                <p className="section-eyebrow">
                  {isEditMode ? "Edit Spare Part" : "Add Spare Part"}
                </p>
                <h2>
                  {isEditMode
                    ? "Update selected spare part"
                    : "Create a spare part record"}
                </h2>
              </div>
            </div>

            <form
              className="form-stack"
              onSubmit={(event) => {
                event.preventDefault();
                submitSparePartEditor();
              }}
            >
              <div className="form-grid">
                <label className="form-field">
                  <span>Spare Part Name</span>
                  <input
                    name="name"
                    value={sparePartEditor.form.name}
                    onChange={handleSparePartEditorChange}
                    placeholder="Bearing Kit"
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Custom Slug</span>
                  <input
                    name="slug"
                    value={sparePartEditor.form.slug}
                    onChange={handleSparePartEditorChange}
                    placeholder="Optional"
                  />
                </label>

                <label className="form-field full-width">
                  <span>Spare Part Image</span>
                  <input
                    key={sparePartImageInput.inputKey}
                    type="file"
                    accept=".gif,.jpeg,.jpg,.png,.webp,image/gif,image/jpeg,image/png,image/webp"
                    onChange={handleSparePartImageFileChange}
                    required={!isEditMode}
                  />
                  <small className="admin-field-note">
                    {isEditMode
                      ? `Choose a new image only if you want to replace the current one. Maximum ${MAX_IMAGE_UPLOAD_LABEL}.`
                      : `Upload the spare part image from this device. Maximum ${MAX_IMAGE_UPLOAD_LABEL}.`}
                  </small>
                  {sparePartImageInput.file ? (
                    <div className="admin-file-list">
                      <span>{sparePartImageInput.file.name}</span>
                    </div>
                  ) : null}
                  {isEditMode ? (
                    <div className="admin-detail-item">
                      <small>Current Image</small>
                      <strong>{sparePartEditor.form.image || "No image available"}</strong>
                    </div>
                  ) : null}
                </label>

                <label className="form-field full-width">
                  <span>Belongs To Models</span>
                  <select
                    name="relatedProductIds"
                    multiple
                    size={Math.min(10, Math.max(4, websiteProductOptions.length || 4))}
                    value={sparePartEditor.form.relatedProductIds}
                    onChange={handleSparePartRelatedProductsChange}
                  >
                    {websiteProductOptions.map((product) => (
                      <option key={product.id} value={String(product.id)}>
                        {`${product.rootName} / ${product.categoryName} / ${product.name}`}
                      </option>
                    ))}
                  </select>
                  <small className="admin-field-note">
                    Select one or more website products that this spare part belongs to.
                    Any new product added later will automatically appear here after refresh.
                  </small>
                </label>

                <label className="form-field full-width">
                  <span>Short Description</span>
                  <textarea
                    name="shortDescription"
                    rows="3"
                    value={sparePartEditor.form.shortDescription}
                    onChange={handleSparePartEditorChange}
                    required
                  />
                </label>

                <label className="form-field full-width">
                  <span>Full Description</span>
                  <textarea
                    name="fullDescription"
                    rows="5"
                    value={sparePartEditor.form.fullDescription}
                    onChange={handleSparePartEditorChange}
                    required
                  />
                </label>

                <label className="form-field full-width">
                  <span>Features</span>
                  <textarea
                    name="features"
                    rows="4"
                    value={sparePartEditor.form.features}
                    onChange={handleSparePartEditorChange}
                    placeholder={"Use one feature per line\nHeavy-duty build\nSite-ready supply"}
                  />
                  <small className="admin-field-note">Use one feature per line.</small>
                </label>

                <label className="form-field full-width">
                  <span>Applications</span>
                  <textarea
                    name="applications"
                    rows="4"
                    value={sparePartEditor.form.applications}
                    onChange={handleSparePartEditorChange}
                    placeholder={"Use one application per line\nTower hoist service\nRoutine maintenance"}
                  />
                  <small className="admin-field-note">Use one application per line.</small>
                </label>

                <label className="form-field full-width">
                  <span>Specifications</span>
                  <textarea
                    name="specifications"
                    rows="5"
                    value={sparePartEditor.form.specifications}
                    onChange={handleSparePartEditorChange}
                    placeholder={"Use one specification per line\nMaterial: Hardened steel\nFitment: SPM 200"}
                  />
                  <small className="admin-field-note">
                    Use one specification per line in the format Label: Value.
                  </small>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    !sparePartsRouteAvailable || refreshingSection === loadingKey
                  }
                >
                  {refreshingSection === loadingKey
                    ? "Saving..."
                    : isEditMode
                      ? "Update Spare Part"
                      : "Add Spare Part"}
                </button>
                {isEditMode ? (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={resetSparePartEditor}
                  >
                    Cancel Edit
                  </button>
                ) : null}
                {isEditMode ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => handleDeleteSparePart()}
                    disabled={
                      !sparePartsRouteAvailable ||
                      refreshingSection === deletingKey
                    }
                  >
                    {refreshingSection === deletingKey
                      ? "Deleting..."
                      : "Delete Spare Part"}
                  </button>
                ) : null}
              </div>
            </form>
          </article>
        </div>
      </div>
    );
  };

  if (!isReady) {
    return (
      <section className="section page-hero-section">
        <div className="container empty-state">Checking access...</div>
      </section>
    );
  }

  if (!STAFF_ROLES.includes(user?.role)) {
    return (
      <section className="section page-hero-section">
        <div className="container auth-shell">
          <div className="auth-panel">
            <p className="section-eyebrow">Staff</p>
            <h1>Only Sparkline owner or admin accounts can open this area</h1>
            <p>Sign in with the owner or admin credentials to continue.</p>
            <Link className="btn btn-primary" to="/auth">
              Go to Login
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (isOwnerRoute && !isOwner) {
    return (
      <section className="section page-hero-section">
        <div className="container auth-shell">
          <div className="auth-panel">
            <p className="section-eyebrow">Owner</p>
            <h1>This page is only available for the owner account</h1>
            <p>Admin accounts can continue using the admin dashboard.</p>
            <Link className="btn btn-primary" to="/admin">
              Open Admin Dashboard
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const selectedInquiryDraft = selectedInquiry
    ? inquiryDrafts[getInquiryKey(selectedInquiry)] || {
        status: selectedInquiry.status,
        adminFeedback: selectedInquiry.adminFeedback || ""
      }
    : null;

  const totalInquiryCount =
    (overview?.quoteCount || 0) + (overview?.brochureLeadCount || 0);

  const sectionBadgeLookup = {
    inquiries: inquiryCounts.all,
    users: users.length,
    tasks: tasks.length,
    overview: overview?.activeInquiryCount || 0,
    categories: catalog.categories.length,
    gallery: galleryItems.length,
    products: getProductsByRoot(catalog.products, "machinery").length,
    spareparts: spareParts.length,
    catalog: catalog.products.length,
    "admin-accounts": staffUsers.length,
    audits: audits.length
  };

  return (
    <section className="section page-hero-section admin-dashboard-section">
      <div className="container admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-head">
            <p className="section-eyebrow">
              {isOwner ? "Owner Controls" : "Sparkline Controls"}
            </p>
            <h2>{isOwner ? "Owner Dashboard" : "Admin Dashboard"}</h2>
            <p>
              Select a section from the left side. Each panel is now separated so you can work on one task at a time.
            </p>
          </div>

          <div className="admin-sidebar-nav">
            {availableSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`admin-sidebar-button ${
                  activeSection === section.id ? "is-active" : ""
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <div>
                  <strong>{section.label}</strong>
                  <span>{section.description}</span>
                </div>
                <small>{sectionBadgeLookup[section.id] || 0}</small>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-outline-light admin-sidebar-refresh"
            onClick={() => refreshDashboard("dashboard")}
            disabled={refreshingSection === "dashboard"}
          >
            {refreshingSection === "dashboard" ? "Refreshing..." : "Refresh Data"}
          </button>
        </aside>

        <div className="admin-content">
          {error ? <p className="status-message error">{error}</p> : null}
          {notice ? <p className="status-message success">{notice}</p> : null}

          {isLoading ? (
            <div className="empty-state admin-loading-state">Loading dashboard...</div>
          ) : null}

          {!isLoading && activeSection === "overview" ? (
            <div className="admin-content-stack">
              <div className="admin-content-head">
                <p className="section-eyebrow">Overview</p>
                <h1>{isOwner ? "Owner summary" : "Admin summary"}</h1>
                <p>Quick counts for users, inquiries, staff accounts, products, and open tasks.</p>
              </div>

              <div className="admin-metrics-grid">
                <article className="admin-metric-card">
                  <span>Users</span>
                  <strong>{overview?.userCount ?? 0}</strong>
                </article>
                <article className="admin-metric-card">
                  <span>Inquiries</span>
                  <strong>{totalInquiryCount}</strong>
                </article>
                <article className="admin-metric-card accent">
                  <span>Needs Follow-Up</span>
                  <strong>{overview?.activeInquiryCount ?? 0}</strong>
                </article>
                <article className="admin-metric-card">
                  <span>Admins</span>
                  <strong>{overview?.adminCount ?? 0}</strong>
                </article>
                <article className="admin-metric-card">
                  <span>Open Tasks</span>
                  <strong>{overview?.openTaskCount ?? 0}</strong>
                </article>
              </div>

              <div className="admin-overview-grid">
                <article className="admin-section-card">
                  <div className="admin-section-head compact">
                    <div>
                      <p className="section-eyebrow">Recent Inquiries</p>
                      <h2>Latest customer requests</h2>
                    </div>
                  </div>

                  <div className="admin-mini-list">
                    {inquiries.slice(0, 5).map((inquiry) => (
                      <button
                        key={getInquiryKey(inquiry)}
                        type="button"
                        className="admin-mini-list-item"
                        onClick={() => {
                          setInquiryFilter("all");
                          setSelectedInquiryKey(getInquiryKey(inquiry));
                          setActiveSection("inquiries");
                        }}
                      >
                        <strong>{inquiry.fullName}</strong>
                        <span>{inquiry.productName || inquiry.requestedItem || "General inquiry"}</span>
                      </button>
                    ))}
                  </div>
                </article>

                <article className="admin-section-card">
                  <div className="admin-section-head compact">
                    <div>
                      <p className="section-eyebrow">Tasks</p>
                      <h2>Current assignments</h2>
                    </div>
                  </div>

                  <div className="admin-mini-list">
                    {tasks.slice(0, 5).map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        className="admin-mini-list-item"
                        onClick={() => setActiveSection("tasks")}
                      >
                        <strong>{task.title}</strong>
                        <span>
                          {task.appliesToAllAdmins
                            ? "Assigned to all admins"
                            : `Assigned to ${task.assignedToName || "admin"}`}
                        </span>
                      </button>
                    ))}

                    {!tasks.length ? (
                      <div className="empty-state admin-empty">No tasks available.</div>
                    ) : null}
                  </div>
                </article>
              </div>
            </div>
          ) : null}

          {!isLoading && activeSection === "inquiries" ? (
            <div className="admin-content-stack">
              <div className="admin-content-head">
                <p className="section-eyebrow">Inquiries</p>
                <h1>Inquiry list and details</h1>
                <p>
                  Filter inquiries by status, select one customer from the list, and update only that inquiry record.
                </p>
              </div>

              <div className="admin-filter-row">
                {INQUIRY_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={`admin-filter-button ${
                      inquiryFilter === filter.value ? "is-active" : ""
                    }`}
                    onClick={() => setInquiryFilter(filter.value)}
                  >
                    {filter.label} <span>{inquiryCounts[filter.value] || 0}</span>
                  </button>
                ))}
              </div>

              <div className="admin-list-layout">
                <article className="admin-section-card admin-list-panel">
                  <div className="admin-section-head compact">
                    <div>
                      <p className="section-eyebrow">Inquiry List</p>
                      <h2>{filteredInquiries.length} records</h2>
                    </div>
                  </div>

                  {filteredInquiries.length ? (
                    <div className="admin-list">
                      {filteredInquiries.map((inquiry) => (
                        <button
                          key={getInquiryKey(inquiry)}
                          type="button"
                          className={`admin-list-item ${
                            selectedInquiryKey === getInquiryKey(inquiry)
                              ? "is-active"
                              : ""
                          }`}
                          onClick={() => setSelectedInquiryKey(getInquiryKey(inquiry))}
                        >
                          <div className="admin-list-item-top">
                            <strong>{inquiry.fullName}</strong>
                            <span className={`admin-status-pill ${inquiry.status}`}>
                              {formatStatusLabel(inquiry.status)}
                            </span>
                          </div>
                          <p>{inquiry.productName || inquiry.requestedItem || "General inquiry"}</p>
                          <div className="admin-list-item-meta">
                            <span>{formatInquiryTypeLabel(inquiry.inquiryType)}</span>
                            <span>{formatDate(inquiry.createdAt)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state admin-empty">
                      No inquiries match the selected status.
                    </div>
                  )}
                </article>

                <article className="admin-section-card admin-detail-panel">
                  {selectedInquiry && selectedInquiryDraft ? (
                    <>
                      <div className="admin-section-head compact">
                        <div>
                          <div className="admin-badge-row">
                            <span className={`admin-source-pill ${selectedInquiry.inquiryType}`}>
                              {formatInquiryTypeLabel(selectedInquiry.inquiryType)}
                            </span>
                            <span className={`admin-status-pill ${selectedInquiryDraft.status}`}>
                              {formatStatusLabel(selectedInquiryDraft.status)}
                            </span>
                          </div>
                          <h2>{selectedInquiry.fullName}</h2>
                          <p>
                            {selectedInquiry.productName ||
                              selectedInquiry.requestedItem ||
                              "General inquiry"}
                          </p>
                        </div>
                      </div>

                      <div className="admin-detail-grid">
                        <div className="admin-detail-item">
                          <small>Email</small>
                          <strong>{selectedInquiry.email}</strong>
                        </div>
                        <div className="admin-detail-item">
                          <small>Phone</small>
                          <strong>{selectedInquiry.phone || "Not provided"}</strong>
                        </div>
                        <div className="admin-detail-item">
                          <small>Company</small>
                          <strong>{selectedInquiry.companyName || "Not provided"}</strong>
                        </div>
                        <div className="admin-detail-item">
                          <small>Designation</small>
                          <strong>{selectedInquiry.designation || "Not provided"}</strong>
                        </div>
                        <div className="admin-detail-item">
                          <small>Received</small>
                          <strong>{formatDateTime(selectedInquiry.createdAt)}</strong>
                        </div>
                        <div className="admin-detail-item">
                          <small>Contacted</small>
                          <strong>{formatDateTime(selectedInquiry.contactedAt)}</strong>
                        </div>
                      </div>

                      <div className="admin-message-panel">
                        <small>Customer message</small>
                        <p>
                          {selectedInquiry.message ||
                            "No extra message shared by the customer."}
                        </p>
                      </div>

                      <div className="admin-inquiry-actions">
                        <div className="form-field">
                          <span>Status</span>
                          <select
                            value={selectedInquiryDraft.status}
                            onChange={(event) =>
                              handleInquiryDraftChange(
                                getInquiryKey(selectedInquiry),
                                "status",
                                event.target.value
                              )
                            }
                          >
                            {INQUIRY_STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-field full-width">
                          <span>Admin Feedback</span>
                          <textarea
                            rows="6"
                            value={selectedInquiryDraft.adminFeedback}
                            placeholder="Add call notes, customer response, or reason if unresolved."
                            onChange={(event) =>
                              handleInquiryDraftChange(
                                getInquiryKey(selectedInquiry),
                                "adminFeedback",
                                event.target.value
                              )
                            }
                          />
                        </div>

                        <div className="form-actions">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleInquirySave}
                            disabled={
                              refreshingSection === getInquiryKey(selectedInquiry)
                            }
                          >
                            {refreshingSection === getInquiryKey(selectedInquiry)
                              ? "Saving..."
                              : "Save Inquiry"}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state admin-empty">
                      Select an inquiry from the list to view it here.
                    </div>
                  )}
                </article>
              </div>
            </div>
          ) : null}

          {!isLoading && activeSection === "users" ? (
            <div className="admin-content-stack">
              <div className="admin-content-head">
                <p className="section-eyebrow">Users</p>
                <h1>Registered users</h1>
                <p>All registered users are shown in a list. Select one to open the full user details.</p>
              </div>

              <div className="admin-list-layout">
                <article className="admin-section-card admin-list-panel">
                  <div className="admin-section-head compact">
                    <div>
                      <p className="section-eyebrow">User List</p>
                      <h2>{users.length} users</h2>
                    </div>
                  </div>

                  {users.length ? (
                    <div className="admin-list">
                      {users.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          className={`admin-list-item ${
                            String(entry.id) === String(selectedUserId) ? "is-active" : ""
                          }`}
                          onClick={() => setSelectedUserId(String(entry.id))}
                        >
                          <div className="admin-list-item-top">
                            <strong>{entry.fullName}</strong>
                            <span className={`admin-role-pill ${entry.role}`}>{entry.role}</span>
                          </div>
                          <p>{entry.email}</p>
                          <div className="admin-list-item-meta">
                            <span>{entry.companyName || "No company"}</span>
                            <span>{formatDate(entry.createdAt)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state admin-empty">No users found.</div>
                  )}
                </article>

                <article className="admin-section-card admin-detail-panel">
                  {selectedUser ? (
                    <>
                      <div className="admin-section-head compact">
                        <div>
                          <div className="admin-badge-row">
                            <span className={`admin-role-pill ${selectedUser.role}`}>
                              {selectedUser.role}
                            </span>
                          </div>
                          <h2>{selectedUser.fullName}</h2>
                          <p>{selectedUser.email}</p>
                        </div>
                      </div>

                      <div className="admin-user-grid">
                        <div className="admin-detail-item">
                          <small>Phone</small>
                          <strong>{selectedUser.phone || "Not provided"}</strong>
                        </div>
                        <div className="admin-detail-item">
                          <small>Company</small>
                          <strong>{selectedUser.companyName || "Not provided"}</strong>
                        </div>
                        <div className="admin-detail-item">
                          <small>Designation</small>
                          <strong>{selectedUser.designation || "Not provided"}</strong>
                        </div>
                        <div className="admin-detail-item">
                          <small>Joined</small>
                          <strong>{formatDateTime(selectedUser.createdAt)}</strong>
                        </div>
                        <div className="admin-detail-item">
                          <small>Total Inquiries</small>
                          <strong>{selectedUser.inquiryCount || 0}</strong>
                        </div>
                        <div className="admin-detail-item">
                          <small>Assigned Tasks</small>
                          <strong>{selectedUser.assignedTaskCount || 0}</strong>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="empty-state admin-empty">
                      Select a user from the list to open the details here.
                    </div>
                  )}
                </article>
              </div>
            </div>
          ) : null}

          {!isLoading && activeSection === "tasks" ? (
            <div className="admin-content-stack">
              <div className="admin-content-head">
                <p className="section-eyebrow">Tasks</p>
                <h1>{isOwner ? "Assign and track admin tasks" : "Assigned tasks"}</h1>
                <p>
                  {isOwner
                    ? "Assign tasks to one admin or to all admins. Admin users can see the tasks assigned to them from this section."
                    : "These are the tasks assigned specifically to you or sent to all admins."}
                </p>
              </div>

              {isOwner ? (
                <article className="admin-section-card">
                  <div className="admin-section-head compact">
                    <div>
                      <p className="section-eyebrow">Assign Task</p>
                      <h2>Send task to one admin or all admins</h2>
                    </div>
                  </div>

                  <form className="form-stack" onSubmit={handleTaskSubmit}>
                    <div className="form-grid">
                      <label className="form-field">
                        <span>Assign To</span>
                        <select
                          name="assignedTo"
                          value={taskForm.assignedTo}
                          onChange={handleTaskFormChange}
                        >
                          <option value="all">All Admins</option>
                          {adminUsers.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.fullName} ({entry.email})
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="form-field">
                        <span>Task Deadline</span>
                        <input
                          name="dueOn"
                          type="date"
                          value={taskForm.dueOn}
                          onChange={handleTaskFormChange}
                        />
                      </label>

                      <label className="form-field full-width">
                        <span>Task Description</span>
                        <textarea
                          name="description"
                          rows="5"
                          value={taskForm.description}
                          onChange={handleTaskFormChange}
                          placeholder="Enter the task that should be assigned."
                          required
                        />
                      </label>
                    </div>

                    <div className="form-actions">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={refreshingSection === "task-form"}
                      >
                        {refreshingSection === "task-form"
                          ? "Assigning..."
                          : "Assign Task"}
                      </button>
                    </div>
                  </form>
                </article>
              ) : null}

              <article className="admin-section-card">
                <div className="admin-section-head compact">
                  <div>
                    <p className="section-eyebrow">Task List</p>
                    <h2>{tasks.length} tasks</h2>
                  </div>
                </div>

                {tasks.length ? (
                  <div className="admin-mini-list">
                    {tasks.map((task) => (
                      <div className="admin-task-card" key={task.id}>
                        <div className="admin-list-item-top">
                          <strong>{task.title}</strong>
                          <span className={`admin-status-pill ${task.status}`}>
                            {formatTaskStatusLabel(task.status)}
                          </span>
                        </div>
                        <p>{task.description}</p>
                        <div className="admin-list-item-meta">
                          <span>
                            {task.appliesToAllAdmins
                              ? "All admins"
                              : task.assignedToName || "Assigned admin"}
                          </span>
                          <span>By {task.assignedByName}</span>
                          <span>
                            {task.dueOn
                              ? `Deadline ${formatDate(task.dueOn)}`
                              : "No deadline"}
                          </span>
                          <span>{formatDateTime(task.createdAt)}</span>
                          {task.completedAt ? (
                            <span>Completed {formatDateTime(task.completedAt)}</span>
                          ) : null}
                        </div>
                        {!isOwner && task.status !== "completed" ? (
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              className="btn btn-outline btn-small"
                              onClick={() => handleTaskStatusUpdate(task.id, "completed")}
                              disabled={refreshingSection === `task-status-${task.id}`}
                            >
                              {refreshingSection === `task-status-${task.id}`
                                ? "Updating..."
                                : "Mark Completed"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state admin-empty">No tasks available yet.</div>
                )}
              </article>
            </div>
          ) : null}

          {!isLoading && activeSection === "categories" ? (
            <div className="admin-content-stack">
              <div className="admin-content-head">
                <p className="section-eyebrow">Add Category</p>
                <h1>Create, edit, and manage live categories</h1>
                <p>
                  Add the category under the correct parent so it becomes visible in the frontend catalog, or open an existing category from the list and update it directly from here.
                </p>
              </div>

              <div className="admin-list-layout">
                <article className="admin-section-card admin-list-panel">
                  <div className="admin-section-head compact">
                    <div>
                      <p className="section-eyebrow">Existing Categories</p>
                      <h2>{editableCategories.length} editable categories</h2>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline btn-small"
                      onClick={resetCategoryEditor}
                    >
                      Add New
                    </button>
                  </div>

                  {editableCategories.length ? (
                    <div className="admin-list">
                      {editableCategories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          className={`admin-list-item ${
                            String(category.id) === String(categoryEditor.selectedId)
                              ? "is-active"
                              : ""
                          }`}
                          onClick={() => selectCategoryForEdit(category)}
                        >
                          <div className="admin-list-item-top">
                            <strong>{category.name}</strong>
                            <span className="admin-role-pill">{category.rootName}</span>
                          </div>
                          <p>{category.shortDescription}</p>
                          <div className="admin-list-item-meta">
                            <span>{formatCategoryOption(category)}</span>
                            <span>{category.productCount || 0} products</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state admin-empty">
                      No editable categories found yet.
                    </div>
                  )}
                </article>

                <article className="admin-section-card admin-detail-panel">
                  <div className="admin-section-head compact">
                    <div>
                      <p className="section-eyebrow">
                        {categoryEditor.mode === "edit" ? "Edit Category" : "New Category"}
                      </p>
                      <h2>
                        {categoryEditor.mode === "edit"
                          ? "Update selected category"
                          : "Create category in the live catalog"}
                      </h2>
                    </div>
                  </div>

                  <form className="form-stack" onSubmit={handleCategorySubmit}>
                    <div className="form-grid">
                      <label className="form-field">
                        <span>Parent Section</span>
                        <select
                          name="parentSlug"
                          value={categoryForm.parentSlug}
                          onChange={handleCategoryFormChange}
                          required
                        >
                          <option value="" disabled>
                            Select parent section
                          </option>
                          {rootCategories.map((category) => (
                            <option key={category.id} value={category.slug}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="form-field">
                        <span>Category Name</span>
                        <input
                          name="name"
                          value={categoryForm.name}
                          onChange={handleCategoryFormChange}
                          placeholder="Bar Cutting Machine (SCM)"
                          required
                        />
                      </label>

                      <label className="form-field">
                        <span>Custom Slug</span>
                        <input
                          name="slug"
                          value={categoryForm.slug}
                          onChange={handleCategoryFormChange}
                          placeholder="Optional"
                        />
                      </label>

                      <label className="form-field full-width">
                        <span>Category Images</span>
                        <input
                          key={categoryImageInputKey}
                          type="file"
                          accept=".gif,.jpeg,.jpg,.png,.webp,image/gif,image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handleCategoryImageFilesChange}
                          required={categoryEditor.mode !== "edit"}
                        />
                        <small className="admin-field-note">
                          {categoryEditor.mode === "edit"
                            ? `Choose new images only if you want to replace the current category gallery. Maximum ${MAX_IMAGE_UPLOAD_LABEL} per image.`
                            : `Upload one or more images from this device. The first image becomes the main category thumbnail on the frontend. Maximum ${MAX_IMAGE_UPLOAD_LABEL} per image.`}
                        </small>
                        {categoryImageFiles.length ? (
                          <div className="admin-file-list">
                            {categoryImageFiles.map((file) => (
                              <span key={`${file.name}-${file.size}`}>{file.name}</span>
                            ))}
                          </div>
                        ) : null}
                      </label>

                      {categoryEditor.mode === "edit" && selectedCategoryRecord ? (
                        <div className="admin-detail-grid full-width">
                          <div className="admin-detail-item">
                            <small>Current Images</small>
                            <strong>
                              {selectedCategoryRecord.imageGallery?.length
                                ? `${selectedCategoryRecord.imageGallery.length} image(s) uploaded`
                                : "No images available"}
                            </strong>
                          </div>
                          <div className="admin-detail-item">
                            <small>Current Brochure</small>
                            <strong>
                              {selectedCategoryRecord.brochureFileName ||
                                "No brochure uploaded yet"}
                            </strong>
                          </div>
                        </div>
                      ) : null}

                      <label className="form-field full-width">
                        <span>Short Description</span>
                        <textarea
                          name="shortDescription"
                          rows="3"
                          value={categoryForm.shortDescription}
                          onChange={handleCategoryFormChange}
                          required
                        />
                      </label>

                      <label className="form-field full-width">
                        <span>Full Description</span>
                        <textarea
                          name="fullDescription"
                          rows="5"
                          value={categoryForm.fullDescription}
                          onChange={handleCategoryFormChange}
                          required
                        />
                      </label>

                      <label className="form-field">
                        <span>Sort Order</span>
                        <input
                          name="sortOrder"
                          type="number"
                          min="1"
                          value={categoryForm.sortOrder}
                          onChange={handleCategoryFormChange}
                          placeholder="Optional"
                        />
                      </label>

                      <label className="form-field full-width">
                        <span>Brochure PDF</span>
                        <input
                          key={categoryBrochureInputKey}
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={(event) =>
                            handleCategoryBrochureFileChange(event, "create")
                          }
                        />
                        <small className="admin-field-note">
                          Optional. Upload a PDF brochure from this device to make the category available in `/brochures`.
                        </small>
                      </label>
                    </div>

                    <div className="form-actions">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={refreshingSection === "category-form"}
                      >
                        {refreshingSection === "category-form"
                          ? "Saving Category..."
                          : categoryEditor.mode === "edit"
                            ? "Update Category"
                            : "Add Category"}
                      </button>
                      {categoryEditor.mode === "edit" ? (
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={resetCategoryEditor}
                        >
                          Cancel Edit
                        </button>
                      ) : null}
                    </div>
                  </form>
                </article>
              </div>

              <article className="admin-section-card">
                <div className="admin-section-head compact">
                  <div>
                    <p className="section-eyebrow">Category Brochure</p>
                    <h2>Upload or replace brochure for an existing machinery category</h2>
                    <p>
                      Select the category, choose a PDF from the local device, and it will appear automatically in the brochure dropdown page.
                    </p>
                  </div>
                </div>

                <form className="form-stack" onSubmit={handleCategoryBrochureSubmit}>
                  <div className="form-grid">
                    <label className="form-field">
                      <span>Machine Category</span>
                      <select
                        value={selectedBrochureCategoryId}
                        onChange={(event) =>
                          setSelectedBrochureCategoryId(event.target.value)
                        }
                        required
                      >
                        <option value="" disabled>
                          Select category
                        </option>
                        {brochureManagedCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="form-field full-width">
                      <span>Brochure PDF</span>
                      <input
                        key={existingCategoryBrochureInputKey}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={(event) =>
                          handleCategoryBrochureFileChange(event, "existing")
                        }
                        required
                      />
                      <small className="admin-field-note">
                        Only PDF files are allowed.
                      </small>
                    </label>
                  </div>

                  {selectedBrochureCategory ? (
                    <div className="admin-detail-item">
                      <small>Current brochure</small>
                      <strong>
                        {selectedBrochureCategory.brochureFileName || "No brochure uploaded yet"}
                      </strong>
                    </div>
                  ) : null}

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={refreshingSection === "category-brochure-form"}
                    >
                      {refreshingSection === "category-brochure-form"
                        ? "Uploading Brochure..."
                        : "Upload Brochure"}
                    </button>
                  </div>
                </form>
              </article>
            </div>
          ) : null}

          {!isLoading && activeSection === "gallery" ? (
            <div className="admin-content-stack">
              <div className="admin-content-head">
                <p className="section-eyebrow">Gallery</p>
                <h1>Upload Sparkline gallery images and videos</h1>
                <p>
                  Add gallery media from the local device with a short description. The
                  upload becomes visible on the frontend Gallery page automatically.
                </p>
              </div>

              <div className="admin-list-layout">
                <article className="admin-section-card admin-list-panel">
                  <div className="admin-section-head compact">
                    <div>
                      <p className="section-eyebrow">Current Gallery</p>
                      <h2>{galleryItems.length} live items</h2>
                    </div>
                  </div>

                  {galleryItems.length ? (
                    <div className="admin-list admin-gallery-list">
                      {galleryItems.map((item) => (
                        <div className="admin-task-card admin-gallery-card" key={item.id}>
                          <div className="admin-gallery-preview">
                            {item.mediaType === "video" ? (
                              <video
                                controls
                                playsInline
                                preload="metadata"
                                src={item.mediaPath}
                              />
                            ) : (
                              <img
                                src={item.mediaPath}
                                alt={item.description || "Sparkline gallery"}
                              />
                            )}
                          </div>

                          <div className="admin-list-item-top">
                            <strong>
                              {item.mediaType === "video" ? "Gallery Video" : "Gallery Image"}
                            </strong>
                            <span className="admin-role-pill">
                              {formatFileSize(item.fileSizeBytes)}
                            </span>
                          </div>
                          <p>{item.description}</p>
                          <div className="admin-list-item-meta">
                            <span>{item.originalFileName}</span>
                            <span>By {item.createdByName}</span>
                            <span>{formatDateTime(item.createdAt)}</span>
                          </div>
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              className="btn btn-ghost btn-small"
                              onClick={() => handleDeleteGalleryItem(item)}
                              disabled={
                                refreshingSection === `delete-gallery-${item.id}`
                              }
                            >
                              {refreshingSection === `delete-gallery-${item.id}`
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state admin-empty">
                      No gallery items have been uploaded yet.
                    </div>
                  )}
                </article>

                <article className="admin-section-card admin-detail-panel">
                  <div className="admin-section-head compact">
                    <div>
                      <p className="section-eyebrow">Upload Media</p>
                      <h2>Add a new gallery item</h2>
                    </div>
                  </div>

                  <form className="form-stack" onSubmit={handleGallerySubmit}>
                    <div className="form-grid">
                      <label className="form-field">
                        <span>Media Type</span>
                        <select
                          name="mediaType"
                          value={galleryForm.mediaType}
                          onChange={handleGalleryFormChange}
                          required
                        >
                          <option value="image">Image</option>
                          <option value="video">Video</option>
                        </select>
                      </label>

                      <label className="form-field full-width">
                        <span>
                          {galleryForm.mediaType === "video" ? "Video File" : "Image File"}
                        </span>
                        <input
                          key={galleryMediaInputKey}
                          type="file"
                          accept={
                            galleryForm.mediaType === "video"
                              ? ".mp4,.mov,.webm,.ogv,.m4v,video/mp4,video/quicktime,video/webm,video/ogg,video/x-m4v"
                              : ".gif,.jpeg,.jpg,.png,.webp,image/gif,image/jpeg,image/png,image/webp"
                          }
                          onChange={handleGalleryMediaFileChange}
                          required
                        />
                        <small className="admin-field-note">
                          {galleryForm.mediaType === "video"
                            ? `Upload a local video up to ${MAX_GALLERY_VIDEO_UPLOAD_LABEL}.`
                            : `Upload a local image up to ${MAX_GALLERY_IMAGE_UPLOAD_LABEL}.`}
                        </small>
                        {galleryMediaFile ? (
                          <div className="admin-file-list">
                            <span>{galleryMediaFile.name}</span>
                          </div>
                        ) : null}
                      </label>

                      <label className="form-field full-width">
                        <span>Description</span>
                        <textarea
                          name="description"
                          rows="5"
                          value={galleryForm.description}
                          onChange={handleGalleryFormChange}
                          placeholder="Add the text that should appear below this gallery item."
                          required
                        />
                      </label>
                    </div>

                    <div className="form-actions">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={refreshingSection === "gallery-form"}
                      >
                        {refreshingSection === "gallery-form"
                          ? "Uploading..."
                          : "Add To Gallery"}
                      </button>
                    </div>
                  </form>
                </article>
              </div>
            </div>
          ) : null}

          {!isLoading && activeSection === "products"
            ? renderProductManager(
                "machinery",
                "Products",
                "Use this section to add or edit the machinery products already shown on the website."
              )
            : null}

          {!isLoading && activeSection === "spareparts"
            ? renderSparePartsManager()
            : null}

          {!isLoading && activeSection === "catalog" ? (
            <div className="admin-content-stack">
              <div className="admin-content-head">
                <p className="section-eyebrow">Catalog</p>
                <h1>Live categories and products</h1>
                <p>
                  Review the full structure currently visible on the frontend. Owner accounts can delete incorrect categories or products from here.
                </p>
              </div>

              <div className="admin-catalog-grid">
                <article className="admin-section-card">
                  <div className="admin-section-head compact">
                    <div>
                      <p className="section-eyebrow">Categories</p>
                      <h2>Current category structure</h2>
                    </div>
                  </div>

                  <div className="admin-catalog-groups">
                    {categoryGroups.map((group) => (
                      <div className="admin-catalog-group" key={group.id}>
                        <div className="admin-catalog-group-head">
                          <h3>{group.name}</h3>
                          <span>{group.categories.length} categories</span>
                        </div>

                        {group.categories.length ? (
                          <div className="admin-category-list">
                            {group.categories.map((category) => (
                              <div className="admin-category-row" key={category.id}>
                                <div>
                                  <strong>{category.name}</strong>
                                  <p>{category.shortDescription}</p>
                                </div>
                                <div className="admin-row-actions">
                                  <span>{category.products.length} products</span>
                                  {isOwner ? (
                                    <button
                                      type="button"
                                      className="btn btn-ghost btn-small"
                                      onClick={() =>
                                        handleDeleteCategory(category.id, category.name)
                                      }
                                      disabled={
                                        refreshingSection ===
                                        `delete-category-${category.id}`
                                      }
                                    >
                                      Delete
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="admin-empty-copy">
                            No child categories have been added here yet.
                          </p>
                        )}

                        {group.directProducts.length ? (
                          <div className="admin-direct-product-strip">
                            {group.directProducts.map((product) => (
                              <span className="chip" key={product.id}>
                                {product.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>

                <article className="admin-section-card">
                  <div className="admin-section-head compact">
                    <div>
                      <p className="section-eyebrow">Products</p>
                      <h2>All products</h2>
                    </div>
                  </div>

                  {catalog.products.length ? (
                    <div className="admin-product-list">
                      {catalog.products.map((product) => (
                        <div className="admin-product-row" key={product.id}>
                          <div>
                            <strong>{product.name}</strong>
                            <p>{product.categoryName}</p>
                          </div>
                          <div className="admin-row-actions">
                            <span>{formatDate(product.updatedAt || product.createdAt)}</span>
                            {isOwner ? (
                              <>
                                {product.rootSlug !== "spareparts" ? (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-small"
                                    onClick={() => {
                                      setActiveSection("products");
                                      selectProductForEdit(product.rootSlug, product);
                                    }}
                                  >
                                    Open
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-small"
                                  onClick={() => handleDeleteProductById(product)}
                                  disabled={
                                    refreshingSection === `delete-product-${product.id}`
                                  }
                                >
                                  {refreshingSection === `delete-product-${product.id}`
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state admin-empty">No products found.</div>
                  )}
                </article>
              </div>
            </div>
          ) : null}

          {!isLoading && isOwner && activeSection === "admin-accounts" ? (
            <div className="admin-content-stack">
              <div className="admin-content-head">
                <p className="section-eyebrow">Staff Accounts</p>
                <h1>Create staff accounts and assign access</h1>
                <p>
                  The owner can create admin or owner accounts here and manage who gets dashboard access inside Sparkline.
                </p>
              </div>

              <div className="admin-overview-grid">
                <article className="admin-section-card">
                  <div className="admin-section-head compact">
                    <div>
                      <p className="section-eyebrow">Create Staff</p>
                      <h2>New staff account</h2>
                    </div>
                  </div>

                  <form className="form-stack" onSubmit={handleAdminAccountSubmit}>
                    <div className="form-grid">
                      <label className="form-field">
                        <span>Full Name</span>
                        <input
                          name="fullName"
                          value={adminAccountForm.fullName}
                          onChange={handleAdminAccountChange}
                          required
                        />
                      </label>

                      <label className="form-field">
                        <span>Email</span>
                        <input
                          name="email"
                          type="email"
                          value={adminAccountForm.email}
                          onChange={handleAdminAccountChange}
                          pattern={EMAIL_PATTERN}
                          required
                        />
                      </label>

                      <label className="form-field">
                        <span>Access Level</span>
                        <select
                          name="role"
                          value={adminAccountForm.role}
                          onChange={handleAdminAccountChange}
                          required
                        >
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      </label>

                      <label className="form-field">
                        <span>Password</span>
                        <input
                          name="password"
                          type="text"
                          value={adminAccountForm.password}
                          onChange={handleAdminAccountChange}
                          required
                        />
                      </label>

                      <label className="form-field">
                        <span>Phone</span>
                        <input
                          name="phone"
                          type="tel"
                          value={adminAccountForm.phone}
                          onChange={handleAdminAccountChange}
                          inputMode="numeric"
                          maxLength={PHONE_DIGIT_LIMIT}
                          pattern={PHONE_PATTERN}
                          title={`Enter a ${PHONE_DIGIT_LIMIT}-digit phone number`}
                          required
                        />
                      </label>

                      <label className="form-field">
                        <span>Company</span>
                        <input
                          name="companyName"
                          value={adminAccountForm.companyName}
                          onChange={handleAdminAccountChange}
                          required
                        />
                      </label>

                      <label className="form-field">
                        <span>Designation</span>
                        <input
                          name="designation"
                          value={adminAccountForm.designation}
                          onChange={handleAdminAccountChange}
                          required
                        />
                      </label>
                    </div>

                    <div className="form-actions">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={refreshingSection === "admin-account-form"}
                      >
                        {refreshingSection === "admin-account-form"
                          ? "Creating..."
                          : "Create Staff Account"}
                      </button>
                    </div>
                  </form>
                </article>

                <article className="admin-section-card">
                  <div className="admin-section-head compact">
                    <div>
                      <p className="section-eyebrow">Current Staff</p>
                      <h2>{staffUsers.length} staff accounts</h2>
                    </div>
                  </div>

                  <div className="admin-mini-list">
                    {staffUsers.map((entry) => (
                      <div className="admin-task-card" key={entry.id}>
                        <div className="admin-list-item-top">
                          <strong>{entry.fullName}</strong>
                          <span className={`admin-role-pill ${entry.role}`}>{entry.role}</span>
                        </div>
                        <p>{entry.email}</p>
                        <div className="admin-list-item-meta">
                          <span>{entry.designation || "Staff"}</span>
                          <span>{formatDate(entry.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </div>
          ) : null}

          {!isLoading && isOwner && activeSection === "audits" ? (
            <div className="admin-content-stack">
              <div className="admin-content-head">
                <p className="section-eyebrow">Audits</p>
                <h1>All admin and owner updates</h1>
                <p>
                  Review every important change made from the dashboard, such as product creation, inquiry resolution, admin account creation, or deletions.
                </p>
              </div>

              <article className="admin-section-card">
                <div className="admin-section-head compact">
                  <div>
                    <p className="section-eyebrow">Audit Trail</p>
                    <h2>{audits.length} recorded actions</h2>
                  </div>
                </div>

                {audits.length ? (
                  <div className="admin-mini-list">
                    {audits.map((audit) => (
                      <div className="admin-task-card" key={audit.id}>
                        <div className="admin-list-item-top">
                          <strong>{audit.actorName}</strong>
                          <span className={`admin-role-pill ${audit.actorRole}`}>
                            {audit.actorRole}
                          </span>
                        </div>
                        <p>{audit.description}</p>
                        <div className="admin-list-item-meta">
                          <span>{audit.actionType}</span>
                          <span>{audit.entityType}</span>
                          <span>{formatDateTime(audit.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state admin-empty">No audits available yet.</div>
                )}
              </article>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default AdminPage;
