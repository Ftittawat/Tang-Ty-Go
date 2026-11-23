import { AppHeader } from "@/components/app-nav";
import { BackOfficeNav } from "@/components/back-office";
import { pageCls } from "@/components/ui";
import { ownerPage } from "@/lib/viewer";

/**
 * Header + tabs for the back office. The owner check here only keeps the tabs from showing to
 * anyone else; every page and Server Action under /back-office checks again on its own.
 */
export default async function BackOfficeLayout({ children }: LayoutProps<"/back-office">) {
  await ownerPage();
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className={`${pageCls} py-6`}>
        <div className="mx-auto max-w-3xl space-y-6">
          <BackOfficeNav />
          {children}
        </div>
      </main>
    </div>
  );
}
