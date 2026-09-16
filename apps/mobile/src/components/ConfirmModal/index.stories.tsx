import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';

// Components
import { ConfirmModal } from '.';

const meta: Meta<typeof ConfirmModal> = {
  title: 'ConfirmModal',
  component: ConfirmModal,
  decorators: [
    Story => (
      <View className="flex-1 p-4 bg-dark-blue">
        <Story />
      </View>
    ),
  ],
  parameters: {
    notes:
      'An in-app confirmation dialog with a title, message, and cancel/confirm actions. Used in place of the platform Alert so confirmations match the app theme.',
  },
  argTypes: {
    visible: {
      control: 'boolean',
      description: 'Whether the dialog is shown',
    },
    title: {
      control: 'text',
      description: 'The dialog heading',
    },
    message: {
      control: 'text',
      description: 'The explanatory text below the heading',
    },
    confirmText: {
      control: 'text',
      description: 'Label of the confirm action',
    },
    cancelText: {
      control: 'text',
      description: 'Label of the cancel action',
    },
    isDestructive: {
      control: 'boolean',
      description: 'Renders the confirm action in the destructive color',
    },
    isConfirming: {
      control: 'boolean',
      description: 'Disables both actions while the confirmed work runs',
    },
  },
  args: {
    visible: true,
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

// Destructive action
export const Destructive: Story = {
  args: {
    title: 'Deactivate movie',
    message:
      'This hides the movie from the catalogue. Its reservation history is kept. Continue?',
    confirmText: 'Deactivate',
    isDestructive: true,
  },
};

// Non-destructive action
export const Default: Story = {
  args: {
    title: 'Activate movie',
    message: 'This makes the movie visible in the catalogue again. Continue?',
    confirmText: 'Activate',
  },
};

// While the confirmed action is running
export const Confirming: Story = {
  args: {
    title: 'Deactivate movie',
    message: 'This hides the movie from the catalogue.',
    confirmText: 'Deactivate',
    isDestructive: true,
    isConfirming: true,
  },
};
