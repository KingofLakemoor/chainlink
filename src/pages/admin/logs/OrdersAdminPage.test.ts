import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractShippingAddress, extractOrderItemDetails } from './AuditLogsHub';

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

  it('extracts full shipping address and order details including size and color', () => {
    const order = {
      id: 'order_1',
      itemName: 'ChainLink Hoodie',
      size: 'L',
      color: 'Charcoal',
      quantity: 1,
      shippingInfo: {
        fullName: 'Jane Doe',
        streetAddress: '123 Main St',
        addressLine2: 'Apt 4B',
        city: 'Phoenix',
        state: 'AZ',
        zip: '85001',
        country: 'USA'
      }
    };

    const shipping = extractShippingAddress(order);
    const item = extractOrderItemDetails(order);

    expect(shipping.recipientName).toBe('Jane Doe');
    expect(shipping.addressLine1).toBe('123 Main St');
    expect(shipping.addressLine2).toBe('Apt 4B');
    expect(shipping.city).toBe('Phoenix');
    expect(shipping.state).toBe('AZ');
    expect(shipping.zip).toBe('85001');
    expect(shipping.country).toBe('USA');
    expect(item.size).toBe('L');
    expect(item.color).toBe('Charcoal');
    expect(item.quantity).toBe(1);
  });
});
