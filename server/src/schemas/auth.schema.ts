import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address format").max(255),
    password: z.string().min(8, "Password must be at least 8 characters long").max(100),
    name: z.string().min(2, "Name must be at least 2 characters long").max(150),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address format"),
    password: z.string().min(1, "Password is required"),
  }),
});
