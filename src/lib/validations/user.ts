import { z } from "zod";
import { idSchema, optionalString } from "./common";

export const passwordRule = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Use at least one letter and one number.");

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.").max(191));
const name = z.string().trim().min(2, "Name must be at least 2 characters.").max(120);

const profileFields = {
  name,
  jobTitle: optionalString(120),
  department: optionalString(120),
  phone: optionalString(40),
  bio: optionalString(1000),
  avatarColor: optionalString(20),
};

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required.").max(128),
});

export const createUserSchema = z
  .object({
    ...profileFields,
    email,
    role: z.enum(["ADMIN", "EMPLOYEE"]),
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const adminUpdateUserSchema = z.object({
  ...profileFields,
  userId: idSchema,
  email,
  role: z.enum(["ADMIN", "EMPLOYEE"]),
});

export const adminResetPasswordSchema = z
  .object({ userId: idSchema, password: passwordRule, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const updateProfileSchema = z.object({
  ...profileFields,
  email,
  /** Required only when the email address changes. */
  currentPassword: z.string().max(128).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Choose a password different from your current one.",
    path: ["newPassword"],
  });

export const tagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required.").max(50),
  color: optionalString(20),
});
