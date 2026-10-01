import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { GbpAnalytics } from "@/components/local-seo/gbp-analytics";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("loads official metrics after a location is selected without starting a scan", async () => {
  const fetcher = vi.fn(async (url: string) => {
    if (url === "/api/gbp/locations") return { ok:true, json:async()=>({data:[{googleLocationId:"locations/1",title:"Open Vet",address:"1 Main",status:"OPEN",latitude:1,longitude:2}]}) };
    if (url.startsWith("/api/gbp/analytics")) return { ok:true, json:async()=>({data:{daily:{calls:[{date:"2026-09-01",value:4}],directions:[],websiteClicks:[],impressions:[{date:"2026-09-01",value:30}]},searchQueries:[{keyword:"veterinarian",impressions:12}],fetchedAt:"2026-09-30T00:00:00Z"}}) };
    if (url.startsWith("/api/gbp/keywords")) return { ok:true, json:async()=>({data:[]}) };
    throw new Error(url);
  });
  vi.stubGlobal("fetch", fetcher);
  render(<GbpAnalytics/>);
  const picker = await screen.findByRole("combobox", { name:/Business Profile location/i });
  fireEvent.change(picker,{target:{value:"locations/1"}});
  expect(await screen.findByText("30")).toBeInTheDocument();
  expect(screen.getByText(/Official Google Business Profile data/i)).toBeInTheDocument();
  await waitFor(() => expect(fetcher.mock.calls.every(([url]) => !String(url).includes("geogrid"))).toBe(true));
});

it("groups setup controls and presents empty guidance as a status", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ data: [] }) })));

  render(<GbpAnalytics/>);

  const setup = await screen.findByRole("group", { name: "GBP analytics setup" });
  expect(setup).toContainElement(screen.getByRole("button", { name: "Synchronize GBP locations" }));
  expect(screen.getByRole("status")).toHaveTextContent("Choose a Business Profile location");
});
