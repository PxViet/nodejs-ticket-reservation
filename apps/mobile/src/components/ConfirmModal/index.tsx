import { memo } from 'react';
import { Modal, Pressable, View } from 'react-native';

// Constants
import { Size } from '@/constants/enum';

// Components
import { Button } from '../Button';
import { Typo } from '../Typo';
import { cn } from '@/utils/cn';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  isDestructive?: boolean;
  isConfirming?: boolean;
  testID?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app confirmation dialog, styled to the app theme instead of the
 * platform `Alert`.
 */
export const ConfirmModal = memo(
  ({
    visible,
    title,
    message,
    confirmText,
    cancelText = 'Cancel',
    isDestructive = false,
    isConfirming = false,
    testID = 'confirm-modal',
    onConfirm,
    onCancel,
  }: ConfirmModalProps) => (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={isConfirming ? undefined : onCancel}
      testID={testID}
    >
      <Pressable
        className="flex-1 bg-bg-primary/70 justify-center items-center px-6"
        disabled={isConfirming}
        onPress={onCancel}
        accessibilityLabel="Close dialog"
        testID={`${testID}-backdrop`}
      >
        {/* Swallow presses so tapping the card doesn't close the dialog */}
        <Pressable
          className="w-full bg-bg-quaternary rounded-xl p-6 gap-3"
          accessibilityViewIsModal
          onPress={() => {}}
        >
          <Typo
            size="lg"
            weight="semibold"
            accessibilityRole="header"
            testID={`${testID}-title`}
          >
            {title}
          </Typo>

          <Typo
            size="sm"
            weight="light"
            className="text-overlay-soft"
            testID={`${testID}-message`}
          >
            {message}
          </Typo>

          <View className="flex-row gap-3 mt-3">
            <View className="flex-1">
              <Button
                size={Size.SMALL}
                title={cancelText}
                disabled={isConfirming}
                testID={`${testID}-cancel-button`}
                onPress={onCancel}
              />
            </View>
            <View className="flex-1">
              <Button
                size={Size.SMALL}
                title={confirmText}
                disabled={isConfirming}
                className={
                  isDestructive
                    ? 'bg-linear-to-r from-red to-red'
                    : ' bg-gradient-blue-end'
                }
                testID={`${testID}-confirm-button`}
                onPress={onConfirm}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  ),
);

ConfirmModal.displayName = 'ConfirmModal';
