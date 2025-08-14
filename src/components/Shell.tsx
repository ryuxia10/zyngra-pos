import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import FABs from "./FABs";

export default function Shell() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <TopNav />
      <main className="max-w-6xl mx-auto pt-16 px-3 pb-12">
        <Outlet />
      </main>
      <FABs />
    </div>
  );
}
