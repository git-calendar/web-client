import { reactive } from 'vue';

type ModalState = {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  message: string;
  confirmText: string;
  cancelText: string;
  resolve?: (value: boolean) => void;
};

const modalState = reactive<ModalState>({
  isOpen: false,
  type: 'alert',
  message: '',
  confirmText: 'OK',
  cancelText: '',
});

export function useAlertModal() {
  function alert(message: string): Promise<void> {
    return new Promise((resolve) => {
      modalState.isOpen = true;
      modalState.type = 'alert';
      modalState.message = message;
      modalState.confirmText = 'OK';
      modalState.cancelText = '';
      modalState.resolve = () => resolve();
    });
  }

  function confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      modalState.isOpen = true;
      modalState.type = 'confirm';
      modalState.message = message;
      modalState.confirmText = 'OK';
      modalState.cancelText = 'Cancel';
      modalState.resolve = resolve;
    });
  }

  function close(result = false) {
    modalState.isOpen = false;
    modalState.resolve?.(result);
    modalState.resolve = undefined;
  }

  return {
    alertModalState: modalState,
    alert,
    confirm,
    close,
  };
}
