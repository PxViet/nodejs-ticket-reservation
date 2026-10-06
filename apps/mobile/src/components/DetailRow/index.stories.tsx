import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

// Components
import { DetailRow } from './';

const meta = {
  title: 'DetailRow',
  component: DetailRow,
  decorators: [
    Story => (
      <View className="p-4 bg-dark-blue w-full">
        <Story />
      </View>
    ),
  ],
  argTypes: {
    label: {
      control: { type: 'text' },
      description: 'Label text displayed on the left',
    },
    value: {
      control: { type: 'text' },
      description: 'Value text displayed on the right',
    },
    valueClassName: {
      control: { type: 'text' },
      description: 'Additional CSS classes for the value text',
    },
  },
} satisfies Meta<typeof DetailRow>;

export default meta;

type Story = StoryObj<typeof meta>;

// Default Story
export const Default: Story = {
  args: {
    label: 'ID Order',
    value: '22081996',
  },
};

// With Custom Value Styling
export const WithCustomValueStyle: Story = {
  args: {
    label: 'Total',
    value: '$17.00',
    valueClassName: 'text-light-blue font-montserrat-semibold',
  },
};

// Cinema with Border
export const CinemaWithBorder: Story = {
  args: {
    label: 'Cinema',
    value: 'FX Sudirman XXI',
    valueClassName:
      'text-light-blue border border-light-blue px-2 py-1 rounded',
  },
};

// Price Row
export const PriceRow: Story = {
  args: {
    label: 'Price',
    value: 'Rp 50.000 x 3',
  },
};

// Total Row
export const TotalRow: Story = {
  args: {
    label: 'Total',
    value: 'Rp 150.000',
  },
};

// Date & Time Row
export const DateTimeRow: Story = {
  args: {
    label: 'Date & Time',
    value: 'Sun May 22, 16:40',
  },
};

// Seat Number Row
export const SeatNumberRow: Story = {
  args: {
    label: 'Seat Number',
    value: 'D7,D8,D9',
  },
};
