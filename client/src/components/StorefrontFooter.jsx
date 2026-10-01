const linkClass = 'text-slate-300 hover:text-white transition-colors';

export function StorefrontFooter({ onRegisterComplaint }) {
  return (
    <footer className="border-t border-white/10 bg-[#041724] px-6 pb-8 pt-14 text-slate-300">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2.5 text-xl font-extrabold text-white">
            <img src="/tech-house-logo.png" alt="Tech House Logo" className="h-8 w-8 object-contain" />
            Tech House Pest Control
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            ISO 9001:2026 Certified science-led pest management platform. Delivering safe, odourless, and guaranteed pest eradication across residential and commercial properties.
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-base font-bold text-white">Pest Eradication Suite</h4>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm">
            <li><a href="/services/cockroach" className={linkClass}>Cockroach Control</a></li>
            <li><a href="/services/termite" className={linkClass}>Termite Protection</a></li>
            <li><a href="/services/rodent" className={linkClass}>Rodent & Rat Control</a></li>
            <li><a href="/services/mosquito" className={linkClass}>Mosquito Defense</a></li>
            <li><a href="/services/bed-bug" className={linkClass}>Bed Bug Removal</a></li>
            <li><a href="/services/bird-control" className={linkClass}>Bird Netting & Spikes</a></li>
            <li><a href="/services/ants" className={linkClass}>Ant Eradication</a></li>
            <li><a href="/services/housefly" className={linkClass}>Housefly Control</a></li>
            <li><a href="/services/silverfish" className={linkClass}>Silverfish Control</a></li>
            <li><a href="/services/spider" className={linkClass}>Spider Web Removal</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-base font-bold text-white">Corporate & Support</h4>
          <ul className="grid gap-2 text-sm">
            <li><a href="/about" className={linkClass}>About Tech House</a></li>
            <li><a href="/contact" className={linkClass}>Contact & Regional Hubs</a></li>
            {onRegisterComplaint ? (
              <li>
                <button
                  type="button"
                  onClick={onRegisterComplaint}
                  className={`${linkClass} text-left cursor-pointer bg-transparent border-0 p-0 text-amber-400 hover:text-amber-300 font-semibold`}
                >
                  Register Complaint / Grievance
                </button>
              </li>
            ) : (
              <li><a href="/contact#complaint" className={`${linkClass} text-amber-400 font-semibold`}>Register Complaint</a></li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-base font-bold text-white">Legal & Policies</h4>
          <ul className="grid gap-2 text-sm">
            <li><a href="/privacy-policy" className={linkClass}>Privacy Policy</a></li>
            <li><a href="/legal-statement" className={linkClass}>Legal Statement & Terms</a></li>
            <li><a href="/cookie-policy" className={linkClass}>Cookie Policy</a></li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500">
        <div>
          © {new Date().getFullYear()}{' '}
          <a href="https://bmtechx.in" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
            Techlume Solutions (Freelancers)
          </a>
          . All rights reserved.
        </div>
        <div className="flex gap-4">
          <span>| ISO 9001:2026 Certified Pest Eradication.</span>
          <span>•</span>
          <span>care@techhousepest.com</span>
        </div>
      </div>
    </footer>
  );
}
