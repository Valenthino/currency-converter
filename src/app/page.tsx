import { Converter } from "@/components/Converter";

export default function Home() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden px-4 pt-[max(8px,env(safe-area-inset-top))] sm:max-h-[56rem] sm:py-6">
      <Converter />
    </main>
  );
}
