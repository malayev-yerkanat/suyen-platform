export default function BookingsLoading() {
  return (
    <main className="demo-content" aria-busy="true">
      <div className="directory-intro directory-skeleton-heading" aria-hidden="true" />
      <div className="appointments-list" aria-hidden="true">
        {[0, 1, 2].map((index) => <div className="dashboard-card directory-skeleton-card" key={index} />)}
      </div>
    </main>
  );
}
