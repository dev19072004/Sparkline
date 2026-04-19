import { clients } from "../data/siteData";

function Clients() {
  return (
    <section className="clients-modern" id="clients">
      <div className="container">
        <div className="section-heading center">
          <span className="section-badge">Trusted By</span>
          <h2>Our Clients</h2>
        </div>

        <div className="clients-modern-grid">
          {clients.map((client, index) => (
            <div className="client-modern-card" key={index}>
              <img src={client} alt={`client-${index}`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Clients;