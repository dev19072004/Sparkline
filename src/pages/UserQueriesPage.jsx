import { useEffect, useMemo, useState } from "react";

import RequireUserAccount from "../components/RequireUserAccount";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

const formatInquiryTypeLabel = (value) => {
  if (value === "spare_parts") {
    return "Spare Parts";
  }

  if (value === "brochure") {
    return "Brochure";
  }

  return "Quote";
};

const getUserFacingStatus = (inquiryType, value) => {
  if (normalizeInquiryType(inquiryType) === "brochure") {
    return "Completed";
  }

  return String(value || "").toLowerCase() === "resolved" ? "Completed" : "Pending";
};

const normalizeInquiryType = (value) => {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (normalizedValue === "spare_parts") {
    return "spare_parts";
  }

  if (normalizedValue === "brochure") {
    return "brochure";
  }

  return "quote";
};

const normalizeMessage = (inquiryType, value) => {
  if (!value) {
    return "";
  }

  const message = String(value).trim();

  if (
    inquiryType === "spare_parts" &&
    message.toLowerCase().startsWith("spare parts inquiry:")
  ) {
    return message.slice("Spare Parts Inquiry:".length).trim();
  }

  if (inquiryType === "brochure" && message.toLowerCase().startsWith("brochure lead for")) {
    return "";
  }

  return message;
};

const normalizeInquiry = (query) => {
  const inquiryType = normalizeInquiryType(query.inquiryType);

  return {
    id: query.id,
    inquiryType,
    requestedItem: String(query.requestedItem || query.productName || "").trim(),
    quantity: query.quantity,
    message: normalizeMessage(inquiryType, query.message),
    status: query.status,
    createdAt: query.createdAt,
    updatedAt: query.updatedAt,
    email: String(query.email || "").trim()
  };
};

const isMissingAccountQueriesRoute = (message) =>
  /Cannot GET \/api\/account\/queries/i.test(String(message || ""));

const getFriendlyErrorMessage = (message) => {
  if (isMissingAccountQueriesRoute(message)) {
    return "Your query history route is not available on the current backend session yet. Restart the backend once to enable the latest query API.";
  }

  return String(message || "Unable to load your queries");
};

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium"
  }).format(new Date(value));
};

function UserQueriesPage() {
  const { isReady, user } = useAuth();
  const [queries, setQueries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isReady || !user) {
      return;
    }

    let isCancelled = false;

    const loadQueries = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await apiFetch("/account/queries");

        if (!isCancelled) {
          setQueries((response.inquiries || []).map(normalizeInquiry));
        }
      } catch (loadError) {
        const canUseAdminFallback = ["admin", "owner"].includes(
          String(user?.role || "").trim().toLowerCase()
        );

        if (canUseAdminFallback && isMissingAccountQueriesRoute(loadError.message)) {
          try {
            const fallbackResponse = await apiFetch("/admin/inquiries");
            const normalizedEmail = String(user?.email || "").trim().toLowerCase();
            const matchingQueries = (fallbackResponse.inquiries || [])
              .filter(
                (query) =>
                  String(query.email || "").trim().toLowerCase() === normalizedEmail
              )
              .map(normalizeInquiry);

            if (!isCancelled) {
              setQueries(matchingQueries);
            }

            return;
          } catch (fallbackError) {
            if (!isCancelled) {
              setError(getFriendlyErrorMessage(fallbackError.message));
            }

            return;
          }
        }

        if (!isCancelled) {
          setError(getFriendlyErrorMessage(loadError.message));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadQueries();

    return () => {
      isCancelled = true;
    };
  }, [isReady, user]);

  const counts = useMemo(
    () =>
      queries.reduce(
        (result, query) => {
          const statusKey = getUserFacingStatus(
            query.inquiryType,
            query.status
          ).toLowerCase();

          return {
            ...result,
            total: result.total + 1,
            [statusKey]: result[statusKey] + 1
          };
        },
        {
          total: 0,
          pending: 0,
          completed: 0
        }
      ),
    [queries]
  );

  return (
    <section className="section page-hero-section">
      <div className="container">
        <div className="page-hero narrow">
          <p className="section-eyebrow">Queries</p>
          <h1>Track the inquiries submitted from your account</h1>
          <p>
            Every quote request, brochure request, and spare parts inquiry linked to your
            account appears here. Brochure requests are shown as completed immediately,
            while machinery and spare parts inquiries stay pending until Sparkline marks
            them completed.
          </p>
        </div>

        <RequireUserAccount
          redirectPath="/queries"
          title="Login or signup to view your queries"
          message="Your personal query history is shown only after you sign in with your Sparkline account."
        >
          <div className="user-queries-stack">
            <div className="card-grid three-up">
              <article className="reason-card">
                <h3>{counts.total}</h3>
                <p>Total queries</p>
              </article>
              <article className="reason-card">
                <h3>{counts.pending}</h3>
                <p>Pending</p>
              </article>
              <article className="reason-card">
                <h3>{counts.completed}</h3>
                <p>Completed</p>
              </article>
            </div>

            {error ? <p className="status-message error">{error}</p> : null}

            {isLoading ? (
              <div className="empty-state">Loading your queries...</div>
            ) : queries.length ? (
              <div className="user-query-list">
                {queries.map((query) => {
                  const userFacingStatus = getUserFacingStatus(
                    query.inquiryType,
                    query.status
                  );

                  return (
                    <article className="user-query-card" key={`${query.inquiryType}-${query.id}`}>
                      <div className="user-query-card-top">
                        <div>
                          <p className="section-eyebrow">
                            {formatInquiryTypeLabel(query.inquiryType)}
                          </p>
                          <h2>{query.requestedItem || "General inquiry"}</h2>
                        </div>
                        <span
                          className={`query-status-pill ${
                            userFacingStatus === "Completed"
                              ? "is-completed"
                              : "is-pending"
                          }`}
                        >
                          {userFacingStatus}
                        </span>
                      </div>

                      <div className="user-query-meta">
                        <span>Submitted: {formatDate(query.createdAt)}</span>
                        {query.quantity ? <span>Quantity: {query.quantity}</span> : null}
                      </div>

                      {query.message ? <p>{query.message}</p> : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="account-required-card">
                <p className="section-eyebrow">No Queries Yet</p>
                <h2>Your account has not submitted any inquiries yet</h2>
                <p>
                  Once you submit a quote request, brochure request, or spare parts inquiry,
                  it will appear here automatically.
                </p>
              </div>
            )}
          </div>
        </RequireUserAccount>
      </div>
    </section>
  );
}

export default UserQueriesPage;
