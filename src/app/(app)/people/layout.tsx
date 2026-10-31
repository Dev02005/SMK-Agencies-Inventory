import type { ReactNode } from "react";
import { PeopleNav } from "./people-nav";

export default function PeopleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="animate-fade-up">
      <PeopleNav />
      {children}
    </div>
  );
}
