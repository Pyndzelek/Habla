import { Header } from "@/components/Header";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl px-5 pb-24 pt-8 sm:pt-12">{children}</main>
    </>
  );
}
