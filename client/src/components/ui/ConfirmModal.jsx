import React from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'primary', // primary | danger
    showInput = false,
    isRequired = false,
    inputPlaceholder = 'Enter reason here...'
}) => {
    const [inputValue, setInputValue] = React.useState('');

    if (!isOpen) return null;

    const isButtonDisabled = showInput && isRequired && !inputValue.trim();

    const handleConfirm = () => {
        if (showInput) {
            if (isRequired && !inputValue.trim()) return;
            onConfirm(inputValue);
        } else {
            onConfirm();
        }
        setInputValue('');
    };

    return (
        <div className="confirm-modal-overlay">
            <div className="confirm-modal-container">
                <div className="confirm-modal-header">
                    <h3>{title}</h3>
                </div>
                <div className="confirm-modal-body">
                    <p>{message}</p>
                    {showInput && (
                        <textarea
                            className={`confirm-modal-input ${isButtonDisabled ? 'invalid' : ''}`}
                            placeholder={inputPlaceholder}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            rows={3}
                            required={isRequired}
                        />
                    )}
                </div>
                <div className="confirm-modal-footer">
                    <button className="confirm-btn-cancel" onClick={() => { onCancel(); setInputValue(''); }}>
                        {cancelText}
                    </button>
                    <button
                        className={`confirm-btn-action ${type} ${isButtonDisabled ? 'disabled' : ''}`}
                        onClick={handleConfirm}
                        disabled={isButtonDisabled}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
