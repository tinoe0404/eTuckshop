import { Context } from "hono";

export const serverError = (c: Context, error: any) => {
  console.error("🔥 Server Error:", error);

  return c.json(
    {
      success: false,
      message: "Internal server error",
      error: error?.message || "Unknown error",
    },
    500
  );
};
