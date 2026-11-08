"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

// Ett borttaget vin försvinner ur listan tillsammans med sin knapp. Kvittot
// annonseras därför här, och fokus flyttas till rubriken så att det inte
// hamnar på sidans början.
const WineDeletedContext = createContext<(message: string) => void>(() => {});

export function useAnnounceWineDeleted() {
  return useContext(WineDeletedContext);
}

export function WinesSection({ children }: { children: React.ReactNode }) {
  const [announcement, setAnnouncement] = useState({ message: "", count: 0 });
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (announcement.count > 0) heading.current?.focus();
  }, [announcement]);

  return (
    <section aria-labelledby="wines-heading" className="mt-8">
      <h2
        ref={heading}
        id="wines-heading"
        tabIndex={-1}
        className="text-lg font-semibold"
      >
        Viner
      </h2>
      <p role="status">{announcement.message}</p>
      <WineDeletedContext
        value={(message) =>
          setAnnouncement(({ count }) => ({ message, count: count + 1 }))
        }
      >
        {children}
      </WineDeletedContext>
    </section>
  );
}
