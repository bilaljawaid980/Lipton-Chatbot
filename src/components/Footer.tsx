import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

const footerLinks = {
  "Our Teas": ["Black Tea", "Green Tea", "Herbal Tea", "Iced Tea", "Tea Concentrates"],
  "Discover": ["Recipes", "World of Tea", "Heart Health", "Our Purpose"],
  "Support": ["Contact Us", "FAQ", "Store Locator", "Accessibility"],
  "Legal": ["Privacy Policy", "Terms of Use", "Cookie Policy", "Sitemap"],
};

const Footer = () => {
  return (
    <footer className="bg-lipton-dark text-primary-foreground">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Main footer content */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Logo and social */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-8 lg:mb-0">
            <div className="mb-6">
              <div className="w-20 h-20 bg-primary rounded-b-[50%] flex items-center justify-center">
                <span className="text-primary-foreground font-display text-lg font-bold">
                  LIPTON
                </span>
              </div>
            </div>
            <p className="text-primary-foreground/70 text-sm mb-4">
              Bringing you the finest tea since 1890.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-primary-foreground/70 hover:text-secondary transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-primary-foreground/70 hover:text-secondary transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-primary-foreground/70 hover:text-secondary transition-colors" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-primary-foreground/70 hover:text-secondary transition-colors" aria-label="Youtube">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-sm uppercase tracking-wider mb-4">
                {title}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-primary-foreground/70 text-sm hover:text-secondary transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary-foreground/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-primary-foreground/60 text-sm">
              © {new Date().getFullYear()} Lipton. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-primary-foreground/60 text-sm hover:text-secondary transition-colors">
                Privacy
              </a>
              <a href="#" className="text-primary-foreground/60 text-sm hover:text-secondary transition-colors">
                Terms
              </a>
              <a href="#" className="text-primary-foreground/60 text-sm hover:text-secondary transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
