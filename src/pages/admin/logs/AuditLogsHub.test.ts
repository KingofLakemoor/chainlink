import { describe, it, expect } from 'vitest';
import { getTimestampMs, formatDateStr, extractShippingAddress, extractOrderItemDetails } from './AuditLogsHub';

describe('Audit & System Logs Hub Logic', () => {
  it('correctly converts various timestamp representations to milliseconds', () => {
    const msNum = 1710000000000;
    const isoStr = '2025-06-15T10:00:00.000Z';
    const firestoreTs = { seconds: 1710000000, nanoseconds: 0 };
    const dateObj = { toDate: () => new Date('2025-06-15T10:00:00.000Z') };

    expect(getTimestampMs(msNum)).toBe(1710000000000);
    expect(getTimestampMs(isoStr)).toBe(new Date(isoStr).getTime());
    expect(getTimestampMs(firestoreTs)).toBe(1710000000000);
    expect(getTimestampMs(dateObj)).toBe(new Date('2025-06-15T10:00:00.000Z').getTime());
    expect(getTimestampMs(null)).toBe(0);
    expect(getTimestampMs(undefined)).toBe(0);
  });

  it('formats dates cleanly for display', () => {
    const msNum = 1710000000000;
    expect(formatDateStr(msNum)).not.toBe('Unknown');
    expect(formatDateStr(null)).toBe('Unknown');
  });

  it('filters log items within start and end date boundaries accurately', () => {
    const isWithinDateRange = (tsMs: number, startDate?: string, endDate?: string) => {
      if (!tsMs) return true;
      if (startDate) {
        const startMs = new Date(`${startDate}T00:00:00`).getTime();
        if (!isNaN(startMs) && tsMs < startMs) return false;
      }
      if (endDate) {
        const endMs = new Date(`${endDate}T23:59:59.999`).getTime();
        if (!isNaN(endMs) && tsMs > endMs) return false;
      }
      return true;
    };

    const june1 = new Date('2025-06-01T12:00:00Z').getTime();
    const june15 = new Date('2025-06-15T12:00:00Z').getTime();
    const june30 = new Date('2025-06-30T12:00:00Z').getTime();

    expect(isWithinDateRange(june15, '2025-06-10', '2025-06-20')).toBe(true);
    expect(isWithinDateRange(june1, '2025-06-10', '2025-06-20')).toBe(false);
    expect(isWithinDateRange(june30, '2025-06-10', '2025-06-20')).toBe(false);
  });

  it('calculates Link Transactions volume, net links, and category breakdown metrics', () => {
    const txLogs = [
      { id: '1', amount: 50, type: 'DAILY_CLAIM' },
      { id: '2', amount: 100, type: 'SHOP_PURCHASE_PACK' },
      { id: '3', amount: -20, type: 'WAGER_PLACED' },
      { id: '4', amount: -10, type: 'LINK4_ENTRY' },
    ];

    let totalPositive = 0;
    let totalNegative = 0;
    const typeCounts: Record<string, number> = {};

    txLogs.forEach(log => {
      const amt = Number(log.amount) || 0;
      if (amt > 0) totalPositive += amt;
      else if (amt < 0) totalNegative += Math.abs(amt);

      const type = log.type || 'OTHER';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const netLinks = totalPositive - totalNegative;

    expect(totalPositive).toBe(150);
    expect(totalNegative).toBe(30);
    expect(netLinks).toBe(120);
    expect(typeCounts['DAILY_CLAIM']).toBe(1);
    expect(typeCounts['WAGER_PLACED']).toBe(1);
  });

  it('calculates Merch Orders fulfillment rates and tracking status updates', () => {
    const orders = [
      { id: 'ord_1', status: 'PENDING', trackingNumber: '' },
      { id: 'ord_2', status: 'SHIPPED', trackingNumber: '1Z9999999999999999' },
      { id: 'ord_3', status: 'SHIPPED', trackingNumber: '9400100000000000000000' },
    ];

    const total = orders.length;
    const pending = orders.filter(o => o.status === 'PENDING').length;
    const shipped = orders.filter(o => o.status === 'SHIPPED').length;
    const fulfillmentRate = Math.round((shipped / total) * 100);

    expect(total).toBe(3);
    expect(pending).toBe(1);
    expect(shipped).toBe(2);
    expect(fulfillmentRate).toBe(67);

    // Update tracking number for ord_1
    const orderToUpdate = 'ord_1';
    const newTracking = 'TRACK123456';
    const newStatus = 'SHIPPED';

    const updatedOrders = orders.map(o =>
      o.id === orderToUpdate ? { ...o, status: newStatus, trackingNumber: newTracking } : o
    );

    expect(updatedOrders[0].status).toBe('SHIPPED');
    expect(updatedOrders[0].trackingNumber).toBe('TRACK123456');
  });

  it('formats rows accurately for CSV export', () => {
    const row = {
      ID: 'tx_100',
      Date: '2025-06-15 10:00:00',
      Username: 'johndoe',
      Description: 'Purchased 150 Links Pack, Special Offer'
    };

    const headers = Object.keys(row);
    const formattedVals = headers.map(h => {
      let val = String((row as any)[h]);
      val = val.replace(/"/g, '""');
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        val = `"${val}"`;
      }
      return val;
    });

    expect(formattedVals[0]).toBe('tx_100');
    expect(formattedVals[3]).toBe('"Purchased 150 Links Pack, Special Offer"');
  });

  it('accurately extracts full shipping address information across legacy and new formats', () => {
    // New format (from ShopPage merch purchase)
    const newOrder = {
      id: 'ord_new_1',
      shippingInfo: {
        fullName: 'Alex Johnson',
        streetAddress: '742 Evergreen Terrace',
        addressLine2: 'Suite 200',
        city: 'Springfield',
        state: 'OR',
        zip: '97477',
        country: 'USA'
      }
    };

    const extractedNew = extractShippingAddress(newOrder);
    expect(extractedNew.recipientName).toBe('Alex Johnson');
    expect(extractedNew.addressLine1).toBe('742 Evergreen Terrace');
    expect(extractedNew.addressLine2).toBe('Suite 200');
    expect(extractedNew.city).toBe('Springfield');
    expect(extractedNew.state).toBe('OR');
    expect(extractedNew.zip).toBe('97477');
    expect(extractedNew.country).toBe('USA');
    expect(extractedNew.fullAddress).toContain('Alex Johnson');
    expect(extractedNew.fullAddress).toContain('742 Evergreen Terrace, Suite 200');
    expect(extractedNew.fullAddress).toContain('Springfield, OR 97477');
    expect(extractedNew.fullAddress).toContain('USA');

    // Legacy format
    const legacyOrder = {
      id: 'ord_legacy_1',
      shippingInfo: {
        name: 'Sarah Connor',
        addressLine1: '100 Cyberdyne Way',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001'
      }
    };

    const extractedLegacy = extractShippingAddress(legacyOrder);
    expect(extractedLegacy.recipientName).toBe('Sarah Connor');
    expect(extractedLegacy.addressLine1).toBe('100 Cyberdyne Way');
    expect(extractedLegacy.city).toBe('Los Angeles');
    expect(extractedLegacy.state).toBe('CA');
    expect(extractedLegacy.zip).toBe('90001');
    expect(extractedLegacy.country).toBe('USA');
  });

  it('accurately extracts item details including size, color, quantity, and cost', () => {
    const orderWithVariants = {
      id: 'ord_variants_1',
      itemName: 'ChainLink Championship Hoodie',
      size: 'XL',
      color: 'Navy Blue',
      quantity: 2,
      itemCost: 500
    };

    const details = extractOrderItemDetails(orderWithVariants);
    expect(details.itemName).toBe('ChainLink Championship Hoodie');
    expect(details.size).toBe('XL');
    expect(details.color).toBe('Navy Blue');
    expect(details.quantity).toBe(2);
    expect(details.cost).toBe(500);

    // Nested inside shippingInfo
    const orderNestedVariants = {
      id: 'ord_nested_1',
      itemName: 'ChainLink Tee',
      shippingInfo: {
        size: 'M',
        color: 'Heather Gray',
        quantity: 1
      }
    };

    const nestedDetails = extractOrderItemDetails(orderNestedVariants);
    expect(nestedDetails.size).toBe('M');
    expect(nestedDetails.color).toBe('Heather Gray');
    expect(nestedDetails.quantity).toBe(1);
  });

  it('formats merch order rows with complete shipping address and variants for CSV export', () => {
    const order = {
      id: 'ord_csv_1',
      createdAt: 1710000000000,
      userEmail: 'user@example.com',
      userId: 'usr_abc123',
      itemName: 'ChainLink Cap',
      size: 'One Size',
      color: 'Emerald',
      quantity: 1,
      itemCost: 150,
      status: 'SHIPPED',
      trackingNumber: '9400111899562537630000',
      shippingInfo: {
        fullName: 'Jordan Smith',
        streetAddress: '456 Oak Avenue',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        country: 'USA'
      }
    };

    const shipping = extractShippingAddress(order);
    const item = extractOrderItemDetails(order);

    const exportRow = {
      OrderID: order.id,
      Date: formatDateStr(order.createdAt),
      Email: order.userEmail || '',
      UserID: order.userId || '',
      ItemName: item.itemName,
      Size: item.size || 'N/A',
      Color: item.color || 'N/A',
      Quantity: item.quantity,
      LinksCost: item.cost !== null ? item.cost : 'N/A',
      Status: order.status || 'PENDING',
      TrackingNumber: order.trackingNumber || '',
      RecipientName: shipping.recipientName || '',
      AddressLine1: shipping.addressLine1 || '',
      AddressLine2: shipping.addressLine2 || '',
      City: shipping.city || '',
      State: shipping.state || '',
      Zip: shipping.zip || '',
      Country: shipping.country || '',
      FullAddress: shipping.oneLineAddress || ''
    };

    expect(exportRow.RecipientName).toBe('Jordan Smith');
    expect(exportRow.AddressLine1).toBe('456 Oak Avenue');
    expect(exportRow.City).toBe('Austin');
    expect(exportRow.State).toBe('TX');
    expect(exportRow.Zip).toBe('78701');
    expect(exportRow.Country).toBe('USA');
    expect(exportRow.Size).toBe('One Size');
    expect(exportRow.Color).toBe('Emerald');
    expect(exportRow.Quantity).toBe(1);
    expect(exportRow.LinksCost).toBe(150);
  });
});
