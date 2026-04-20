import { useCallback, useMemo, useState } from 'react';

const initialState = {
  visible: false,
  type: 'info',
  title: '',
  message: '',
  buttons: [{ text: 'OK', style: 'primary' }],
};

const useAppModal = () => {
  const [modalState, setModalState] = useState(initialState);

  const hideModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showModal = useCallback((config) => {
    setModalState({
      visible: true,
      type: config?.type || 'info',
      title: config?.title || '',
      message: config?.message || '',
      buttons:
        config?.buttons && config.buttons.length
          ? config.buttons
          : [{ text: 'OK', style: 'primary' }],
    });
  }, []);

  const modalProps = useMemo(
    () => ({
      ...modalState,
      onClose: hideModal,
    }),
    [modalState, hideModal]
  );

  return {
    showModal,
    hideModal,
    modalProps,
  };
};

export default useAppModal;
