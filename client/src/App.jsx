import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import OnboardingWizard from './components/OnboardingWizard';
import Dashboard from './pages/Dashboard';
import RepoPRs from './pages/RepoPRs';
import PRReview from './pages/PRReview';
import Settings from './pages/Settings';
import { getConfig } from './api/bitbucket';

export default function App() {
  // undefined = checking, true = show wizard, false = skip
  const [showOnboarding, setShowOnboarding] = useState(undefined);

  useEffect(() => {
    getConfig()
      .then(cfg => {
        // Show wizard if no token configured and no workspace
        const isFirstTime = !cfg.hasToken && !cfg.workspace;
        setShowOnboarding(isFirstTime);
      })
      .catch(() => setShowOnboarding(true)); // show on error too
  }, []);

  // Still checking — render nothing briefly to avoid flash
  if (showOnboarding === undefined) return null;

  return (
    <>
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}
      <Layout>
        <Routes>
          <Route path="/"                                  element={<Dashboard />} />
          <Route path="/repos/:repoSlug/prs"               element={<RepoPRs />} />
          <Route path="/repos/:repoSlug/prs/:prId"         element={<PRReview />} />
          <Route path="/settings"                          element={<Settings />} />
        </Routes>
      </Layout>
    </>
  );
}
