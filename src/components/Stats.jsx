import { stats } from "../data/siteData";

function Stats() {
  return (
    <section className="stats-section">
      <div className="container stats-grid">
        {stats.map((item, index) => (
          <div className="stat-modern-card" key={index}>
            <h3>{item.number}</h3>
            <p>{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Stats;        