import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { KeywordManager } from "@/components/local-seo/keyword-manager";
afterEach(cleanup);
it("keeps suggestions separate until approval", () => { const onUpdate = vi.fn(); render(<KeywordManager keywords={[{ id:"1", displayKeyword:"veterinarian", source:"GBP_SUGGESTED", state:"SUGGESTED", impressions:42 }]} onAdd={vi.fn()} onUpdate={onUpdate}/>); expect(screen.getByText(/42 impressions/i)).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name:/approve veterinarian/i })); expect(onUpdate).toHaveBeenCalledWith("1", "APPROVED"); });
