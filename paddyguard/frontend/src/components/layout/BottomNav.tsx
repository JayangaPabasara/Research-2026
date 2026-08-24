import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Mic, Leaf, Bug, User } from "lucide-react";

const items = [
  { to: "/", label: "මුල් පිටුව", icon: Home },
  { to: "/voice", label: "හඬ රෝගය", icon: Mic, primary: true },
  { to: "/leaf", label: "කොළ", icon: Leaf },
  { to: "/pest", label: "කෘමි", icon: Bug },
  { to: "/profile", label: "ගිණුම", icon: User },
];

const BottomNav: React.FC = () => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-beige bg-white"
      style={{ height: "64px", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-[430px] items-center justify-around">
        {items.map(({ to, label, icon: Icon, primary }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-all duration-200"
          >
            {({ isActive }) => (
              <>
                {primary ? (
                  <div
                    className={`flex items-center justify-center rounded-full transition-all duration-200 ${
                      isActive
                        ? "h-11 w-11 bg-amber shadow-card"
                        : "h-11 w-11 bg-transparent"
                    }`}
                  >
                    <Icon
                      size={26}
                      className={isActive ? "text-white" : "text-forest-muted"}
                    />
                  </div>
                ) : (
                  <Icon
                    size={22}
                    className={isActive ? "text-amber" : "text-forest-muted"}
                  />
                )}
                <span
                  className={`font-sinhala text-[10px] leading-none ${
                    isActive ? "font-semibold text-amber" : "text-forest-muted"
                  }`}
                >
                  {label}
                </span>
                {isActive && !primary && (
                  <span className="h-[2px] w-4 rounded-full bg-amber" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
