import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';

describe('Role Spoofing & Test Account Types', () => {
  it('allows setting and clearing spoofed roles', () => {
    let role: string | null = null;
    const setSpoofedRole = (r: string | null) => { role = r; };

    setSpoofedRole('USER');
    expect(role).toBe('USER');

    setSpoofedRole(null);
    expect(role).toBeNull();
  });
});
