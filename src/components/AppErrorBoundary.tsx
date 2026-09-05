import { Component, type ReactNode } from 'react';

/** Network/chunk failures must not strand phone users on a blank screen. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="sign-in"><section className="signin-panel" role="alert">
      <h1>Drishti could not open this screen</h1>
      <p>Check your connection, then reload to get the latest application.</p>
      <p>Reloading resets reports and operations in this demo session.</p>
      <button type="button" className="primary full" onClick={() => window.location.reload()}>Reload Drishti</button>
    </section></main>;
  }
}