export default function SpecialistsLoading() {
  return (
    <main className="demo-content" aria-busy="true">
      <div className="directory-intro directory-skeleton-heading" aria-hidden="true" />
      <div className="directory-filters directory-skeleton-filters" aria-hidden="true" />
      <div className="specialist-grid" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <div className="specialist-card directory-skeleton-card" key={index} />
        ))}
      </div>
    </main>
  );
}
