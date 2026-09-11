import React from 'react';
import ReactDOM from 'react-dom/client';
// The film itself is a static HTML/Canvas document, not a React route.
if (/^\/presentation\/?$/.test(window.location.pathname)) {
	window.location.replace(`/canvas-film/index.html${window.location.search}${window.location.hash}`);
} else {
	const Entry = React.lazy(() => import('./OperationalApp'));
	ReactDOM.createRoot(document.getElementById('root')!).render(
		<React.StrictMode><React.Suspense fallback={<p role="status">Loading Drishti…</p>}><Entry /></React.Suspense></React.StrictMode>,
	);
}