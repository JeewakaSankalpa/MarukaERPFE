import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import api from '../../api/api';
import ProjectEstimationCard from './ProjectEstimationCard';

jest.mock('../../api/api');

const renderSavedEstimation = async (overrides) => {
  api.get.mockResolvedValueOnce({
    data: {
      computedGrandTotal: 118,
      computedVatAmount: 18,
      computedTaxAmount: 0,
      computedDiscountAmount: 0,
      includeVat: true,
      vatPercent: 18,
      includeTax: false,
      discountPercent: 0,
      components: [{
        name: 'Fixture',
        quantity: 1,
        overheadPercent: 0,
        marginPercent: 0,
        deliveryCost: 0,
        freightCost: 0,
        items: [{ estUnitCost: 100, quantity: 1 }],
      }],
      ...overrides,
    },
  });

  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ProjectEstimationCard projectId="fixture-project" />
    </MemoryRouter>,
  );

  await screen.findByText('Fixture');
};

test.each([
  ['round-up', 18.01, 118.01],
  ['round-down', 17.99, 117.99],
])('uses persisted %s tax and grand totals', async (_caseName, computedVatAmount, computedGrandTotal) => {
  await renderSavedEstimation({ computedVatAmount, computedGrandTotal });

  expect(screen.getByText(`LKR ${computedVatAmount.toFixed(2)}`)).toBeInTheDocument();
  expect(screen.getByText(`LKR ${computedGrandTotal.toFixed(2)}`)).toBeInTheDocument();
});

test('does not replace saved component, discount, or tax values with premature local rounding', async () => {
  await renderSavedEstimation({
    computedDiscountAmount: 3.34,
    computedVatAmount: 17.41,
    computedGrandTotal: 114.11,
    discountPercent: 3.33,
    components: [{
      name: 'Fixture',
      quantity: 1,
      subtotalWithMargin: 100.04,
      overheadPercent: 0,
      marginPercent: 0,
      deliveryCost: 0,
      freightCost: 0,
      items: [{ estUnitCost: 100, quantity: 1 }],
    }],
  });

  expect(screen.getByText('LKR 100.04')).toBeInTheDocument();
  expect(screen.getByText('-LKR 3.34')).toBeInTheDocument();
  expect(screen.getByText('LKR 17.41')).toBeInTheDocument();
  expect(screen.getByText('LKR 114.11')).toBeInTheDocument();
});

test('keeps persisted VAT and other-tax amounts distinct in the project summary', async () => {
  await renderSavedEstimation({
    computedVatAmount: 17.41,
    computedTaxAmount: 0.73,
    computedGrandTotal: 114.84,
  });

  expect(screen.getByText('VAT')).toBeInTheDocument();
  expect(screen.getByText('Other tax')).toBeInTheDocument();
  expect(screen.getByText('LKR 17.41')).toBeInTheDocument();
  expect(screen.getByText('LKR 0.73')).toBeInTheDocument();
  expect(screen.getByText('LKR 114.84')).toBeInTheDocument();
});
