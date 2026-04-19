function InquiryAccountCard({ user }) {
  if (!user) {
    return null;
  }

  return (
    <div className="inquiry-account-card">
      <div className="inquiry-account-head">
        <p className="section-eyebrow">Using Signed-In Account</p>
        <h3>Your inquiry will use these account details</h3>
      </div>

      <div className="inquiry-account-grid">
        <div className="inquiry-account-item">
          <small>Full Name</small>
          <strong>{user.fullName}</strong>
        </div>
        <div className="inquiry-account-item">
          <small>Email</small>
          <strong>{user.email}</strong>
        </div>
        <div className="inquiry-account-item">
          <small>Phone</small>
          <strong>{user.phone}</strong>
        </div>
        <div className="inquiry-account-item">
          <small>Company</small>
          <strong>{user.companyName}</strong>
        </div>
        <div className="inquiry-account-item">
          <small>Designation</small>
          <strong>{user.designation}</strong>
        </div>
      </div>
    </div>
  );
}

export default InquiryAccountCard;
