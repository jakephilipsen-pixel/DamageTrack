import { faker } from '@faker-js/faker';

const COMMENT_TEMPLATES = [
  () => `Checked the ${faker.commerce.productMaterial()} — damage is ${faker.helpers.arrayElement(['minor', 'significant', 'severe', 'moderate'])}.`,
  () => `Spoke with the customer rep. They ${faker.helpers.arrayElement(['will send a replacement', 'want photos', 'are disputing the claim', 'acknowledged the issue'])}.`,
  () => `${faker.helpers.arrayElement(['Forklift driver', 'Shift lead', 'Warehouse manager', 'QA inspector'])} confirmed the damage occurred during ${faker.helpers.arrayElement(['unloading', 'stacking', 'picking', 'transit', 'storage'])}.`,
  () => `Photos uploaded. ${faker.helpers.arrayElement(['Damage clearly visible', 'Hard to see in photos but visible in person', 'Multiple items affected', 'Isolated incident'])}.`,
  () => `${faker.lorem.sentences({ min: 1, max: 3 })}`,
  () => `Follow-up: ${faker.helpers.arrayElement(['waiting on customer response', 'insurance claim filed', 'replacement ordered', 'stock written off', 'investigation ongoing'])}.`,
  () => `Estimated loss updated after recount. ${faker.helpers.arrayElement(['Higher than expected', 'Lower than initial estimate', 'Matches original estimate', 'Some items salvageable'])}.`,
];

export function generateComment(): string {
  const template = COMMENT_TEMPLATES[Math.floor(Math.random() * COMMENT_TEMPLATES.length)];
  return template();
}
