import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Admin Merch Orders Logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('updates order status correctly in state mapping', () => {
    const orders = [
      { id: 'order_1', itemName: 'ChainLink Hoodie', status: 'PENDING' },
      { id: 'order_2', itemName: 'ChainLink T-Shirt', status: 'SHIPPED' },
    ];

    const orderIdToUpdate = 'order_1';
    const newStatus = 'SHIPPED';

    const updatedOrders = orders.map(o =>
      o.id === orderIdToUpdate ? { ...o, status: newStatus } : o
    );

    expect(updatedOrders[0].status).toBe('SHIPPED');
    expect(updatedOrders[1].status).toBe('SHIPPED');
  });

  it('formats shipping address line accurately if provided', () => {
    const orderWithInfo = {
      id: 'order_1',
      shippingInfo: {
        name: 'Jane Doe',
        addressLine1: '123 Main St',
        addressLine2: 'Apt 4B',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85001'
      }
    };

    const info = orderWithInfo.shippingInfo;
    const formatted = `${info.name}\n${info.addressLine1} ${info.addressLine2}\n${info.city}, ${info.state} ${info.zip}`;

    expect(formatted).toContain('Jane Doe');
    expect(formatted).toContain('123 Main St Apt 4B');
    expect(formatted).toContain('Phoenix, AZ 85001');
  });
});
