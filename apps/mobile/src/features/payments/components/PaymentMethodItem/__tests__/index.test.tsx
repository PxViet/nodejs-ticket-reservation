import { fireEvent, render } from '@testing-library/react-native';

import { PaymentMethodItem } from '../index';

const card = {
  id: 'pm_1',
  brand: 'mastercard',
  last4: '4444',
  expMonth: 4,
  expYear: 2031,
};

describe('PaymentMethodItem', () => {
  it('shows only Stripe’s display fields', () => {
    const { getByText } = render(
      <PaymentMethodItem
        paymentMethod={card}
        isSelected={false}
        onSelect={jest.fn()}
      />,
    );

    expect(getByText('Mastercard •••• 4444')).toBeTruthy();
    expect(getByText('Expires 04/31')).toBeTruthy();
    expect(getByText('mastercard')).toBeTruthy();
  });

  it('selects its card on press', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <PaymentMethodItem
        paymentMethod={card}
        isSelected={false}
        onSelect={onSelect}
      />,
    );

    fireEvent.press(getByTestId('payment-method-pm_1'));
    expect(onSelect).toHaveBeenCalledWith(card);
  });

  it('marks the selected card', () => {
    const { getByTestId } = render(
      <PaymentMethodItem
        paymentMethod={card}
        isSelected
        onSelect={jest.fn()}
      />,
    );

    const item = getByTestId('payment-method-pm_1');
    expect(item.props.accessibilityState).toEqual({ selected: true });
    expect(item.props.accessibilityLabel).toBe(
      'Mastercard ending in 4444, expires 04/31',
    );
  });
});
