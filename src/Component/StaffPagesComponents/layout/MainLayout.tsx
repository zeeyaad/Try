import { type ReactNode } from "react";
import { Navbar } from "./Navbar";
import { AppSidebar } from "./AppSidebar";

export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen bg-background huc-app huc-page overflow-hidden" dir="rtl">
      <Navbar />
      <AppSidebar />
      {/*
        Main content area: exactly the remaining height after the 4rem navbar.
        overflow-hidden here; each page decides its own scrolling strategy.
        Table pages use h-[calc(100vh-4rem)] flex flex-col + flex-1 overflow-auto.
        Form/scroll pages use overflow-y-auto on their own containers.
      */}
      <main
        className="pt-16 h-screen overflow-hidden transition-[padding-right] duration-[250ms] ease-in-out min-w-0"
        style={{ paddingRight: "var(--sidebar-width, 256px)" }}
      >
        <div className="h-[calc(100vh-4rem)] min-w-0 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
