import { faker } from '@faker-js/faker';
import { CachedEntity, DamageCause } from '../types';

const CAUSES: DamageCause[] = [
  'FORKLIFT_IMPACT', 'DROPPED_DURING_HANDLING', 'WATER_DAMAGE', 'CRUSH_DAMAGE',
  'PALLET_FAILURE', 'TEMPERATURE_EXPOSURE', 'INCORRECT_STACKING',
  'TRANSIT_DAMAGE_INBOUND', 'TRANSIT_DAMAGE_OUTBOUND', 'PEST_DAMAGE',
  'EXPIRED_PRODUCT', 'PACKAGING_FAILURE', 'UNKNOWN', 'OTHER',
];

export function generateDamagePayload(
  customers: CachedEntity[],
  products: CachedEntity[],
  locations: CachedEntity[]
) {
  const customer = customers[Math.floor(Math.random() * customers.length)];
  // Find products for this customer if possible, fall back to any product
  const product = products[Math.floor(Math.random() * products.length)];
  const location = locations.length > 0
    ? locations[Math.floor(Math.random() * locations.length)]
    : undefined;
  const cause = CAUSES[Math.floor(Math.random() * CAUSES.length)];

  const payload: Record<string, unknown> = {
    customerId: customer.id,
    productId: product.id,
    quantity: faker.number.int({ min: 1, max: 200 }),
    cause,
    description: faker.lorem.sentences({ min: 1, max: 4 }),
    dateOfDamage: faker.date.recent({ days: 7 }).toISOString(),
  };

  if (location) {
    payload.warehouseLocationId = location.id;
  }

  // 60% chance of having estimated loss
  if (Math.random() > 0.4) {
    payload.estimatedLoss = parseFloat(faker.commerce.price({ min: 10, max: 5000 }));
  }

  // 40% chance of having severity
  if (Math.random() > 0.6) {
    payload.severity = faker.helpers.arrayElement(['MINOR', 'MODERATE', 'MAJOR', 'TOTAL_LOSS']);
  }

  // If cause is OTHER, add causeOther
  if (cause === 'OTHER') {
    payload.causeOther = faker.lorem.sentence();
  }

  return payload;
}
