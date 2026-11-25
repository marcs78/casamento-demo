"use client";

import { useEffect, useState } from "react";
import Intro from "@/components/Intro";
import Book from "@/components/Book";

export default function Home() {
  const [opened, setOpened] = useState(false);
  const [initialPage, setInitialPage] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const p = params.get("page");
      if (p !== null) {
        const num = parseInt(p, 10);
        if (!isNaN(num) && num >= 0 && num <= 6) {
          setInitialPage(num);
          setOpened(true);
          return;
        }
      }
      if (params.get("open") === "1" || params.get("opened") === "true") {
        setOpened(true);
      }
    }
  }, []);

  return (
    <main className="w-full min-h-dvh flex flex-col items-center">
      {opened ? <Book key={`book-${initialPage}`} initialPage={initialPage} /> : <Intro onOpen={() => setOpened(true)} />}
    </main>
  );
}
