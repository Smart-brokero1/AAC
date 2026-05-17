/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const TrackingView = lazy(() => import('./components/TrackingView'));
const AdminPortal = lazy(() => import('./components/AdminPortal'));

export default function App() {
  return (
    <Router>
      <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<TrackingView />} />
          <Route path="/admin" element={<AdminPortal />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
