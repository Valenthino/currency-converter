import { Converter } from "@/components/Converter";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8 sm:py-12">
      <Converter />
    </main>
  );
}
