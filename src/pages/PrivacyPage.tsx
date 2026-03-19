import { Link } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';

export default function PrivacyPage() {
  return (
    <>
      <AppNavbar />
      <div className="container py-5" style={{ maxWidth: '760px' }}>
        <h1 className="fw-bold mb-1">Privacy Policy</h1>
        <p className="text-muted mb-5" style={{ fontSize: '0.875rem' }}>Last updated: March 19, 2026</p>

        <section className="mb-4">
          <h2 className="h5">Overview</h2>
          <p>
            JSTutor is a free, educational tool. We are committed to being straightforward about how it works
            and what, if anything, happens with your data.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5">Data Collection</h2>
          <p>
            JSTutor does not collect, store, or transmit any personal information. The tool runs entirely
            in your browser. Code you write or paste into the editor is never sent to any server.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5">Code Execution</h2>
          <p>
            Code entered into JSTutor is executed locally in your browser inside a sandboxed Web Worker.
            It does not leave your device.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5">Sharing &amp; Links</h2>
          <p>
            If you use the Share feature, your code is compressed and embedded directly in the URL.
            No server stores this data. Anyone with the link can view and run the encoded code,
            so only share links you are comfortable making accessible.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5">Cookies &amp; Storage</h2>
          <p>
            JSTutor uses <code>localStorage</code> for a small number of user preferences (such as
            dismissing notices). No tracking cookies or third-party cookies are used.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5">Analytics</h2>
          <p>
            JSTutor may use a third-party analytics service to collect anonymous usage data, such as
            page views and general traffic patterns. This helps improve the tool over time. Any such
            service may set its own cookies and collect data such as your approximate location, browser
            type, and pages visited. No personally identifiable information is intentionally collected
            or shared.
          </p>
          <p>
            You can opt out of analytics tracking through your browser's privacy settings or by using
            an ad or tracker blocker.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5">Third-Party Services</h2>
          <p>
            JSTutor is hosted on GitHub Pages. Your browser may interact with GitHub's infrastructure
            when loading the page. Please refer to{' '}
            <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noreferrer">
              GitHub's Privacy Statement
            </a>{' '}
            for details on their data practices.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5">Contact</h2>
          <p>
            If you have questions about this policy, you can reach the developer at{' '}
            <a href="https://coletnelson.us" target="_blank" rel="noreferrer">coletnelson.us</a>.
          </p>
        </section>

        <div className="text-muted" style={{ fontSize: '0.875rem' }}>
          <Link to="/">← Back to Sandbox</Link>
        </div>
      </div>
    </>
  );
}
