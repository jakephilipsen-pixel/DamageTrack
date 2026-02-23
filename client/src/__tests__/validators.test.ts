import { describe, it, expect } from 'vitest';
import { customerSchema, productSchema, userSchema, changePasswordSchema } from '../utils/validators';

describe('customerSchema', () => {
  it('accepts a valid customer', () => {
    const result = customerSchema.safeParse({
      name: 'Acme Corp',
      code: 'ACME',
      email: 'contact@acme.com',
    });
    expect(result.success).toBe(true);
  });

  it('rejects name shorter than 2 characters', () => {
    const result = customerSchema.safeParse({ name: 'A', code: 'ACME' });
    expect(result.success).toBe(false);
  });

  it('rejects code longer than 20 characters', () => {
    const result = customerSchema.safeParse({ name: 'Acme', code: 'A'.repeat(21) });
    expect(result.success).toBe(false);
  });

  it('accepts empty email string', () => {
    const result = customerSchema.safeParse({ name: 'Acme', code: 'ACME', email: '' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = customerSchema.safeParse({ name: 'Acme', code: 'ACME', email: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});

describe('productSchema', () => {
  it('accepts a valid product', () => {
    const result = productSchema.safeParse({
      sku: 'SKU-001',
      name: 'Widget',
      customerId: 'cuid1234',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty SKU', () => {
    const result = productSchema.safeParse({ sku: '', name: 'Widget', customerId: 'cuid1234' });
    expect(result.success).toBe(false);
  });

  it('rejects negative unit value', () => {
    const result = productSchema.safeParse({
      sku: 'SKU-001',
      name: 'Widget',
      customerId: 'cuid1234',
      unitValue: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts zero unit value', () => {
    const result = productSchema.safeParse({
      sku: 'SKU-001',
      name: 'Widget',
      customerId: 'cuid1234',
      unitValue: 0,
    });
    expect(result.success).toBe(true);
  });
});

describe('userSchema', () => {
  it('accepts a valid user', () => {
    const result = userSchema.safeParse({
      email: 'user@example.com',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      role: 'WAREHOUSE_USER',
    });
    expect(result.success).toBe(true);
  });

  it('rejects username shorter than 3 characters', () => {
    const result = userSchema.safeParse({
      email: 'user@example.com',
      username: 'ab',
      firstName: 'John',
      lastName: 'Doe',
      role: 'WAREHOUSE_USER',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = userSchema.safeParse({
      email: 'user@example.com',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      role: 'SUPERUSER',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = userSchema.safeParse({
      email: 'notanemail',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      role: 'ADMIN',
    });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('accepts valid password change', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPass1',
      newPassword: 'NewPass1',
      confirmPassword: 'NewPass1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when passwords do not match', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPass1',
      newPassword: 'NewPass1',
      confirmPassword: 'Different1',
    });
    expect(result.success).toBe(false);
    expect(result.error?.errors[0].path).toContain('confirmPassword');
  });

  it('rejects new password without uppercase', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPass1',
      newPassword: 'newpass1',
      confirmPassword: 'newpass1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects new password shorter than 8 chars', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPass1',
      newPassword: 'New1',
      confirmPassword: 'New1',
    });
    expect(result.success).toBe(false);
  });
});
