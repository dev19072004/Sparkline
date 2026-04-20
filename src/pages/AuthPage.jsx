import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { resolveSafeRedirectPath } from "../lib/authRedirect";
import {
  EMAIL_PATTERN,
  PHONE_DIGIT_LIMIT,
  PHONE_PATTERN,
  isValidEmail,
  isValidPhone,
  normalizePhoneInput
} from "../lib/formValidation";

const FORGOT_PASSWORD_INITIAL_STATE = {
  email: "",
  otp: "",
  password: "",
  confirmPassword: ""
};

function AuthPage() {
  const [mode, setMode] = useState("login");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    designation: "",
    password: ""
  });
  const [forgotData, setForgotData] = useState(FORGOT_PASSWORD_INITIAL_STATE);
  const [forgotStep, setForgotStep] = useState("request");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    forgotPassword,
    isReady,
    login,
    resetPassword,
    signup,
    user,
    verifyResetOtp
  } = useAuth();
  const redirectPath = resolveSafeRedirectPath(searchParams.get("redirect") || "/");

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setStatus({ type: "", message: "" });

    if (nextMode === "forgot") {
      setForgotStep("request");
      setForgotData(FORGOT_PASSWORD_INITIAL_STATE);
    }
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginData((currentState) => ({ ...currentState, [name]: value }));
  };

  const handleSignupChange = (event) => {
    const { name, value } = event.target;
    setSignupData((currentState) => ({
      ...currentState,
      [name]: name === "phone" ? normalizePhoneInput(value) : value
    }));
  };

  const handleForgotChange = (event) => {
    const { name, value } = event.target;
    setForgotData((currentState) => ({
      ...currentState,
      [name]: value
    }));
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();

    if (!isValidEmail(loginData.email)) {
      setStatus({ type: "error", message: "Enter a valid email address." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      await login(loginData);
      navigate(redirectPath);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();

    if (!isValidEmail(signupData.email)) {
      setStatus({ type: "error", message: "Enter a valid email address." });
      return;
    }

    if (!isValidPhone(signupData.phone)) {
      setStatus({
        type: "error",
        message: `Enter a valid ${PHONE_DIGIT_LIMIT}-digit phone number.`
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      await signup(signupData);
      navigate(redirectPath);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordRequest = async (event) => {
    event.preventDefault();

    if (!isValidEmail(forgotData.email)) {
      setStatus({ type: "error", message: "Enter a valid email address." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await forgotPassword({ email: forgotData.email });
      setForgotStep("verify");
      setStatus({ type: "success", message: response.message });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    if (!forgotData.otp.trim()) {
      setStatus({ type: "error", message: "Enter the OTP sent to your email." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await verifyResetOtp({
        email: forgotData.email,
        otp: forgotData.otp
      });
      setForgotStep("reset");
      setStatus({ type: "success", message: response.message });
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetWithOtp = async (event) => {
    event.preventDefault();

    if (forgotData.password !== forgotData.confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await resetPassword({
        email: forgotData.email,
        otp: forgotData.otp,
        password: forgotData.password
      });
      setStatus({ type: "success", message: response.message });
      setForgotStep("request");
      setForgotData(FORGOT_PASSWORD_INITIAL_STATE);
      window.setTimeout(() => switchMode("login"), 1200);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return (
      <section className="section page-hero-section">
        <div className="container empty-state">Preparing authentication...</div>
      </section>
    );
  }

  if (user) {
    return (
      <section className="section page-hero-section">
        <div className="container auth-shell">
          <div className="page-hero narrow">
            <p className="section-eyebrow">Account</p>
            <h1>You are already signed in</h1>
            <p>
              Continue exploring the catalog, request quotes, or open the admin page if your account has admin access.
            </p>
          </div>

          <div className="card-grid two-up">
            <article className="reason-card">
              <h3>{user.fullName}</h3>
              <p>{user.email}</p>
              <p>Role: {user.role}</p>
            </article>
            <article className="reason-card">
              <h3>Next step</h3>
              <p>Use the product catalog and quote flow, or return home to continue browsing.</p>
              <Link className="btn btn-primary" to={redirectPath}>
                Continue
              </Link>
            </article>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section page-hero-section">
      <div className="container auth-shell">
        <div className="auth-panel">
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "is-active" : ""}
              onClick={() => switchMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === "signup" ? "is-active" : ""}
              onClick={() => switchMode("signup")}
            >
              Signup
            </button>
            <button
              type="button"
              className={mode === "forgot" ? "is-active" : ""}
              onClick={() => switchMode("forgot")}
            >
              Forgot Password
            </button>
          </div>

          {status.message ? (
            <p className={`status-message ${status.type}`}>{status.message}</p>
          ) : null}

          {mode === "login" ? (
            <form className="form-stack" onSubmit={handleLoginSubmit}>
              <label className="form-field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  value={loginData.email}
                  onChange={handleLoginChange}
                  pattern={EMAIL_PATTERN}
                  required
                />
              </label>

              <label className="form-field">
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  value={loginData.password}
                  onChange={handleLoginChange}
                  required
                />
              </label>

              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Login"}
              </button>
            </form>
          ) : null}

          {mode === "signup" ? (
            <form className="form-stack" onSubmit={handleSignupSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Full Name</span>
                  <input
                    name="fullName"
                    type="text"
                    value={signupData.fullName}
                    onChange={handleSignupChange}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Email</span>
                  <input
                    name="email"
                    type="email"
                    value={signupData.email}
                    onChange={handleSignupChange}
                    pattern={EMAIL_PATTERN}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Phone</span>
                  <input
                    name="phone"
                    type="tel"
                    value={signupData.phone}
                    onChange={handleSignupChange}
                    inputMode="numeric"
                    maxLength={PHONE_DIGIT_LIMIT}
                    pattern={PHONE_PATTERN}
                    title={`Enter a ${PHONE_DIGIT_LIMIT}-digit phone number`}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Company Name</span>
                  <input
                    name="companyName"
                    type="text"
                    value={signupData.companyName}
                    onChange={handleSignupChange}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Designation</span>
                  <input
                    name="designation"
                    type="text"
                    value={signupData.designation}
                    onChange={handleSignupChange}
                    required
                  />
                </label>

                <label className="form-field">
                  <span>Password</span>
                  <input
                    name="password"
                    type="password"
                    value={signupData.password}
                    onChange={handleSignupChange}
                    required
                  />
                </label>
              </div>

              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Signup"}
              </button>
            </form>
          ) : null}

          {mode === "forgot" ? (
            <div className="form-stack">
              {forgotStep === "request" ? (
                <form className="form-stack" onSubmit={handleForgotPasswordRequest}>
                  <label className="form-field">
                    <span>Registered Email</span>
                    <input
                      name="email"
                      type="email"
                      value={forgotData.email}
                      onChange={handleForgotChange}
                      pattern={EMAIL_PATTERN}
                      required
                    />
                  </label>

                  <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Sending OTP..." : "Send OTP"}
                  </button>
                </form>
              ) : null}

              {forgotStep === "verify" ? (
                <form className="form-stack" onSubmit={handleVerifyOtp}>
                  <label className="form-field">
                    <span>Registered Email</span>
                    <input name="email" type="email" value={forgotData.email} readOnly />
                  </label>

                  <label className="form-field">
                    <span>Email OTP</span>
                    <input
                      name="otp"
                      type="text"
                      value={forgotData.otp}
                      onChange={handleForgotChange}
                      inputMode="numeric"
                      maxLength="6"
                      required
                    />
                  </label>

                  <div className="form-actions">
                    <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Verifying..." : "Verify OTP"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={handleForgotPasswordRequest}
                      disabled={isSubmitting}
                    >
                      Resend OTP
                    </button>
                  </div>
                </form>
              ) : null}

              {forgotStep === "reset" ? (
                <form className="form-stack" onSubmit={handleResetWithOtp}>
                  <label className="form-field">
                    <span>New Password</span>
                    <input
                      name="password"
                      type="password"
                      value={forgotData.password}
                      onChange={handleForgotChange}
                      required
                    />
                  </label>

                  <label className="form-field">
                    <span>Re-enter Password</span>
                    <input
                      name="confirmPassword"
                      type="password"
                      value={forgotData.confirmPassword}
                      onChange={handleForgotChange}
                      required
                    />
                  </label>

                  <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Updating..." : "Update Password"}
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default AuthPage;
