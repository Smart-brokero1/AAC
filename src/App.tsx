/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TrackingView from './components/TrackingView';
import AdminPortal from './components/AdminPortal';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TrackingView />} />
        <Route path="/admin" element={<AdminPortal />} />
      </Routes>
    </Router>
  );
}
