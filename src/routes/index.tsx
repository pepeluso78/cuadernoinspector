import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SIE-CLM | Cuaderno de Inspección Educativa · Albacete" },
      { name: "description", content: "Cuaderno digital del Inspector de Educación: trámites, centros, checklists, agenda y normativa CLM." },
      { property: "og:title", content: "SIE-CLM | Cuaderno de Inspección Educativa" },
      { property: "og:description", content: "Cuaderno digital del Inspector de Educación de Albacete." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
