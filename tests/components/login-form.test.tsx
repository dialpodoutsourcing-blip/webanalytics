import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { LoginForm } from "@/components/login-form";

it("labels both shared-login inputs", () => {
  render(<LoginForm />);
  expect(screen.getByLabelText("Username")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
});
