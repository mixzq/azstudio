export function SeoFooter() {
  return (
    <footer className="seo-footer" aria-label="AZ Studio overview">
      <div className="seo-footer-inner">
        <section id="about" className="seo-footer-brand" aria-labelledby="footer-about-heading">
          <a className="seo-footer-logo" href="/" aria-label="AZ Studio home">azstudio</a>
          <p id="footer-about-heading">
            AZ Studio is a Norway based creative studio for brand identity, interactive web design, motion, and digital experience systems.
          </p>
          <div className="seo-footer-social" aria-label="Social links">
            <a href="https://www.instagram.com/" aria-label="Instagram">Ig</a>
            <a href="https://www.behance.net/" aria-label="Behance">Be</a>
            <a href="https://www.linkedin.com/" aria-label="LinkedIn">In</a>
          </div>
        </section>

        <nav className="seo-footer-nav" aria-label="Footer navigation">
          <section className="seo-footer-section" aria-labelledby="footer-studio-heading">
            <h2 id="footer-studio-heading">Studio</h2>
            <a href="/projects">Projects</a>
            <a href="/service">Service</a>
            <a href="/contact">Contact</a>
            <a href="/admin">Admin</a>
          </section>
          <section className="seo-footer-section" aria-labelledby="footer-services-heading">
            <h2 id="footer-services-heading">Services</h2>
            <a href="/service">Brand identity</a>
            <a href="/service">Web design</a>
            <a href="/service">Motion direction</a>
            <a href="/service">Digital systems</a>
          </section>
          <section className="seo-footer-section" aria-labelledby="footer-contact-heading">
            <h2 id="footer-contact-heading">Contact</h2>
            <a href="mailto:mixzq@outlook.com">Email</a>
            <a href="/start">Start</a>
            <a href="https://azstudio.no/">azstudio.no</a>
          </section>
        </nav>
      </div>

      <div className="seo-footer-bottom">
        <p>© 2026 AZ Studio. All rights reserved.</p>
      </div>
    </footer>
  );
}
