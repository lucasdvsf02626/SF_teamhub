import { Link } from "react-router-dom";

export const PanaceaFooter = () => {
  return (
    <footer className="py-6 text-center border-t border-border/30">
      <div className="flex flex-col items-center gap-4">
        {/* Legal Links Row */}
        <div className="flex items-center gap-2 md:gap-4 text-xs text-muted-foreground">
          <Link to="/terms" className="hover:text-green-400 transition-colors">
            Terms &amp; Conditions
          </Link>
          <span className="text-muted-foreground/30 hidden md:inline">|</span>
          <Link to="/privacy" className="hover:text-green-400 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-muted-foreground/30 hidden md:inline">|</span>
          <Link to="/contact" className="hover:text-green-400 transition-colors">
            Contact Us
          </Link>
        </div>

        {/* Powered by PANACEA branding */}
        <div className="text-sm font-medium tracking-wide inline-flex items-center justify-center gap-1.5 w-full">
          <span className="text-muted-foreground">Powered by</span>
          <a
            href="https://panaceasuite.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:text-green-300 transition-colors font-semibold animate-pulse-slow drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]"
          >
            PANACEA
          </a>
        </div>
      </div>
    </footer>
  );
};
