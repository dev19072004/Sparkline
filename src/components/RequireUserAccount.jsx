import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { buildAuthRedirectPath } from "../lib/authRedirect";

function RequireUserAccount({ redirectPath, title, message, children }) {
  const { isReady, user } = useAuth();

  if (!isReady) {
    return <div className="empty-state">Checking your account...</div>;
  }

  if (!user) {
    return (
      <div className="account-required-card">
        <p className="section-eyebrow">Login Required</p>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="form-actions">
          <Link className="btn btn-primary" to={buildAuthRedirectPath(redirectPath)}>
            Login / Signup to Continue
          </Link>
        </div>
      </div>
    );
  }

  return children;
}

export default RequireUserAccount;
