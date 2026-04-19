import { Link } from "react-router-dom";

function ResetPasswordPage() {
  return (
    <section className="section page-hero-section">
      <div className="container auth-shell">
        <div className="auth-panel">
          <div className="auth-intro">
            <p className="section-eyebrow">Reset Password</p>
            <h1>Use the OTP flow from the auth page</h1>
            <p>
              Password reset now happens through the Forgot Password option on the login/signup page. Request the OTP there, verify it, and then set the new password.
            </p>
          </div>

          <Link className="btn btn-primary" to="/auth">
            Go to Auth Page
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ResetPasswordPage;
