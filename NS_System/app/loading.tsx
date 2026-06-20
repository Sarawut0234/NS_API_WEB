export default function RootLoading() {
  return (
    <main className="gear-loading" aria-live="polite" aria-busy="true">
      <div className="gear-loading__icons" aria-hidden="true">
        <span className="gear-loading__icon gear-loading__icon--big">⚙</span>
        <span className="gear-loading__icon gear-loading__icon--small">⚙</span>
      </div>
      <p className="gear-loading__text">L O A D I N G...</p>
    </main>
  );
}
