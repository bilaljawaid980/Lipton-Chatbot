import { useState } from "react";
import { Menu, X, Search, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const navItems = [
  { name: "OUR TEAS", href: "#", hasDropdown: true },
  { name: "RECIPES", href: "#" },
  { name: "WORLD OF TEA", href: "#" },
  { name: "HEART HEALTH", href: "#" },
  { name: "GREEN TEA", href: "#" },
  { name: "OUR PURPOSE", href: "#" },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between px-4 md:px-8 py-4">
        {/* Desktop Navigation - Left */}
        <nav className="hidden lg:flex items-center gap-6">
          {navItems.slice(0, 3).map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="nav-link flex items-center gap-1"
            >
              {item.name}
              {item.hasDropdown && <ChevronDown className="w-4 h-4" />}
            </a>
          ))}
        </nav>

        {/* Logo - Center */}
        <Link to="/" className="absolute left-1/2 -translate-x-1/2 top-2">
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-primary rounded-b-[50%] flex items-center justify-center shadow-warm">
              <div className="text-center">
                <span className="text-primary-foreground font-display text-xl md:text-2xl font-bold tracking-wider">
                  LIPTON
                </span>
                <div className="text-primary-foreground text-[8px] md:text-[10px] tracking-widest">
                  1890
                </div>
              </div>
            </div>
            {/* Leaf decoration */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <svg width="24" height="20" viewBox="0 0 24 20" fill="none" className="text-lipton-green">
                <path d="M12 0C12 0 18 6 18 12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12C6 6 12 0 12 0Z" fill="currentColor"/>
              </svg>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation - Right */}
        <nav className="hidden lg:flex items-center gap-6">
          {navItems.slice(3).map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="nav-link"
            >
              {item.name}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          <a href="#" className="hidden md:block nav-link text-xs">
            CONTACT US
          </a>
          <button className="text-primary-foreground hover:text-secondary transition-colors" aria-label="Search">
            <Search className="w-5 h-5" />
          </button>

          {/* Mobile menu button */}
          <button
            className="lg:hidden text-primary-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-primary/95 backdrop-blur-md">
          <nav className="flex flex-col px-6 py-4">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="py-3 border-b border-primary-foreground/20 nav-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
            <a
              href="#"
              className="py-3 nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              CONTACT US
            </a>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
