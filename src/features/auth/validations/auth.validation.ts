import { z } from 'zod';

const DATE_OF_BIRTH_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const TREKKING_EXPERIENCE_OPTIONS = ['OCCASIONAL', 'EXPERIENCED'] as const;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email khong duoc de trong')
    .email('Email khong dung dinh dang'),
  password: z.string().min(6, 'Mat khau khong duoc de trong'),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Ho ten phai co it nhat 2 ky tu')
      .max(100, 'Ho ten khong duoc qua 100 ky tu'),
    dateOfBirth: z
      .string()
      .min(1, 'Ngay sinh khong duoc de trong')
      .regex(DATE_OF_BIRTH_REGEX, 'Ngay sinh phai dung dinh dang yyyy-MM-dd'),
    email: z
      .string()
      .min(1, 'Email khong duoc de trong')
      .email('Email khong dung dinh dang'),
    phone: z
      .string()
      .min(1, 'So dien thoai khong duoc de trong')
      .regex(/^[0-9]{9,11}$/, 'So dien thoai chi duoc gom 9-11 chu so'),
    password: z.string().min(8, 'Mat khau phai co it nhat 8 ky tu'),
    confirmPassword: z.string().min(1, 'Vui long xac nhan mat khau'),
    trekkingExperience: z.enum(TREKKING_EXPERIENCE_OPTIONS, {
      errorMap: () => ({ message: 'Kinh nghiem trekking khong hop le' }),
    }),
    citizenIdImageUrl: z.string().url('Link CCCD khong hop le').optional().or(z.literal('')),
    agreeTerms: z.boolean().refine(value => value === true, {
      message: 'Ban phai dong y voi dieu khoan su dung',
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Mat khau xac nhan khong khop',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email khong duoc de trong')
    .email('Email khong dung dinh dang'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Mat khau phai co it nhat 8 ky tu'),
    confirmPassword: z.string().min(1, 'Vui long xac nhan mat khau'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Mat khau xac nhan khong khop',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
