import { useState } from "react";
import { Menu, X, Search, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const navItems = [
  { name: "OUR TEAS", hasDropdown: true },
  { name: "RECIPES" },
  { name: "WORLD OF TEA" },
  { name: "HEART HEALTH" },
  { name: "GREEN TEA" },
  { name: "OUR PURPOSE" },
];

const teaPages = [
  { name: "Black Tea" },
  { name: "Green Tea" },
  { name: "Herbal Tea" },
  { name: "Iced Tea" },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-[88px] max-w-[1240px] items-center justify-between px-4 md:px-8">
        {/* Desktop Navigation - Left */}
        <nav className="hidden lg:flex items-center gap-2 xl:gap-3">
          {navItems.slice(0, 3).map((item) => (
            <div key={item.name} className="relative group">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-1 rounded-full px-4 text-[11px] font-semibold tracking-wide text-foreground/90 transition-colors hover:bg-muted hover:text-primary"
              >
                {item.name}
                {item.hasDropdown && <ChevronDown className="h-4 w-4" />}
              </button>

              {item.hasDropdown && (
                <div className="invisible absolute left-0 top-full mt-3 w-64 rounded-xl border border-border bg-background p-2 shadow-lg opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                  {teaPages.map((tea) => (
                    <button
                      type="button"
                      key={tea.name}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground/90 transition-colors hover:bg-muted hover:text-primary"
                    >
                      {tea.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Logo - Center */}
        <Link to="/" className="absolute left-1/2 top-2 -translate-x-1/2">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-b-[50%] bg-primary shadow-warm transition-transform duration-300 hover:scale-[1.03] md:h-32 md:w-32">
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
            <div className="absolute left-1/2 -top-2 -translate-x-1/2">
              <svg width="24" height="20" viewBox="0 0 24 20" fill="none" className="text-lipton-green">
                <path d="M12 0C12 0 18 6 18 12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12C6 6 12 0 12 0Z" fill="currentColor"/>
              </svg>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation - Right */}
        <nav className="hidden lg:flex items-center gap-2 xl:gap-3">
          {navItems.slice(3).map((item) => (
            <button
              type="button"
              key={item.name}
              className="inline-flex h-10 items-center rounded-full px-4 text-[11px] font-semibold tracking-wide text-foreground/90 transition-colors hover:bg-muted hover:text-primary"
            >
              {item.name}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            className="hidden h-10 rounded-full px-4 text-[11px] font-semibold tracking-wide text-foreground/90 transition-colors hover:bg-muted hover:text-primary md:inline-flex md:items-center"
          >
            CONTACT US
          </button>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/90 transition-colors hover:bg-muted hover:text-primary"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Mobile menu button */}
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground/90 transition-colors hover:bg-muted hover:text-primary lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border/80 bg-background/95 px-4 pb-4 pt-3 backdrop-blur-md lg:hidden">
          <nav className="mx-auto flex max-w-[1240px] flex-col rounded-2xl border border-border bg-card p-3 shadow-lg">
            {navItems.map((item) => (
              <button
                type="button"
                key={item.name}
                className="rounded-lg px-3 py-3 text-left text-sm font-semibold tracking-wide text-foreground/90 transition-colors hover:bg-muted hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </button>
            ))}

            <div className="mt-1 rounded-lg border border-border/70 px-3 py-2">
              <p className="py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Our Teas Pages
              </p>
              {teaPages.map((tea) => (
                <button
                  type="button"
                  key={tea.name}
                  className="block w-full rounded-md px-2 py-2 text-left text-sm font-medium text-foreground/90 transition-colors hover:bg-muted hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {tea.name}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="mt-2 rounded-lg bg-primary px-3 py-3 text-left text-sm font-semibold tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
              onClick={() => setMobileMenuOpen(false)}
            >
              CONTACT US
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
